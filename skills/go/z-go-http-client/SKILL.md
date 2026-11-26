---
name: z-go-http-client
description: "Build outbound HTTP clients in Go. Use for timeouts, redirects, response limits, connection reuse, retries, circuit breakers, and tracing. See [[z-go-api-design]] for server contracts."
---

# Go HTTP client hardening

Bound each outbound operation by its contract. Define time, connection, and response limits. Decide whether a failed request can be replayed.

## Quick reference

| Concern | Default | Reach for more when |
|---|---|---|
| Timeout | per-call deadline, `Client.Timeout` as a bounded-call backstop | streaming needs first-byte, idle and maximum-lifetime budgets |
| Transport | Clone `http.DefaultTransport` and size the pool for the dependency | Measure connection churn before increasing idle capacity |
| Response body | close on every path | optionally drain a bounded remainder for connection reuse |
| Retry | idempotent methods, exponential backoff + jitter, bounded by ctx | POST needs a server-honored idempotency key first |
| Circuit breaker | skip it | one dependency, called from many paths, fails often enough that retries pile up load on it |
| Instrumentation | `otelhttp.NewTransport` wrapping the tuned transport | always, once the service ships to production |

## Request deadlines

```go
// bad: no timeout at all — a hung dependency hangs this goroutine forever
client := &http.Client{}

// good: a backstop timeout covers connect, any redirects, and reading the full body
client := &http.Client{Timeout: 10 * time.Second}
```

`Client.Timeout` covers connection setup, redirects, headers, and body reads. The earlier client or request deadline wins. Pass the caller's context to `http.NewRequestWithContext`. Apply a shorter timeout if the dependency needs one. Give streams a separate policy. See [[z-go-llm-streaming]] and [[z-go-context]].

| Situation | Use |
|---|---|
| Call inside a request handler / use case | `context.WithTimeout(ctx, …)` sized to the budget left in the caller's deadline |
| Background job, cron, no inbound deadline to inherit | `Client.Timeout` set on the client itself |
| Bounded calls | When both limits apply, the earlier deadline wins |

## Restrict outbound destinations

For a fixed dependency, keep the base URL in trusted configuration. Do not let user or model input replace its scheme, authority, or port.

For URL-fetching features, apply an explicit destination policy before connecting:

- Allow only required schemes, hosts, and ports. Reject URL credentials and ambiguous addresses.
- Disable redirects with `CheckRedirect` returning `http.ErrUseLastResponse`, or check every hop. Reject unexpected 3xx responses.
- Check resolved IPv4 and IPv6 addresses at connection time. Connect to the approved address without a second lookup. Preserve the hostname for TLS verification.
- For public fetches, deny loopback, private, link-local, and other reserved destinations, including cloud metadata services. Explicitly authorize required internal services separately.
- Include proxies in the destination policy. Enforce egress restrictions outside the process.
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

Keep the transport defaults that the dependency supports. Set connection and response-header deadlines. Give streaming requests their own time budget.

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

Set the byte limit from the API contract. Read at most one byte past the limit after decompression. Check the status before decoding a success payload.

Close every response body. For HTTP/1, reading to EOF helps reuse connections. Bound any drain by bytes and time. Check the selected Go version for automatic draining. See [Go HTTP changes](https://go.dev/doc/go1.27).

## Retry discipline

Retry only replay-safe requests within the caller's budget. For a POST, require server-side deduplication or another explicit replay contract. Reuse the same idempotency key across attempts.

Use exponential backoff with full jitter.

```go
import "math/rand/v2"

func backoff(attempt int) time.Duration {
    d := 100 * time.Millisecond
    const maxDelay = 5 * time.Second
    for i := 0; i < attempt && d < maxDelay; i++ {
        d = min(2*d, maxDelay)
    }
    return time.Duration(rand.Int64N(int64(d)))
}
```

- Parse `Retry-After` as delay-seconds or an HTTP date. Stop if the caller cannot wait that long.
- Cap attempts and elapsed time. Stop promptly on cancellation, including during backoff.
- Close intermediate responses. Rebuild each request with a fresh body from a factory or `GetBody`.

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

Choose a retry library only if its policy supports the API. Check status handling and replay behavior in the pinned version. `go-retryablehttp` provides a client. `cenkalti/backoff/v5` provides retry primitives.

## Status handling

| Response | Action |
|---|---|
| 2xx | success |
| 400, 401, 403, 404, 405, 422 | Fix the request or credentials according to the API contract |
| 409 | Resolve the conflict before sending another request |
| 429 | Honor `Retry-After` if replay is safe and time remains |
| 5xx | retry only transient failures when replay is safe and budget remains |
| Network error or timeout | The server may have completed the request. Check replay safety. |

A successful `Do` call can return an HTTP error status. Inspect `StatusCode` explicitly.

## Circuit breakers

Add a circuit breaker when repeated failures create measurable load despite bounded retries. Set the open interval and recovery probe policy for the dependency.

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

A 503 response normally returns a nil transport error. Within the wrapped call, convert selected failure statuses to errors the breaker can count.

## Instrument the client

```go
transport := http.DefaultTransport.(*http.Transport).Clone()
transport.MaxIdleConnsPerHost = 100
client := &http.Client{
    Transport: otelhttp.NewTransport(transport),
    Timeout:   10 * time.Second,
}
```

Wrap the configured transport in `otelhttp.NewTransport`. It adds tracing, context propagation, and metrics while retaining pool settings. See [[z-go-observability]] for exporters.

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

Configure the test server to fail a known number of attempts. Assert the final result and exact attempt count. See [[z-qa-api]] for inbound API tests.

## Checks

```sh
rg -n 'http\.Client\{\}' -g '*.go'  # inspect request deadlines as well
golangci-lint run --enable bodyclose ./...           # response bodies closed on every path
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./... -run TestProviderClient
```

Test oversized and compressed bodies, stalled reads, and cancellation during backoff. Check both deadline orders. For URL fetches, test forbidden addresses, redirects, and changes in DNS resolution.
