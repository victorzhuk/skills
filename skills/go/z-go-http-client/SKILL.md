---
name: z-go-http-client
description: Outbound HTTP client hardening for Go calling external APIs — timeouts, transport tuning, body draining, retry with backoff/jitter, and circuit breakers. Use when a Go client calls another service. Triggers on "http.Client", "RoundTripper", "MaxIdleConnsPerHost", "retry with backoff", "circuit breaker", "otelhttp". Does not cover deadlines, API design, OTel, or API testing; see [[z-go-context]], [[z-go-api-design]], [[z-go-observability]], [[z-qa-api]].
---

# Go HTTP client hardening

Every outbound `net/http` call to another service needs a bound on time, a bound on connections, a closed body, and a retry policy that knows what it's retrying. None of this is optional hardening — a bare `http.Client{}` calling a flaky dependency is how one slow provider takes down the whole pod.

## Quick reference

| Concern | Default | Reach for more when |
|---|---|---|
| Timeout | per-call deadline, `Client.Timeout` as a bounded-call backstop | streaming needs first-byte, idle and maximum-lifetime budgets |
| Transport | clone `http.DefaultTransport`, raise `MaxIdleConnsPerHost` | one dependency gets real QPS |
| Response body | close on every path | optionally drain a bounded remainder for connection reuse |
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

`Client.Timeout` bounds connection setup, redirects, headers, and body reading. With a request context, the earlier deadline wins: a 10s client timeout does not extend a caller's remaining 200ms. Propagate the caller with `http.NewRequestWithContext`; optionally shorten its budget with `context.WithTimeout`. Keep a client timeout as a backstop for bounded calls. Streaming needs a separate policy; see [[z-go-llm-streaming]] and [[z-go-context]].

| Situation | Use |
|---|---|
| Call inside a request handler / use case | `context.WithTimeout(ctx, …)` sized to the budget left in the caller's deadline |
| Background job, cron, no inbound deadline to inherit | `Client.Timeout` set on the client itself |
| Bounded calls | use both when useful; the earlier deadline wins |

## Restrict outbound destinations

For a fixed dependency, keep the base URL in trusted configuration. Do not let user or model input replace its scheme, authority, or port.

For URL-fetching features, apply an explicit destination policy before connecting:

- Allow only required schemes, hosts, and ports. Reject URL credentials and ambiguous addresses.
- Disable redirects with `CheckRedirect` returning `http.ErrUseLastResponse`, or validate every hop before following it. Reject unexpected 3xx responses.
- Validate resolved IPv4 and IPv6 addresses at connection time. Connect to the validated address without another unchecked DNS lookup. Preserve the hostname for TLS verification.
- For public fetches, deny loopback, private, link-local, and other reserved destinations, including cloud metadata services. Explicitly authorize required internal services separately.
- Apply egress restrictions outside the process. Account for proxies and DNS changes; URL parsing or a hostname check alone does not prevent SSRF.
- Limit response headers and decompressed body bytes, alongside time and concurrency limits.

See [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) and [[z-security-hardening]].

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

Preserve useful transport defaults. Set response-header limits and connection deadlines from the dependency contract; streaming may need different budgets. Change pooling and protocol settings only for a demonstrated need.

## Close the response body on every path

```go
resp, err := client.Do(req)
if err != nil {
    return fmt.Errorf("call provider: %w", err)
}
defer resp.Body.Close()

const maxResponseBytes = 1 << 20
body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
if err != nil {
    return fmt.Errorf("read provider response: %w", err)
}
if len(body) > maxResponseBytes {
    return errors.New("provider response too large")
}
var v Payload
if err := json.Unmarshal(body, &v); err != nil {
    return fmt.Errorf("decode provider response: %w", err)
}
```

Choose the byte limit from the API contract; 1 MiB is an example. Apply it after decompression, including custom decompression. Reading one extra byte distinguishes oversize input from a valid body exactly at the limit. Handle status codes before interpreting a success payload.

Closing releases the body; not reading to EOF can sacrifice HTTP/1 connection reuse, not leak the connection. If reuse matters, drain only a small bounded remainder under a live deadline. Never unconditionally drain an untrusted or streaming body. Go 1.27 adds bounded automatic HTTP/1 draining on Close; check the selected Go version and protocol. See [net/http changes](https://go.dev/doc/go1.27).

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
- **Cap the total attempt budget with the context deadline as the outer bound**, not a fixed attempt count alone — check `ctx.Err()` before every attempt and stop the moment the deadline is gone, even mid-backoff-sleep. Close every intermediate response before retrying; any optional draining must respect byte and time bounds.
- **Rebuild the request on every attempt.** Request bodies are consumed and closed by the client. Use a factory that accepts the shared context and returns a fresh request and body, or explicitly obtain a new body from `GetBody`:

```go
if maxAttempts < 1 {
    return nil, errors.New("max attempts must be positive")
}
for attempt := 1; ; attempt++ {
    if err := ctx.Err(); err != nil {
        return nil, err
    }
    req, err := newReq(ctx)
    if err != nil {
        return nil, err
    }
    resp, err := client.Do(req)
    if !shouldRetry(resp, err) || attempt >= maxAttempts {
        return resp, err
    }
    if resp != nil {
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
| 400, 401, 403, 404, 405, 422 | inspect the API contract; usually fix the request or credentials before retrying |
| 409 | resolve the conflict/reload state when the API defines that recovery; do not blindly replay |
| 429 | retryable — back off, honor `Retry-After` if present |
| 5xx | retry only transient failures when replay is safe and budget remains |
| network error, timeout, connection refused/reset | outcome may be unknown; retry only with safe replay semantics |

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
- Leave a body open, or drain an unbounded body merely to preserve reuse.
- Retry a `POST` without a server-honored idempotency key — that's a double-submit bug, not resilience.
- Retry status codes without the API's recovery contract, safe replay semantics and a remaining budget.
- Use a fixed-delay retry loop with no jitter — synchronized retries across callers cause a thundering herd on the dependency's recovery.
- Let a retry loop run past the context deadline because it only counts attempts, not elapsed budget.
- Reach for a circuit breaker before a timeout + bounded retry has actually proven insufficient.
- Wrap `http.DefaultTransport` directly in `otelhttp.NewTransport` after already tuning a separate transport — instrument the tuned one, not a second untuned one.

## Verify

```sh
grep -rn 'http.Client{}' --include='*.go' .          # bare client with no Timeout
golangci-lint run --enable bodyclose ./...           # response bodies closed on every path
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./... -run TestProviderClient
```

Read the retry test output for attempt counts, not just pass/fail — a retry test that passes on the first attempt isn't exercising the retry path at all.

Test oversized and compressed responses, a body that stalls, and cancellation during retry backoff. For URL-fetching features, test forbidden destinations, redirect escapes, and DNS changes at the connection boundary. Verify that the earlier request/client deadline wins.
