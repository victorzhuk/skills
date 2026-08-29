---
name: z-go-stdlib
description: >
  Stdlib-first discovery — verify the Go standard library or golang.org/x
  already has it (`go doc`, task→package map) before writing any helper or
  adding a dependency. Triggers on "write a helper", "utils package", "is
  there a stdlib function". Old→new migration: [[z-go-modernize]]; pkg.go.dev
  queries: [[z-go-pkg]].
---

# Stdlib First

Assume the standard library already has it until `go doc` proves otherwise.
Every hand-rolled helper is a liability: untested, unnamed, invisible to the
next reader who already knows the stdlib name.

## Lookup workflow

1. `go doc <pkg>` for the package index; `go doc <pkg>.<Symbol>` for one API.
2. `go doc -all <pkg> | rg -i <term>` when the symbol name is unknown.
3. Search across std: pkg.go.dev via [[z-go-pkg]], or the coverage map below.
4. Nothing in std → check `golang.org/x` (`x/sync`, `x/time`, `x/text`,
   `x/crypto`, `x/exp`).
5. Only then a third-party dependency — and justify it (see gate below).

Never quote an API from memory into code — signatures drift between releases.
Verify with `go doc` at the version in `go.mod`.

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
| JSON in new code | `encoding/json/v2`; token-level `encoding/json/jsontext` | 1.27 |
| HTTP test server without sockets | `httptest.NewTestServer` (in-memory net) | 1.27 |
| Safe file access under a dir | `os.Root` | 1.24 |
| Walk a tree | `fs.WalkDir`, `filepath.WalkDir` | 1.16 |
| Read/write whole file | `os.ReadFile`, `os.WriteFile` | 1.16 |
| Multi-error, error matching | `errors.Join`, `Is`, `As`; flow in [[z-go-errors]] | 1.20 |
| Timeout/cancel plumbing | `context` (`AfterFunc`, `WithoutCancel` 1.21); see [[z-go-context]] | — |
| Elapsed time, date math | `time.Since`, `AddDate`, `time.DateOnly` et al. | — |
| Priority queue / top-k | `container/heap`; choice judgment in [[z-algo-core]] | — |
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
| `min`/`max`/`abs` int helpers | `min`, `max` builtins; int `abs` — write it, none in std |
| custom `Set[T]` type | `map[T]struct{}`; no stdlib set — that is the idiom |
| `reverseSlice` | `slices.Reverse` |
| `chunkSlice(s, n)` | `slices.Chunk(s, n)` |
| `fmt.Sprintf("%d", n)` | `strconv.Itoa(n)` — no reflection, far cheaper |
| WaitGroup wrapper struct | `wg.Go(f)` (1.25) or `errgroup` |
| once-guarded getter | `sync.OnceValue(compute)` |
| `Map`/`Filter` generics (or `samber/lo`) | none by design — a plain `for` loop is the idiom |
| retry/backoff loop | none in std — small local loop first, library only if jitter/policy needed |
| `github.com/google/uuid` import | std `uuid` (1.27) covers v4/v7 generate + parse |

## Dependency gate

Before `go get`:

- Stdlib or `x/` covers ~80% of the need → use it; a little copying is better
  than a little dependency.
- Still needed → check health via [[z-go-pkg]] (imported-by count,
  vulnerabilities, last release), then add and state why in the plan/PR.
- Never import a kitchen-sink util library (`lo`, `funk`, `go-funk`) to save
  a for-loop.

## Do not

- Ship a `utils`/`helpers` package containing anything from the tables above.
- Use `golang.org/x/exp/slices|maps` when `go.mod` ≥ 1.21 — std owns them now.
- Guess signatures from memory — `go doc` first.
- Apply an API above a version the `go.mod` directive allows; bump first or
  pick the older tool ([[z-go-modernize]] owns the upgrade path).

## Verify

```sh
go doc <pkg>.<Symbol>        # signature matches usage
go vet ./...
govulncheck ./...            # after any new dependency
```
