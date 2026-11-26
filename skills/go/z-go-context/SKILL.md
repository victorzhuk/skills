---
name: z-go-context
description: "Propagate context.Context through Go calls. Use for cancellation, deadlines, AfterFunc, WithoutCancel, and request values. See [[z-go-concurrency]] for goroutine ownership."
---

# context.Context

## Quick reference

| Situation | Use |
|---|---|
| Process entry or test | Use the lifecycle context when available. Use `context.Background()` for an independent root. |
| Function needs ctx but caller doesn't supply one yet | `context.TODO()` |
| HTTP handler | `r.Context()` |
| Manual cancellation | `context.WithCancel(parent)` |
| Relative timeout | `context.WithTimeout(parent, d)` |
| Absolute deadline | `context.WithDeadline(parent, t)` |
| Background work must outlive request (Go 1.21+) | `context.WithoutCancel(ctx)` |

Use `context.AfterFunc(ctx, fn)` to schedule cleanup on cancellation. Its stop function does not wait for an active callback. Coordinate completion if needed. [AfterFunc](https://pkg.go.dev/context#AfterFunc)

## Core rules

- Pass `ctx context.Context` as the first argument to context-aware operations.
- Pass a context per operation. Preserve a public API's established context ownership when compatibility requires it.
- Use `context.TODO()` while the caller lacks an appropriate parent. Never pass nil.
- Propagate the request's context. A new root drops its deadline, cancellation, and values.
- Call the returned cancel function on every exit path. In a loop, release each iteration's resources promptly.
- Define a private comparable key type for context values.

## Propagation

Break the chain and cancellation stops propagating:

```go
// bad — new root context, client disconnect ignored
func (s *OrderService) Create(ctx context.Context, o Order) error {
    return s.db.ExecContext(context.Background(), query, o.ID)
}

// good
func (s *OrderService) Create(ctx context.Context, o Order) error {
    return s.db.ExecContext(ctx, query, o.ID)
}
```

Always use context-aware variants: `QueryContext`, `ExecContext`, `NewRequestWithContext`.

## Cancellation

Use `WithCancel` to ask cooperating work to stop. Call the cancel function as soon as the operation ends. Wait for workers before releasing their resources.

```go
ctx, cancel := context.WithCancel(ctx)
defer cancel()
if err := doWork(ctx); err != nil {
    cancel() // signal any concurrent workers
    return fmt.Errorf("run: %w", err)
}
```

For fan-out patterns see [[z-go-concurrency]].

## Timeouts and deadlines

Always `defer cancel()` — discarding the cancel return leaks the timer resource.

```go
// relative — most common
func (s *UserService) Get(ctx context.Context, id string) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    return s.repo.FindByID(ctx, id)
}

// absolute — use for SLA-bound batch work
func (s *BatchService) Run(ctx context.Context, b Batch) error {
    ctx, cancel := context.WithDeadline(ctx, b.SLADeadline)
    defer cancel()
    // ...
}
```

A child inherits the earlier deadline. A 10-second child of a parent with two seconds remaining gets at most two seconds.

## Listening for cancellation

```go
func poll(ctx context.Context, interval time.Duration) error {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            if err := doWork(ctx); err != nil {
                return fmt.Errorf("poll: %w", err)
            }
        }
    }
}
```

In a CPU-bound loop, inspect `ctx.Err()` periodically.

## WithoutCancel (Go 1.21+)

`WithoutCancel` retains context values and removes the deadline and cancellation signal. Its `Done` channel is nil.
Use only when work deliberately outlives the request. Give it its own bound
with `context.WithTimeout(context.WithoutCancel(ctx), limit)`, and arrange
application-owned shutdown and joining through [[z-go-concurrency]]. A timeout
alone does not make ignored cancellation safe or guarantee delivery of audit
records. For work that must survive process exit, use durable delivery.

`context.Background()` would drop request values. Keeping `ctx` would retain
request cancellation. Neither choice replaces an explicit worker lifetime.
See [context.WithoutCancel](https://pkg.go.dev/context#WithoutCancel) and
[CancelFunc](https://pkg.go.dev/context#CancelFunc).

## Context values

```go
type contextKey string

const (
    traceIDKey   contextKey = "trace_id"
    requestIDKey contextKey = "request_id"
)

func WithTraceID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, traceIDKey, id)
}

func TraceIDFromContext(ctx context.Context) (string, bool) {
    v, ok := ctx.Value(traceIDKey).(string)
    return v, ok
}
```

Use a dedicated key type to avoid collisions across packages.

Context values are for cross-cutting, request-scoped metadata: trace/request IDs, authenticated user or tenant, and loggers enriched with trace fields. Everything else — DB connections, feature flags, business-logic parameters — belongs in constructors or function arguments.

## HTTP handlers

Propagate `r.Context()`. Distinguish client disconnects from server deadlines when selecting a response or recording an error.

## Verify

```sh
go vet ./...
staticcheck ./...   # SA1012 (nil ctx), SA4006 (unused value); go vet checks lostcancel
```
