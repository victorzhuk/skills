---
name: z-go-context
description: >
  Idiomatic context.Context usage in Go — propagation, cancellation, timeouts,
  deadlines, WithoutCancel, and request-scoped values. Use when designing context
  propagation across layers, debugging leaked or non-cancelled contexts, choosing
  between context.Background/TODO/WithoutCancel, or storing values in context.
  Triggers on "context.WithCancel", "context.WithTimeout", "ctx.Done()",
  "WithoutCancel", "context.Background in handler", "context value key".
  Does not cover concurrency patterns; see [[z-go-concurrency]].
---

# context.Context

## Quick reference

| Situation | Use |
|---|---|
| Entry point (`main`, `init`, test body) | `context.Background()` |
| Function needs ctx but caller doesn't supply one yet | `context.TODO()` |
| HTTP handler | `r.Context()` |
| Manual cancellation | `context.WithCancel(parent)` |
| Relative timeout | `context.WithTimeout(parent, d)` |
| Absolute deadline | `context.WithDeadline(parent, t)` |
| Background work must outlive request (Go 1.21+) | `context.WithoutCancel(ctx)` |

\* `context.AfterFunc(ctx, fn)` (Go 1.21+) runs `fn` in its own goroutine when `ctx` is done — an alternative to `WithoutCancel` + an explicit `select` for pure cleanup. Zero use in practice so far; reach for it only if the `select` pattern below doesn't fit.

## Core rules

- `ctx` is always the first parameter, always named `ctx context.Context`.
- Never store context in a struct — pass it through function parameters.
- Never pass `nil` — use `context.TODO()` if you don't have one yet.
- Never create `context.Background()` mid-request — propagate the caller's context.
- Always `defer cancel()` immediately after `WithCancel`/`WithTimeout`/`WithDeadline`.
- Context value keys must be unexported types; bare strings collide across packages.

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

`WithCancel` lets a parent scope stop all downstream work. Call `cancel()` as soon as the reason is gone — the `defer` handles the normal path; call it explicitly on error to signal early:

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

Nested timeouts: the shorter deadline always wins. A 10s child of a 2s parent expires at 2s.

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

For CPU-bound loops, check `ctx.Err() != nil` periodically instead of `select`.

## WithoutCancel (Go 1.21+)

Preserves context values (trace ID, etc.) but detaches cancellation. Use for
background work that must outlive the request — audit logs, async enqueue:

```go
func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    order, err := h.orders.Create(ctx, req)
    if err != nil { ... }

    // audit must complete even if the client disconnects
    go h.audit.LogCreated(context.WithoutCancel(ctx), order)

    w.WriteHeader(http.StatusCreated)
}
```

`context.Background()` here would drop the trace ID. `ctx` would be cancelled on handler return.

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

Bare string keys (`context.WithValue(ctx, "trace_id", ...)`) collide across packages — never use them.

Context values are for cross-cutting, request-scoped metadata: trace/request IDs, authenticated user or tenant, and loggers enriched with trace fields. Everything else — DB connections, feature flags, business-logic parameters — belongs in constructors or function arguments.

## HTTP handlers

Use `r.Context()` — never `context.Background()`. After a service call fails, check `ctx.Err() != nil` before writing an error response (client may already be gone). Middleware enriches context via `r.WithContext(ctx)` before the handler runs.

## Verify

```sh
go vet ./...
staticcheck ./...   # SA1012 (nil ctx), SA1006 (unused cancel), SA4006
```
