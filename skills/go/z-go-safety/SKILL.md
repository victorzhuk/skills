---
name: z-go-safety
description: Defensive Go against panics and silent data corruption — nil panics, append aliasing, map concurrent-write panics, float comparison, numeric overflow, defer-in-loop leaks. Also hardens exported API boundaries — copying slices/maps, compile-time interface checks, zero-value design. Triggers on "nil interface", "append alias", "type assertion", "int overflow". Does not cover error wrapping; see [[z-go-errors]]. Concurrency belongs to [[z-go-concurrency]].
---

# Go Safety

## Quick Reference

| Risk | Fix |
|---|---|
| Typed nil in interface | Return untyped `nil`, never a typed nil pointer |
| Nil map write | `make` or lazy-init in the method |
| `append` aliasing | Cap-limit before growing; clone for independent elements; both are shallow |
| Bare type assertion | Always comma-ok: `v, ok := x.(T)` |
| `defer` in loop | Extract body to a function |
| Integer narrowing | Bounds-check against `math.MaxInt32` first |
| Float `==` | `math.Abs(a-b) < 1e-9` |
| Iota enum | Plain `iota` from 0 with a real state at zero (default); `iota + 1` only if zero-as-invalid genuinely matters |
| Mutable global | Inject `func() time.Time` |
| Crypto keys | `rand.Read()` + `hex.EncodeToString` (or `rand.Int(rand.Reader, ...)`); `rand.Text()` (Go 1.24+) is a shorthand alt |

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

Exported getters return copies: `func (c *Config) Hosts() []string { return slices.Clone(c.hosts) }`

A full slice expression (or `slices.Clip`) limits capacity; it does not copy existing elements or release the backing array. Appending at least one element to a slice with `len == cap` obtains new backing storage. Direct writes before that still affect aliases.

`copy`, `slices.Clone`, and `maps.Clone` are shallow: nested slices, maps, and pointers still share data. At an API boundary, copy the mutable depth the contract promises to isolate, or document immutable sharing/ownership transfer. Sending the value through a channel does not change this; see [[z-go-concurrency]].

## Range and map mutation

- `for _, v := range s` copies each element into `v`; `&v` is not `&s[i]`, even with Go 1.22 loop semantics. Use indices when mutating elements or retaining their addresses.
- Slice range saves the initial slice header and length. Appending does not extend that iteration; writes to shared backing storage can affect later values.
- Map iteration order is unspecified. Deleting an unreached entry skips it; an entry inserted during iteration may be visited or skipped. Sort keys when order matters; use a separate pass when visiting every new entry matters.
- Concurrent map access involving a write requires synchronization. Runtime detection is not a safety guarantee; see [[z-go-concurrency]].

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

Deferred call arguments and method receivers are evaluated when registering the defer. A closure instead reads captured variables when it runs; choose deliberately for cleanup targets, named results, and elapsed-time measurements. In `defer record(time.Since(start))`, the duration is computed immediately; defer a closure to measure at return. Defers run in reverse registration order.

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

Float: `math.Abs((a+b)-c) < 1e-9` not `a+b == c`. Guard division by zero.

---

## API Boundary Checklist

1. Establish ownership before storing incoming slices/maps; clone mutable data when callers retain access
2. Return copies when promising isolation; shallow clones do not isolate nested mutable values
3. Compile-time interface check: `var _ I = (*T)(nil)`
4. `defer` cleanup immediately after resource open
5. iota enums start at 0 with a real state there; reserve `iota + 1` for when zero-as-invalid genuinely matters
6. Inject `time.Now` as `func() time.Time`; never call it directly in logic
7. `crypto/rand` for keys, never `math/rand`

---

## Zero-Value & Initialization

Design types so `var x T` is safe to use — init maps in the constructor or lazily. `sync.Once` for thread-safe lazy init:

```go
func (db *DB) conn() *sql.DB {
    db.once.Do(func() { db.c, _ = sql.Open("postgres", dsn) })
    return db.c
}
```

Enums — plain `iota` from 0, with a real state at zero (observed default):
`const ( Add Operation = iota; Subtract; Multiply )`. Use `iota + 1` only when
zero-as-invalid genuinely matters and an unset value must be caught.

---

## Mutable Globals

Inject instead of mutating package-level vars: `type signer struct{ now func() time.Time }`

---

## Panic / Must

`Must` helpers are acceptable at package init only. Never expose panics across package boundaries — convert to errors. Recover in server goroutines:

```go
var re = regexp.MustCompile(`^[a-z][a-z0-9-]{0,62}$`)

defer func() {
    if r := recover(); r != nil {
        log.Println("recovered:", r)
    }
}()
```

Recovery only works when called directly by a deferred function in the panicking goroutine. A caller's defer cannot recover a child goroutine's panic; put recovery at the boundary that owns the goroutine and defines its failure result.

---

## Crypto

`math/rand` and `math/rand/v2` are deterministic from a seed — never safe for
keys, tokens, or anything else that must be unpredictable. `crypto/rand` is
the only safe source; `rand.Int(rand.Reader, max)` covers a bounded integer,
`rand.Text()` (Go 1.24+) a random string.

See [[z-go-security]] for the token-generation and encryption snippets.

---

## Verify

```sh
golangci-lint run --enable=forcetypeassert,nilerr,errcheck
go vet ./...
```

## Sources

- [Go101: value parts](https://go101.org/article/value-part.html), [containers](https://go101.org/article/container.html), [deferred calls](https://go101.org/article/defer-more.html).
- [Go specification: range](https://go.dev/ref/spec#For_range), [defer](https://go.dev/ref/spec#Defer_statements), [panic/recover](https://go.dev/ref/spec#Handling_panics).
