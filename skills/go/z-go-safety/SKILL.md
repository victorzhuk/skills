---
name: z-go-safety
description: >
  Prevents panics, silent data corruption, and subtle runtime bugs through defensive coding patterns. Use when encountering nil panics, append aliasing, map concurrent write panics, float comparison bugs, numeric conversion overflow, or defer-in-loop resource leaks. Also use when hardening exported API boundaries — copying slices/maps, compile-time interface checks, zero-value design, iota enums, crypto/rand. Triggers on "nil interface", "append alias", "type assertion", "defer in loop", "int overflow", "sync.Once", "var _ Interface", "crypto/rand", "iota". Does not cover error wrapping strategy; see [[z-go-errors]]. Does not cover concurrency primitives; see [[z-go-concurrency]].
---

# Go Safety

## Quick Reference

| Risk | Fix |
|---|---|
| Typed nil in interface | Return untyped `nil`, never a typed nil pointer |
| Nil map write | `make` or lazy-init in the method |
| `append` aliasing | `s[:len(s):len(s)]` before append; return `slices.Clone` from getters |
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

1. Copy incoming slices/maps before storing (`copy` / `slices.Clone` / `maps.Clone`)
2. Return copies of internal slices/maps
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
