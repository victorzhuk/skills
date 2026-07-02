---
name: z-go-errors
description: >
  Idiomatic Go error handling, wrapping, inspection, and hygiene — the single
  handling rule, sentinel vs typed errors, panic discipline, and audit recipes.
  Use when creating, wrapping, or inspecting errors; auditing log-and-return
  patterns; choosing between sentinels and custom types; or designing error
  boundaries. Triggers on "errors.Is", "errors.As", "%w", "log and return",
  "double handling", "sentinel error", "custom error type", "error hygiene".
  Does not cover slog handler ecosystem or oops builder API; see [[z-go-observability]]
  for structured logging setup and HTTP/gRPC boundary middleware.
---

# Go errors

## Core rules

1. **Check every error** — never discard with `_`.
2. **Wrap with context:** `fmt.Errorf("create user: %w", err)` — short prefix, lowercase, no period.
3. **`%w` inside, `%v` at system boundaries** — controls chain exposure to external callers.
4. **Inspect via `errors.Is` / `errors.As`** — never `==` on wrapped errors or bare type assertions.
5. **Handle exactly once** — log OR return, never both (see Single Handling below).
6. **Panic only for truly unrecoverable states** — programmer errors, broken invariants; never for expected conditions.

## Wrapping and inspection

```go
// wrap
return fmt.Errorf("fetch user %s: %w", id, err)

// sentinel check — works through the chain
if errors.Is(err, ErrNotFound) { ... }

// typed check
var ve *ValidationError
if errors.As(err, &ve) { ... }

// combine independent errors (Go 1.20+)
return errors.Join(errA, errB)
```

## Sentinel vs custom type

| Use sentinel | Use custom type |
|---|---|
| Expected condition, no data needed | Need to carry fields (code, field, user message) |
| Leaf error, never needs unwrapping | Callers need to extract structured data |
| Simple `errors.Is` check is enough | Need `errors.As` to extract structured data |

```go
// sentinel — unexported, exported error value
var ErrNotFound = errors.New("not found")

// custom type — carries data
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation %s: %s", e.Field, e.Message)
}
```

Error var names: `ErrFoo`. Error type names: `FooError`.
Error strings: lowercase, no trailing punctuation.

## Single handling rule

An error must be **logged OR returned**, never both. Violating this creates duplicate log
lines and buries the wrapped chain during incidents.

**Interior code** (repos, services, domain): wrap and return only.

```go
// before — log-and-return violation
if err != nil {
    logger.Error("query failed", "err", err)
    return fmt.Errorf("query: %w", err)
}

// after
if err != nil {
    return fmt.Errorf("query: %w", err)
}
```

**Boundary code** (HTTP handler, gRPC interceptor, worker loop, `main`): log and absorb.
Never log inside interior layers; the boundary does it once.

```go
// boundary: worker loop
for job := range w.jobs {
    if err := w.process(ctx, job); err != nil {
        w.logger.Error("job failed", "job_id", job.ID, "err", err)
        // handle: retry, mark failed, etc.
    }
}
```

### False positives — do NOT fix

| Pattern | Why it's OK |
|---|---|
| Log + `return nil` / `continue` | Error absorbed; logging IS the single handling |
| Log in goroutine that can't return | No caller to propagate to |
| Boundary handler logs + returns HTTP status | It IS the top-level handler |
| Log + `panic` / `os.Exit` / `log.Fatal` | Terminal, not propagation |
| Deferred cleanup (`defer tx.Rollback()`) | Can't return errors to caller |
| Metrics counter + return error | Metrics are aggregations, not per-event log noise |

## Panic discipline

```go
// Only for programmer errors / broken invariants
func mustPositive(n int) int {
    if n <= 0 {
        panic(fmt.Sprintf("mustPositive: got %d", n))
    }
    return n
}

// Recover at goroutine boundaries, not deep in business logic
func safeRun(f func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r)
        }
    }()
    f()
    return nil
}
```

## Quick reference

| Pattern | Rule |
|---|---|
| Wrap format | `"create user: %w"` — short, lowercase, no period |
| Chain exposure | `%w` internal; `%v` at external API boundary |
| Sentinel match | `errors.Is(err, ErrFoo)` |
| Typed extraction | `errors.As(err, &target)` |
| Join independent | `errors.Join(errA, errB)` |
| Single handling | log OR return; boundary logs, interior wraps |
| Panic scope | Programmer errors and broken invariants only |
| Error var name | `ErrFoo` |
| Error type name | `FooError` |

## Do not

- Log AND return in the same error branch (interior code).
- Use `==` to compare errors that may be wrapped.
- Use bare type assertions on errors — use `errors.As`.
- Produce high-cardinality data in the stable log message; attach as structured attrs.
- Expose raw internal errors to external callers — translate at the boundary.

## Verify

```sh
go build ./... && go test -short ./...
golangci-lint run ./...
```
