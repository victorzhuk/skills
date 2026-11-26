---
name: z-go-modernize
description: "Modernize Go syntax, standard-library calls, or tools for a project's supported version. Check loop semantics, compatibility settings, and migrations. See [[z-go-errors]] for error handling."
---

# Go Modernization

Check the selected toolchain and the owning module's `go` directive.
Account for workspace selection and per-file language versions. Check library availability and runtime compatibility separately.
Request a higher minimum version only when the requested change requires it.

## Migration priority

### High — safety and correctness

| Pattern | Fix | Since |
|---|---|---|
| `math/rand` + `rand.Seed` | `math/rand/v2` | 1.22 |
| Captured loop variable declared with `:=` | Remove redundant shadows under Go 1.22+ semantics. Assignment with `=` still reuses variables. | 1.22 |
| `reflect.SliceHeader` / `StringHeader` | `unsafe.Slice` / `unsafe.String` | 1.21 |
| `crypto/elliptic` | `crypto/ecdh` | 1.20 |
| `runtime.SetFinalizer` | `runtime.AddCleanup` | 1.24 |
| `crypto/cipher.NewOFB`, `NewCFB*` | AEAD / `NewCTR` | 1.24 |
| `golang.org/x/crypto/{sha3,hkdf,pbkdf2}` | `crypto/{sha3,hkdf,pbkdf2}` | 1.24 |
| `os.Root` missing on user-supplied paths | Add `os.Root` to prevent path traversal | 1.24 |
| `rsa.EncryptPKCS1v15` for new code | `rsa.EncryptOAEP` or HPKE/KEM | 1.26 |
| `net/http/httputil.ReverseProxy.Director` | `.Rewrite` | 1.20 |
| Deterministic `rsa`, `ecdsa`, `ed25519`, or `ecdh` key generation in tests | Check the package’s randomness contract. Use `testing/cryptotest.SetGlobalRandom` in supported tests. | 1.26 |
| Long-lived cache retaining entries forever | `weak.Pointer[T]` + `runtime.AddCleanup` for eviction | 1.24 |

Use the project's vulnerability check when changing dependencies or supported toolchains.

### Medium — readability and maintainability

```go
// interface{} → any (1.18, still commonly missed)
func process(v interface{}) {}   // old
func process(v any) {}           // new

// min/max builtins (1.21) — drop custom helpers
if a < b { return a }            // old
return min(a, b)                 // new

// range over int (1.22)
for i := 0; i < n; i++ {}       // old
for i := range n {}              // new

// slices/maps packages (1.21)
sort.Slice(s, func(i, j int) bool { return s[i] < s[j] }) // old
slices.Sort(s)                                              // new

sort.Search(...)                 // still fine for binary search

// cmp.Or for defaults (1.22)
if v == "" { v = "default" }    // old
v = cmp.Or(v, "default")        // new

// sync.OnceValue / sync.OnceFunc (1.21)
var once sync.Once               // old pattern
var val T
once.Do(func() { val = compute() })

getValue := sync.OnceValue(compute)
v := getValue()

// sync.WaitGroup.Go (1.25)
wg.Add(1)
go func() { defer wg.Done(); work() }()  // old
wg.Go(func() { work() })                 // new

// range-over-func / iter.Seq, iter.Seq2 (1.23) — custom iterators
func Items(m map[string]int) iter.Seq2[string, int] {
	return func(yield func(string, int) bool) {
		for k, v := range m {
			if !yield(k, v) { return }
		}
	}
}

// clear builtin (1.21) — zero a map or slice
clear(m)                         // deletes all map entries
clear(s)                         // zeroes slice elements, keeps length

// maps/slices iterator helpers (1.23, slices.Concat 1.22) over manual loops
for k := range maps.Keys(m) { ... }              // old: for k := range m { _ = k }
sorted := slices.Sorted(maps.Keys(m))            // old: collect keys + sort.Strings
collected := slices.Collect(seq)                 // old: manual append loop over an iterator
merged := slices.Concat(a, b, c)                 // old: append(append(a, b...), c...)
for chunk := range slices.Chunk(s, 100) { ... }  // old: manual index-slicing loop

// unique.Handle[T] (1.23) — interning high-cardinality keys
h := unique.Make(s)              // equal values dedupe to one handle, O(1) comparison

// new(expr) (1.26) — allocate + initialize in one step
ptr := new(true)                 // old: v := true; ptr := &v

// strings.CutLast / bytes.CutLast (1.27) — split on the last separator
dir, file, ok := strings.CutLast(p, "/")  // old: strings.LastIndex + manual slicing

// std uuid package (1.27) — v4/v7 generation and parsing per RFC 9562
// replaces github.com/google/uuid for basic generate/parse needs

// url.URL.Clone / url.Values.Clone (1.27)  // old: manual field-by-field copy
```

Create a `sync.OnceValue` wrapper once per intended lifetime and reuse it.
Recreating `sync.OnceValue(compute)()` on each access creates independent caches.

### Lower — gradual improvement

```go
// strings.Cut (1.18) over Index/Split for one delimiter
prefix, suffix, ok := strings.Cut(s, ":")

// strings.SplitSeq (1.24) for range-only iteration
for part := range strings.SplitSeq(s, ",") { ... }

// reflect.PtrTo → reflect.PointerTo (1.22)

// runtime.GOROOT() → go env GOROOT (1.24)
```

