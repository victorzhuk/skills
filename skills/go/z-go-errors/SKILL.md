---
name: z-go-errors
description: "Handle Go errors at package boundaries. Use for wrapping, sentinel and typed errors, errors.Is, errors.As, logging, and panic recovery."
---

# Go errors

## Core rules

1. Check errors that affect the result. Explain any intentional discard.
2. Use a short lowercase operation name when you wrap an error.
3. Use `%w` when callers may inspect the cause. Translate private causes at public boundaries.
4. Use `errors.Is` for a sentinel and `errors.As` for a type.
5. Give one boundary responsibility for logging a failed operation.
6. Return an error for expected failures. Reserve panic for broken invariants.

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

Interior functions return the cause with context. The boundary decides whether to retry, translate, or record the failure.

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

At a worker or transport boundary, record the failure once and return the contractual result.

```go
// boundary: worker loop
for job := range w.jobs {
    if err := w.process(ctx, job); err != nil {
        w.logger.Error("job failed", "job_id", job.ID, "err", err)
        // handle: retry, mark failed, etc.
    }
}
```

### Other handling patterns

| Pattern | Why it's OK |
|---|---|
| Log and continue | The operation handles the failure locally |
| Log in goroutine that can't return | No caller to propagate to |
| Boundary handler logs + returns HTTP status | It IS the top-level handler |
| Log + `panic` / `os.Exit` / `log.Fatal` | Terminal, not propagation |
| Deferred transaction rollback | Ignore `sql.ErrTxDone` after commit. Handle other failures when they affect the result. |
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
```

Recover a package's private panic value only at its documented boundary. Re-panic unexpected values. Record the stack when a containment boundary handles a panic. Define the result and resource cleanup. Isolate mutable state before continuing after an unexpected panic.

Join independent failures with `errors.Join` when callers need to inspect each cause. Keep identifiers in structured log attributes.

## Checks

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./...
golangci-lint run ./...
```

Test wrapped sentinels, typed errors, and transport error messages. Check cleanup and unexpected panic propagation.

## Sources

- [Google Go best practices: program checks and panics](https://google.github.io/styleguide/go/best-practices.html#program-checks-and-panics), [controlled panic recovery](https://google.github.io/styleguide/go/best-practices.html#when-to-panic).
