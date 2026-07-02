---
name: z-go-http-client
description: Outbound HTTP client hardening for calling external or third-party APIs from Go — timeouts, transport tuning, body draining, retry discipline with backoff and jitter, status handling, and circuit breakers. Use when writing or reviewing a Go client that calls another service, choosing Client.Timeout vs a per-request context deadline, tuning MaxIdleConnsPerHost, adding retry logic, deciding whether a call needs a circuit breaker, wiring otelhttp, or testing outbound calls with httptest.Server. Triggers on "http.Client", "RoundTripper", "MaxIdleConnsPerHost", "retry with backoff", "Retry-After", "idempotency key", "circuit breaker", "otelhttp", "drain response body". Does not cover deadline propagation mechanics; see [[z-go-context]]. Does not cover idempotency keys on your own inbound API; see [[z-go-api-design]]. Does not cover OTel setup beyond the client wrapper; see [[z-go-observability]]. Does not cover testing your own API surface; see [[z-qa-api]].
---

# Go HTTP client hardening

Every outbound `net/http` call to another service needs a bound on time, a bound on connections, a closed body, and a retry policy that knows what it's retrying. None of this is optional hardening — a bare `http.Client{}` calling a flaky dependency is how one slow provider takes down the whole pod.

## Quick reference

| Concern | Default | Reach for more when |
|---|---|---|
| Timeout | per-call `context.WithTimeout`, `Client.Timeout` as a backstop | never skip either |
| Transport | clone `http.DefaultTransport`, raise `MaxIdleConnsPerHost` | one dependency gets real QPS |
| Response body | drain to `io.Discard` + `Close()`, always | never skip |
| Retry | idempotent methods, exponential backoff + jitter, bounded by ctx | POST needs a server-honored idempotency key first |
| Circuit breaker | skip it | one dependency, called from many paths, fails often enough that retries pile up load on it |
| Instrumentation | `otelhttp.NewTransport` wrapping the tuned transport | always, once the service ships to production |

## Never ship a bare http.Client{}

```go
// bad: no timeout at all — a hung dependency hangs this goroutine forever
client := &http.Client{}

// good: a backstop timeout covers connect, any redirects, and reading the full body
client := &http.Client{Timeout: 10 * time.Second}
```

`Client.Timeout` bounds the whole round trip — connection, redirects, headers, and body read. It does not compose with an inbound request's own deadline: a client hardcoded to 10s ignores whether the caller already has 200ms left. For that, thread the caller's context through with `context.WithTimeout` and `http.NewRequestWithContext`, and keep `Client.Timeout` as a blunt backstop against a client built without a context at all (a background job, a health-check ping). Deadline propagation mechanics belong to [[z-go-context]].

| Situation | Use |
|---|---|
| Call inside a request handler / use case | `context.WithTimeout(ctx, …)` sized to the budget left in the caller's deadline |
| Background job, cron, no inbound deadline to inherit | `Client.Timeout` set on the client itself |
| Either case | set both — the context deadline is the real bound, `Client.Timeout` catches a call site that forgot to build one |

## Tune the transport under load

`http.DefaultTransport` is a reasonable starting point, but one setting is wrong for any service that calls one dependency hard: `DefaultMaxIdleConnsPerHost` is `2`. Under real QPS to a single host that forces constant connection churn — a fresh TCP+TLS handshake on every burst above two concurrent requests.

```go
transport := http.DefaultTransport.(*http.Transport).Clone()
transport.MaxIdleConnsPerHost = 100
transport.MaxIdleConns = 100
client := &http.Client{Transport: transport, Timeout: 10 * time.Second}
```

| Field | stdlib default | Reach for a change when |
|---|---|---|
| `MaxIdleConnsPerHost` | 2 | any dependency taking sustained concurrent traffic — raise to roughly your steady-state concurrency to that host |
| `MaxIdleConns` | 100 (set by `DefaultTransport`, unlimited if you build a `Transport{}` from scratch) | you call many distinct hosts and need a cross-host cap |
| `IdleConnTimeout` | 90s | a provider's LB recycles connections faster — lower it to match, or churn shows up as sporadic `EOF` |
| `MaxConnsPerHost` | 0 (unlimited) | you need a hard ceiling to avoid overwhelming a small provider, not just an idle-pool hint |

