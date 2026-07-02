---
name: z-go-modernize
description: >
  Modernize Go code and tooling to current idioms (Go 1.21–1.26). Covers
  deprecated package replacements, language feature adoption, stdlib upgrades,
  and test/bench patterns. Use when reviewing code for old patterns, upgrading
  a Go version, auditing for security-relevant deprecations, or asked to
  "modernize", "upgrade Go", or "clean up old code". Triggers on "interface{}",
  "math/rand", "rand.Seed", "sort.Slice", "ioutil", "testing.T loop", "range
  over int", "sync.Once pattern", "slog migration". Does not cover linter
  config (see [[z-go-ci]]) or error wrapping conventions (see [[z-go-errors]]).
---

# Go Modernization

Check `go.mod` / `go.work` version first. All suggestions below are gated by
the `go` directive. Upgrade the `go` line before applying features that depend
on it.

## Migration priority

### High — safety and correctness

| Pattern | Fix | Since |
|---|---|---|
| `math/rand` + `rand.Seed` | `math/rand/v2` | 1.22 |
| Loop variable re-used in goroutine/subtest | Remove shadow copy — fixed by runtime | 1.22 |
| `reflect.SliceHeader` / `StringHeader` | `unsafe.Slice` / `unsafe.String` | 1.21 |
| `crypto/elliptic` | `crypto/ecdh` | 1.20 |
| `runtime.SetFinalizer` | `runtime.AddCleanup` | 1.24 |
| `crypto/cipher.NewOFB`, `NewCFB*` | AEAD / `NewCTR` | 1.24 |
| `golang.org/x/crypto/{sha3,hkdf,pbkdf2}` | `crypto/{sha3,hkdf,pbkdf2}` | 1.24 |
| `os.Root` missing on user-supplied paths | Add `os.Root` to prevent path traversal | 1.24 |
| `rsa.EncryptPKCS1v15` for new code | `rsa.EncryptOAEP` or HPKE/KEM | 1.26 |
| `net/http/httputil.ReverseProxy.Director` | `.Rewrite` | 1.20 |

Run `govulncheck ./...` as part of any modernization pass.

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

v := sync.OnceValue(compute)()  // new — inline, type-safe

// sync.WaitGroup.Go (1.25)
wg.Add(1)
go func() { defer wg.Done(); work() }()  // old
wg.Go(func() { work() })                 // new
```

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
ctx := t.Context()               // cancels at test cleanup, carries deadline

// b.Loop() (1.24) over the manual N loop
for b.Loop() { ... }             // replaces: for i := 0; i < b.N; i++

// testing/synctest (1.24+) for time-dependent concurrent tests
// Use synctest.Test instead of synctest.Run (1.25)
```

Loop-variable capture (`tt := tt`) is unnecessary on Go 1.22+. Remove it.

## Logging migration

Migrate from zap / logrus / zerolog to `slog` (1.21) only when the team agrees;
coordinate first — this is disruptive.

## Tooling

- `golangci-lint` v2.6.0+ ships the `modernize` linter. Repos here are already on
  versions well past v2.6.0 but don't have it enabled — a low-risk quick win to flag,
  not something to force into a config unprompted.
- `govulncheck` in CI catches vulnerabilities in transitive deps.
- PGO (`-pgo=auto`, 1.21+): measure before enabling; not always a win.
- Tool deps in `go.mod` `tool` directives (1.24) instead of `tools.go`.
- `encoding/json/v2` is experimental (`GOEXPERIMENT=jsonv2`, 1.25+) — do not
  adopt without explicit opt-in from the team.

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

## Do not

- Apply language features if `go.mod` is below the required version; bump the
  directive first.
- Migrate to `slog` mid-task without team consent.
- Remove `tt := tt` copies if the project still targets Go 1.21 (loop-var fix
  is runtime-only from 1.22).
- Adopt `encoding/json/v2` — still experimental.

## Verify

```sh
go vet ./...
golangci-lint run --enable modernize
govulncheck ./...
go test -short ./...
```
