---
name: z-go-safety
description: "Prevent Go panics, aliasing, numeric overflow, and shared-state corruption. Use for nil interfaces, slice ownership, map iteration, deferred cleanup, and API boundaries. See [[z-go-concurrency]] for synchronization."
---

# Go Safety

## Quick Reference

| Risk | Fix |
|---|---|
| Typed nil in interface | Return untyped `nil`, never a typed nil pointer |
| Nil map write | `make` or lazy-init in the method |
| `append` aliasing | Limit capacity before growth. Clone the slice for independent element storage. |
| Bare type assertion | Always comma-ok: `v, ok := x.(T)` |
| `defer` in loop | Extract body to a function |
| Integer narrowing | Bounds-check against `math.MaxInt32` first |
| Float comparison | Choose tolerances for the domain. Handle NaN and infinity. |
| `iota` enum | Give zero a defined meaning. Start at one when zero means invalid. |
| Mutable global | Inject `func() time.Time` |
| Crypto keys | Use `crypto/rand` for bytes, bounded integers, or a random string (`rand.Text`, Go 1.24+). |

---

## Nil Interface Trap

A typed nil pointer sets the interface type descriptor — the interface is **not** `nil`:

```go
// bad: returns non-nil interface wrapping a nil *Handler
func getHandler() http.Handler { var h *Handler; return h }

// good
func getHandler() http.Handler {
    if !enabled { return nil }
    return &Handler{}
}
```

Lazy-init maps to keep zero value usable:

```go
func (r *Registry) Add(name string, v int) {
    if r.items == nil { r.items = make(map[string]int) }
    r.items[name] = v
}
```

---

## Append Aliasing

`append` reuses backing array when `cap > len` — both slices share memory:

```go
b := append(a, 4)        // bad: b[0] = 99 also mutates a[0]
b := append(a[:len(a):len(a)], 4) // good: forces new allocation
```

Copy slices returned from accessors when clients must not change internal state. A shallow copy still shares pointer-bearing elements.
A full slice expression and `slices.Clip` limit append capacity. Both retain existing elements and backing storage.

`copy`, `slices.Clone`, and `maps.Clone` make shallow copies. Nested mutable values can still share storage. Copy to the depth the API promises, or document shared ownership. Sending a value through a channel preserves that sharing. See [[z-go-concurrency]].

## Range and map mutation

- `for _, v := range s` copies each element. Use `&s[i]` when the address must identify an element.
- Ranging over a slice captures its initial length. Changes to the backing array can affect later values.
- Map iteration has no defined order. A deleted, unvisited entry disappears. A new entry can appear or be skipped.
- Collect keys before a second pass when deterministic traversal matters.
- Synchronize map access that overlaps a write. Runtime detection cannot prove race freedom. See [[z-go-concurrency]].

---

## Type Assertions

```go
// bad — panics on mismatch
s := x.(string)

// good
s, ok := x.(string)
if !ok { ... }
```

---

## Defer in Loops

`defer` runs at function exit, not loop iteration — resources accumulate. Extract body to a function:

```go
// bad
for _, path := range paths {
    f, _ := os.Open(path)
    defer f.Close() // leaks until function returns
}

// good
for _, path := range paths {
    if err := processOne(path); err != nil { return err }
}
func processOne(path string) error {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close()
    return process(f)
}
```

Go evaluates deferred arguments and method receivers when it registers the call. A closure can read captured variables later. Use a deferred closure to measure elapsed time at return. Deferred calls run in reverse registration order.

---

## Numeric Conversions

```go
// bad — silently wraps: 3_000_000_000 becomes -1294967296
i32 := int32(val)

// good
if val > math.MaxInt32 || val < math.MinInt32 {
    return fmt.Errorf("value %d overflows int32", val)
}
```

Choose absolute and relative tolerances for the domain. Define how comparisons handle NaN, infinity, and exact values. Guard division by zero where required.

---

## API Boundary Checklist

1. Establish ownership before retaining slices or maps. Clone mutable values that callers can change.
2. For isolated return values, copy any mutable nested data.
3. Compile-time interface check: `var _ I = (*T)(nil)`
4. `defer` cleanup immediately after resource open
5. Reserve zero as invalid only when the enum needs that distinction.
6. Inject a clock when logic needs a controllable time source.
7. `crypto/rand` for keys, never `math/rand`

---

## Zero-Value & Initialization

Return initialization errors explicitly. With `sync.Once`, store both the result and the error. A failed initialization will not run again. Check `sql.Open` errors. Use a bounded `PingContext` when startup requires a working connection.

Enums — plain `iota` from 0, with a real state at zero (observed default):
`const ( Add Operation = iota; Subtract; Multiply )`. Use `iota + 1` only when
zero-as-invalid genuinely matters and an unset value must be caught.

---

## Mutable Globals

Inject instead of mutating package-level vars: `type signer struct{ now func() time.Time }`

---

## Panic / Must

Return errors for expected failures. Reserve `Must` helpers for invariants such as a constant expression at package initialization.

```go
var re = regexp.MustCompile(`^[a-z][a-z0-9-]{0,62}$`)
```

Use recovery only for an owned panic protocol or an isolated containment boundary.
The boundary must clean up, preserve diagnostics, and return an explicit failure.
Call `recover` directly from a deferred function in the panicking goroutine. Re-panic unexpected values. See [[z-go-errors]].

---

## Crypto

Use `crypto/rand` for keys and tokens. Use `rand.Int(rand.Reader, max)` for bounded integers or `rand.Text()` for strings on Go 1.24+.

See [[z-go-security]] for the token-generation and encryption snippets.

---

## Inbound server hardening

Set timeouts and a header limit on an inbound `http.Server`. Choose values for the supported routes and expected client behavior.

```go
srv := &http.Server{
    ReadHeaderTimeout: 5 * time.Second,
    ReadTimeout:       10 * time.Second,
    WriteTimeout:      15 * time.Second,
    IdleTimeout:       60 * time.Second,
    MaxHeaderBytes:    1 << 20,
}
```

These times are examples. Tune streaming and upload routes separately. See [[z-go-entrypoint]] for graceful shutdown.

## Verification

```sh
golangci-lint run --enable=forcetypeassert,nilerr,errcheck
go vet ./...
```

## Sources

- [Go101: value parts](https://go101.org/article/value-part.html), [containers](https://go101.org/article/container.html), [deferred calls](https://go101.org/article/defer-more.html).
- [Go specification: range](https://go.dev/ref/spec#For_range), [defer](https://go.dev/ref/spec#Defer_statements), [panic/recover](https://go.dev/ref/spec#Handling_panics).