Everything else on `Transport` — dial timeout, TLS handshake timeout, `ForceAttemptHTTP2` — is fine at the stdlib default; don't touch it without a measured reason.

## Always drain and close the response body

```go
resp, err := client.Do(req)
if err != nil {
    return fmt.Errorf("call provider: %w", err)
}
defer func() {
    io.Copy(io.Discard, resp.Body)
    resp.Body.Close()
}()

var v Payload
if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
    return fmt.Errorf("decode provider response: %w", err)
}
```

Closing without draining still leaks: the `Transport` can only put a connection back in its idle pool for reuse once the body has been read to EOF. `json.NewDecoder(resp.Body).Decode(&v)` reads only one JSON value, not necessarily to EOF — a trailing newline or extra bytes leave the body short. Deferring the drain-then-close together means it runs after the decode, on every return path, including an early return on a non-2xx status.

## Retry discipline

Retry only what's safe to retry, and never for longer than the caller can afford to wait.

- **Idempotent methods only** by default: `GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`. A `POST` is retryable only if the provider defines and honors an idempotency key (`Idempotency-Key` header or equivalent) — without server-side dedup, a retried `POST` after a timed-out-but-actually-succeeded request double-charges or double-books. That's a contract the provider has to support; you can't invent it client-side.
- **Exponential backoff with full jitter** — a fixed backoff schedule synchronizes retries across every caller into the same pile-on:

```go
import "math/rand/v2"

func backoff(attempt int) time.Duration {
    base := 100 * time.Millisecond
    maxDelay := 5 * time.Second
    d := min(base*time.Duration(1<<attempt), maxDelay)
    return time.Duration(rand.Int64N(int64(d)))
}
```

- **Respect `Retry-After` on 429 and 503** — parse it as either delay-seconds or an HTTP-date and wait at least that long before the next attempt; don't let your own backoff schedule override a value the server explicitly asked for.
- **Cap the total attempt budget with the context deadline as the outer bound**, not a fixed attempt count alone — check `ctx.Err()` before every attempt and stop the moment the deadline is gone, even mid-backoff-sleep. Drain and close every intermediate response before retrying, not just the final one — the leak in "always drain and close" applies to every attempt, not only the one you return.
- **Rebuild the request on every attempt.** `req.Body` is a one-shot `io.ReadCloser`, consumed by the first `client.Do`; `GetBody` exists for the stdlib's own redirect handling, not for a hand-rolled retry loop. Reusing the same `*http.Request` across attempts silently sends an empty body from attempt 2 on, for exactly the bodied methods this skill tells you to retry — `PUT`, or `POST` with an idempotency key. Rebuild from a `newReq func() *http.Request` closure, or set `req.GetBody` and call it before each retry:

```go
for attempt := 0; ; attempt++ {
    req := newReq()
    resp, err := client.Do(req)
    if !shouldRetry(resp, err) || attempt >= maxAttempts {
        return resp, err
    }
    if resp != nil {
        io.Copy(io.Discard, resp.Body)
        resp.Body.Close()
    }
    select {
    case <-time.After(retryDelay(resp, attempt)):
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}
```

Two real options save you from hand-rolling this: `hashicorp/go-retryablehttp` is a drop-in `*http.Client` replacement with backoff and status-based retry built in — reach for it when the default policy (5xx and connection errors, exponential backoff, honors `Retry-After`) fits as-is. `cenkalti/backoff/v5` gives you just the backoff policy to compose into your own retry loop — reach for it when you need custom retry predicates go-retryablehttp doesn't expose.

## Status handling

| Response | Action |
|---|---|
| 2xx | success |
| 400, 401, 403, 404, 405, 409, 422 | caller bug — fix the request; retrying an unchanged request gets the same 4xx forever |
| 429 | retryable — back off, honor `Retry-After` if present |
| 5xx | retryable — the dependency's fault, not the request's |
| network error, timeout, connection refused/reset | retryable — treat like 5xx |