## Testing patterns

```go
// t.Context() (1.24) over context.Background() inside tests
ctx := t.Context()               // cancels immediately before cleanup callbacks

// b.Loop() (1.24) over the manual N loop
for b.Loop() { ... }             // replaces: for i := 0; i < b.N; i++

// testing/synctest (1.24+) for time-dependent concurrent tests
// Use synctest.Test instead of synctest.Run (1.25)
// synctest.Wait (1.24) blocks until every goroutine in the bubble is durably
// idle — use it over a hand-rolled Clock interface for controlling fake time
```

For an operation with a deadline, derive it explicitly from `t.Deadline()`. `t.Context()` supplies cancellation. See [[z-go-testing]].

## Check loop semantics

- Under Go 1.22+ semantics, variables declared with `:=` have per-iteration identity. Assignment with `=` still reuses existing variables.
- Check captured values, retained addresses, and nested mutable state. A shallow copy can share maps, slices, or pointers.
- Keep used locks, WaitGroups, typed atomics, and nonzero `strings.Builder` values outside loop initializers or behind stable pointers.
- Use `&s[i]` when the result must identify the slice element. An address of the iteration variable identifies its copy.
- Before converting a counted loop to integer range, inspect changing bounds, side effects, and the post statement.
- Test at the minimum supported language version.

## Logging migration

Migrate a logging backend only when its callers, field contracts, and deployed sinks support the change.

## Tooling

- Check whether the pinned linter includes the modernization analyzer. Review its findings under the project's compatibility policy.
- `govulncheck` in CI catches vulnerabilities in transitive deps.
- Measure profile-guided optimization (`-pgo=auto`, Go 1.21+) on the target workload.
- Tool deps in `go.mod` `tool` directives (1.24) instead of `tools.go`.
- Go 1.27 includes `encoding/json/v2` and uses its implementation for `encoding/json`. Check compatibility before changing wire formats. Earlier experimental versions require `GOEXPERIMENT=jsonv2`.
- Go 1.26 removed `cmd/doc` and `go tool doc`. Use `go doc`. `go doc` accepts `package@version` and
  `-ex` for runnable examples (1.27).
- `go test` runs the `stdversion` vet check by default (1.27).

## Quick Reference

| Category | Old | New | Since |
|---|---|---|---|
| Random | `math/rand` + `Seed` | `math/rand/v2` | 1.22 |
| Type alias | `interface{}` | `any` | 1.18 |
| Builtins | custom `min`/`max` | `min(a,b)` / `max(a,b)` | 1.21 |
| Iteration | `for i := 0; i < n` | `for i := range n` | 1.22 |
| Sorting | `sort.Slice` | `slices.Sort` / `slices.SortFunc` | 1.21 |
| Default | `if v == "" { v = d }` | `cmp.Or(v, d)` | 1.22 |
| Once | `sync.Once` + closure | `sync.OnceValue` | 1.21 |
| WaitGroup | `Add(1)` + `Done()` | `wg.Go(f)` | 1.25 |
| Test ctx | `context.Background()` | `t.Context()` | 1.24 |
| Benchmark | `for i < b.N` | `for b.Loop()` | 1.24 |
| Path safety | bare `os.Open(userPath)` | `os.Root` | 1.24 |
| Finalizers | `runtime.SetFinalizer` | `runtime.AddCleanup` | 1.24 |
| Caching | strong refs held forever | `weak.Pointer[T]` | 1.24 |
| Interning | manual dedup map | `unique.Handle[T]` | 1.23 |
| Iterating | manual append loop | `slices.Collect` / `slices.Sorted` | 1.23 |
| Pointer init | `v := x; p := &v` | `new(x)` | 1.26 |
| Last-sep split | `LastIndex` + slicing | `strings.CutLast` | 1.27 |
| UUIDs | `github.com/google/uuid` | std `uuid` | 1.27 |
| URL copy | manual field copy | `url.URL.Clone` | 1.27 |
| JSON (new code) | `encoding/json` | `encoding/json/v2` | 1.27 |

## Do not

- Use language features above the module’s effective version. Propose an upgrade separately.
- Migrate to `slog` mid-task without team consent.
- Treat the Go 1.22 loop change as a runtime fix or remove captures from loops
  assigning existing variables without checking their lifetime.
- Adopt `encoding/json/v2` below Go 1.27 — experimental there
  (`GOEXPERIMENT=jsonv2`).

## Verification

```sh
go vet ./...
golangci-lint run --enable modernize
govulncheck ./...
timeout 5m go test -short -timeout 2m -p 2 -parallel 2 ./...
```

Prefer the project's bounded test target. For loop migration, cover captured
values, retained addresses, and shared mutable fixtures at the supported
language version.

## Sources

- [Go101: Go 1.22 loop changes](https://go101.org/blog/2024-03-01-for-loop-semantic-changes-in-go-1.22.html).
- [Go specification: for clauses](https://go.dev/ref/spec#For_clause), [range clauses](https://go.dev/ref/spec#For_range), [OnceValue](https://pkg.go.dev/sync#OnceValue), [test context](https://pkg.go.dev/testing#T.Context).
