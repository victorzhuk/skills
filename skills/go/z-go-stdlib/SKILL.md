---
name: z-go-stdlib
description: "Find standard-library APIs for Go tasks. Check symbols against the project's minimum Go version before adding a helper or dependency. See [[z-go-pkg]] for published module metadata."
---

# Stdlib First

Identify the required behavior and supported Go versions before selecting a package.

## Lookup workflow

1. Inspect `go doc <pkg>` or `go doc <pkg>.<Symbol>` on the selected toolchain.
2. Search `go doc -all <pkg>` when the name is unknown.
3. Check the API's introduction version and behavior against the project's supported minimum.
4. Inspect existing project helpers and dependencies for missing behavior.
5. Consider the relevant `golang.org/x` module or another dependency if it covers a remaining requirement.

## Coverage map — task → package

| Task | Use | Since |
|---|---|---|
| Sort, search, dedup, reverse, min/max of slice | `slices` (`Sort`, `BinarySearch`, `Compact`, `Reverse`, `Max`, `MaxFunc`) | 1.21 |
| Concat, chunk, grow, clone | `slices.Concat` 1.22, `slices.Chunk` 1.23, `Grow`, `Clone` | 1.21 |
| Membership / index | `slices.Contains`, `slices.Index`, `ContainsFunc` | 1.21 |
| Map keys/values, clone, merge | `maps.Keys`, `maps.Values` (iterators, 1.23), `Clone`, `Copy` | 1.21 |
| Collect iterator → slice | `slices.Collect`, `slices.Sorted(maps.Keys(m))` | 1.23 |
| Ordering, defaults | `cmp.Compare`, `cmp.Less`, `cmp.Or` | 1.21/1.22 |
| Min/max/clear of values | builtins `min`, `max`, `clear` | 1.21 |
| Split once on delimiter | `strings.Cut`, `CutPrefix`, `CutSuffix` | 1.18/1.20 |
| Split on the last delimiter | `strings.CutLast`, `bytes.CutLast` | 1.27 |
| Build strings in a loop | `strings.Builder` | 1.10 |
| Iterate parts without allocating | `strings.SplitSeq`, `FieldsSeq`, `Lines` | 1.24 |
| Case-insensitive compare | `strings.EqualFold` | — |
| Multi-pair replace | `strings.NewReplacer` | — |
| Byte variants of all of the above | `bytes` mirrors `strings` | — |
| int/float/bool ↔ string | `strconv` (`Itoa`, `ParseInt`, `FormatFloat`, `Quote`) | — |
| Lazy init / compute once | `sync.OnceValue`, `OnceFunc`, `OnceValues` | 1.21 |
| Fan-out with error + limit | `errgroup` (`x/sync`), `sync.WaitGroup.Go` (1.25) | — |
| Deduplicate concurrent calls | `singleflight` (`x/sync`) | — |
| Rate limiting | `x/time/rate` | — |
| Weighted concurrency cap | `x/sync/semaphore` | — |
| Random numbers | `math/rand/v2` (`IntN`, `N`, `Shuffle`, `Perm`) | 1.22 |
| Random token / string | `crypto/rand.Text` | 1.24 |
| UUIDs (RFC 9562) | `uuid` (`NewV4`, `NewV7`, `Parse`) | 1.27 |
| IP addresses as values | `net/netip` | 1.18 |
| URL path building | `url.JoinPath` | 1.19 |
| Copy a URL / query values | `url.URL.Clone`, `url.Values.Clone` | 1.27 |
| JSON in new code | `encoding/json/v2` and token-level `encoding/json/jsontext` | 1.27 |
| HTTP test server without sockets | `httptest.NewTestServer` (in-memory net) | 1.27 |
| Safe file access under a dir | `os.Root` | 1.24 |
| Walk a tree | `fs.WalkDir`, `filepath.WalkDir` | 1.16 |
| Read/write whole file | `os.ReadFile`, `os.WriteFile` | 1.16 |
| Error matching and joining | `errors.Is` and `As` (1.13), `Join` (1.20). See [[z-go-errors]]. | 1.13 / 1.20 |
| Cancellation | `context`. For `AfterFunc` and `WithoutCancel` see [[z-go-context]]. | 1.21 for these additions |
| Elapsed time, date math | `time.Since`, `AddDate`, `time.DateOnly` et al. | — |
| Priority queue / top-k | `container/heap`. See [[z-algo-core]]. | — |
| Intern high-cardinality strings | `unique.Make` | 1.23 |
| Custom iterators | `iter.Seq`, `iter.Seq2` | 1.23 |
| Fast non-crypto hashing | `hash/maphash` (`Comparable` 1.24) | — |
| HTML-safe output | `html/template` (auto-escaping) | — |
| Structured logging | `log/slog` | 1.21 |

## Commonly reinvented wheels

| Hand-rolled | Stdlib |
|---|---|
| `stringInSlice(s, list)` | `slices.Contains(list, s)` |
| `keys(m)` + sort | `slices.Sorted(maps.Keys(m))` |
| `coalesce(v, def)` | `cmp.Or(v, def)` |
| Integer `min`, `max`, or `abs` helpers | Use the `min` and `max` builtins. Implement integer absolute value when required. |
| Custom set type | `map[T]struct{}` |
| `reverseSlice` | `slices.Reverse` |
| `chunkSlice(s, n)` | `slices.Chunk(s, n)` |
| `fmt.Sprintf("%d", n)` | `strconv.Itoa(n)` — no reflection, far cheaper |
| WaitGroup wrapper struct | `wg.Go(f)` (1.25) or `errgroup` |
| once-guarded getter | `sync.OnceValue(compute)` |
| `Map`/`Filter` generics (or `samber/lo`) | none by design — a plain `for` loop is the idiom |
| retry/backoff loop | none in std — small local loop first, library only if jitter/policy needed |
| `github.com/google/uuid` import | std `uuid` (1.27) covers v4/v7 generate + parse |

## Select a dependency

Compare the required semantics, maintenance cost, supported versions, and API stability.
Use a local helper for small project-specific behavior. Reuse a maintained package when it owns a substantial contract.
Check the minimum Go version of an external module before adding it. See [[z-go-modernize]] for version changes.

## Verification

```sh
go doc os.OpenRoot           # example API signature
go vet ./...
govulncheck ./...            # after any new dependency
```