Don't collapse this into "retry on any non-2xx" — that turns a caller bug into a request storm against a service that will keep saying no.

## Circuit breaker: earn it, don't default to it

Timeout plus bounded retry covers the overwhelming majority of outbound calls. A circuit breaker earns its place only when all of these hold: one dependency is called from many call sites or goroutines, it fails often enough that retries from all of them pile additional load onto a dependency that's already struggling, and failing fast for a cooldown window is measurably better than every caller timing out on its own. Add it after you've seen that pattern in practice, not preemptively on every outbound client.

Two real, current options if the evidence is there:

| Library | Shape | Reach for it when |
|---|---|---|
| `sony/gobreaker/v2` | single generic `CircuitBreaker[T]`, three states (closed/open/half-open), one `Execute` call | you need just a breaker around one dependency and nothing else |
| `failsafe-go` | composable policies — retry, circuit breaker, bulkhead, rate limiter, timeout, hedge — chainable, with a `failsafehttp` round tripper | you're already composing retry + timeout and want the breaker as one more policy in the same pipeline, or need bulkhead/hedge alongside it |

```go
cb := gobreaker.NewCircuitBreaker[*http.Response](gobreaker.Settings{
    Name:        "provider-x",
    MaxRequests: 3,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(c gobreaker.Counts) bool { return c.ConsecutiveFailures > 5 },
})
resp, err := cb.Execute(func() (*http.Response, error) {
    resp, err := client.Do(req)
    if err == nil && resp.StatusCode >= 500 {
        return resp, fmt.Errorf("provider-x: status %d", resp.StatusCode)
    }
    return resp, err
})
```

`client.Do` returns a nil error on a 503 — the breaker only sees failures you turn into errors, so map bad status codes to an error inside the wrapped func or `ConsecutiveFailures` never moves and the breaker never opens.

## Instrument the client

```go
transport := http.DefaultTransport.(*http.Transport).Clone()
transport.MaxIdleConnsPerHost = 100
client := &http.Client{
    Transport: otelhttp.NewTransport(transport),
    Timeout:   10 * time.Second,
}
```

`otelhttp.NewTransport` (`go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp`) wraps a `RoundTripper` to start a span per request, inject trace context into outbound headers, and record request metrics — wrap your tuned `Transport`, not a fresh `http.DefaultTransport`, so the pool settings above still apply. Full collector/exporter wiring belongs to [[z-go-observability]].

## Test outbound clients against httptest.Server, not the real dependency

```go
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusServiceUnavailable)
}))
defer srv.Close()

client := newProviderClient(srv.URL)
_, err := client.Fetch(ctx)
require.Error(t, err)
```

Drive the handler with an atomic counter to fail N times then succeed, and assert both the final result and the attempt count — that's what proves the retry loop and backoff actually run, not just that the happy path works. This is for your own outbound client's behavior; testing your own service's inbound API surface is [[z-qa-api]]'s job, not this one.

## Do not

- Ship `http.Client{}` with no `Timeout` and no context deadline on the request.
- Skip draining a non-2xx response body before `Close` — the connection can't be reused and every call opens a fresh one.
- Retry a `POST` without a server-honored idempotency key — that's a double-submit bug, not resilience.
- Retry a 4xx (other than 429) — it's a caller bug that won't change on the next attempt.
- Use a fixed-delay retry loop with no jitter — synchronized retries across callers cause a thundering herd on the dependency's recovery.
- Let a retry loop run past the context deadline because it only counts attempts, not elapsed budget.
- Reach for a circuit breaker before a timeout + bounded retry has actually proven insufficient.
- Wrap `http.DefaultTransport` directly in `otelhttp.NewTransport` after already tuning a separate transport — instrument the tuned one, not a second untuned one.

## Verify

```sh
grep -rn 'http.Client{}' --include='*.go' .          # bare client with no Timeout
golangci-lint run --enable bodyclose ./...           # response bodies closed on every path
go test -race ./... -run TestProviderClient
```

Read the retry test output for attempt counts, not just pass/fail — a retry test that passes on the first attempt isn't exercising the retry path at all.
