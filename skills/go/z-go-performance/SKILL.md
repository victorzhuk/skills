---
name: z-go-performance
description: Go performance optimization — allocation reduction, CPU efficiency, memory layout, GC tuning, pooling, caching, hot-path patterns. Use when profiling found a bottleneck, or in review to flag anti-patterns before measuring. Triggers on "sync.Pool", "escape analysis", "GOMEMLIMIT", "fieldalignment", "pprof", "benchstat". Measurement methodology is [[z-go-troubleshooting]]; concurrency [[z-go-concurrency]]; aliasing [[z-go-safety]].
---

# Go Performance

## Core discipline

Profile → hypothesize → change ONE thing → re-measure. Choose CPU, allocation rate, retained memory, or contention work from the measured bottleneck.

Before touching Go code, verify the bottleneck is *in your process* — if 90% of latency is a slow DB query or upstream API, reducing allocations won't help.

```bash
fgprof -http :6060 &
```

## Iteration cycle

```bash
timeout 5m go test -run='^$' -bench=BenchmarkFoo -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./pkg/... | tee bench-before.txt
# apply ONE change
timeout 5m go test -run='^$' -bench=BenchmarkFoo -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./pkg/... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
```

Paste `benchstat` output in the commit body (`perf(scope): ...`). Never claim improvement with `~` (no statistical significance).

For A/B validity traps — interleaving, arm symmetry, control cells, contention-profile attribution — see [[z-go-bench-ab]].

## Verify the premise first

A perf change's premise ("this allocates", "this struct can't shrink without reordering") must come from a compiler or runtime observation, not from reading code — one command settles each claim:

- **Heap claim**: `go build -gcflags=-m` — escape analysis may already stack-allocate the object; pooling it then removes zero allocations. Account for every alloc in the target `-benchmem` cell by name.
- **Boxing claim**: interface conversions may use direct storage, static data, stack storage, or heap allocation. Current gc has static storage for bools and some small integer representations, but type layout and escape path matter. Nonescaping negative values need not allocate. Inspect `go build -gcflags='-m=2'` and `-gcflags=-S`, then measure the actual escaping and nonescaping call paths before preboxing.
- **Layout claim**: never assert a size/alignment consequence of field order by reasoning — run a throwaway `unsafe.Sizeof`/`unsafe.Offsetof` program over **all** variants under comparison. The failure mode is crediting a size-class crossing to a reorder that contributed nothing; the bytes gate sees size classes, not field counts.
- **Sizing a win**: when attributing small allocation differences, use `GODEBUG=memprofilerate=1` in a separate diagnostic run; its overhead invalidates normal timing comparisons. Measure both allocation counts and bytes across representative capacities and key/value types. Equal counts do not imply equal map memory cost; counts and size classes vary with toolchain and input.

When a change pays off through a different mechanism than proposed, correct the premise in the doc instead of letting the wrong causal story stand.

`b.Loop()` (Go 1.24+) is preferred over `b.N` — times only the loop body, keeps results alive:

```go
func BenchmarkParse(b *testing.B) {
    data := loadFixture("large.json")
    for b.Loop() {
        Parse(data)
    }
}
```

## Decision matrix

| Signal (pprof) | Bottleneck | Action |
|---|---|---|
| `alloc_objects` high | too many heap allocs | Identify escaping objects; measure preallocation, lifetime changes, or pooling |
| function dominates CPU profile | hot loop | inlining, cache locality, avoid reflect |
| high GC%, OOM in container | GC pressure | GOMEMLIMIT, GOGC, reduce live set |
| goroutines blocked on I/O | external wait | connection pools, streaming, batching |
| same work repeated | redundant computation | singleflight, local cache, precompute |
| O(n²) where O(n) exists | wrong algorithm | sort+binary search, map lookup |
| mutex/block profile hot | lock contention | see [[z-go-concurrency]] |
| DB time dominates traces | slow queries | see [[z-go-database]] |

## Allocation reduction

```go
// Preallocate when size is known
out := make([]Result, 0, len(in))

// sync.Pool for short-lived, frequently-allocated objects
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}

func process(data []byte) string {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer bufPool.Put(buf)
    buf.Write(data)
    return buf.String()
}
```

Escape analysis — check what escapes to heap:

```bash
go build -gcflags="-m=2" ./pkg/... 2>&1 | rg "escapes to heap"
```

Address-taking, closures, and interface conversions can cause escape on any Go version; none implies an allocation by syntax alone. Escape diagnostics also do not settle every dynamic-size allocation: measure representative input lengths and retained results.

## Retained memory

- A small substring or subslice can retain a large backing allocation. Use `strings.Clone` or `slices.Clone` when the retained memory warrants a copy. Capacity clipping does not detach storage; clone/alias semantics belong to [[z-go-safety]].
- After manual deletion or compaction of pointer-bearing slice elements, clear the obsolete tail before shortening when those references should be released. `slices.Delete` clears that tail on Go 1.22+; keep its returned slice and account for aliases.
- `clear(m)` removes entries, not a promised amount of backing storage. Rebuild or release a map only when retained-memory measurements justify it and ownership permits it.
- `sync.Pool` may drop entries at any time. Bound retained buffer capacity when pooling; do not return an object while another caller still holds a mutable view of its storage.

## Struct alignment

Padding waste adds up on hot-path structs. Run:

```bash
fieldalignment ./...
```

Measure field sizes and alignment for the target `GOARCH`; group fields to reduce measured padding without breaking layout contracts. On amd64, the following example reduces 24 bytes to 16; verify rather than generalizing those sizes to every target:

```go
// Bad: 24 bytes due to padding
type Bad struct {
    A bool
    B int64
    C bool
}

// Good: 16 bytes
type Good struct {
    B int64
    A bool
    C bool
}
```

## Memory layout & cache locality

Investigate false sharing when independently written fields contend on the target CPU. Cache-line size and padding benefits are target-dependent; benchmark before padding shards, which increases the live set.

A `[]Foo` stores elements contiguously; `[]*Foo` adds indirection and potentially more allocations and GC scanning. Pointers can avoid large copies. For large slice elements, compare index iteration with `for _, v := range s`; choose from measured copy cost and locality, preserving aliasing behavior.

## GC tuning

```bash
# Containers: set to 80-90% of container memory limit
GOMEMLIMIT=400MiB go run ./cmd/server

# Reduce GC frequency at cost of higher peak memory
GOGC=200  # default 100; higher = less frequent GC

# Diagnose GC activity
GODEBUG=gccheckmark=1,gctrace=1 go run ./cmd/server
```

## CPU hot-path patterns

| Pattern | Avoid | Prefer |
|---|---|---|
| Reflection | `reflect.DeepEqual` in loops | typed comparisons, `slices.Equal`, `bytes.Equal` |
| Interface dispatch | `any` parameters on hot path | concrete types or generics |
| Logging in loops | `log.Printf(...)` every iteration | log outside, or `slog.LogAttrs` with level check |
| panic/recover as flow | `panic` + `recover` for errors | error returns |
| Large copy on map access | Assume either representation wins | Compare value copies with pointer indirection, GC cost, and ownership |

Inlining uses compiler cost heuristics affected by call sites and PGO, not a fixed AST-node limit. Check the actual build:

```bash
go build -gcflags="-m=2" ./... 2>&1 | rg "can inline|too complex"
```

For a measured indexing hotspot, inspect bounds checks with `go build -gcflags='-d=ssa/check_bce/debug=1' ./pkg/...`; instantiate relevant generic functions so their bodies are compiled. Prefer clear length-guarded loops. Recheck hints after compiler upgrades; fewer bounds checks alone do not prove a speedup.

## I/O & networking

`http.DefaultTransport` caps `MaxIdleConnsPerHost` at 2 — always configure:

```go
transport := &http.Transport{
    MaxIdleConnsPerHost: 64,
    MaxIdleConns:        256,
    IdleConnTimeout:     90 * time.Second,
}
```

Prefer streaming over read-all for large payloads (`io.Copy`, `json.Decoder` over `json.Unmarshal` on a fully-buffered body). Batch DB operations — one `INSERT ... VALUES (…),(…)` beats N single-row inserts.

## Caching & work avoidance

`singleflight` collapses concurrent identical requests to one in-flight call:

```go
var g singleflight.Group

func fetch(key string) ([]byte, error) {
    v, err, _ := g.Do(key, func() (any, error) {
        return expensiveLoad(key)
    })
    if err != nil {
        return nil, err
    }
    return v.([]byte), nil
}
```

Precompile regexps at init, precompute lookup tables, cache parsed config. For process-local LRU/LFU, see `samber/hot`.

## Do not

- Optimize without profiling — measure first, always.
- Write a heap, boxing, or layout claim into a proposal without running the one command that settles it.
- Change more than one thing between benchmark runs — you won't know what helped.
- Accept `~` benchstat rows as evidence of improvement.
- Reach for `unsafe` before exhausting typed alternatives.

## Verify

```bash
timeout 5m go test -run='^$' -bench=. -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
go build -gcflags="-m=2" ./... 2>&1 | rg "escapes to heap"
fieldalignment ./...
```

Prefer the project's bounded benchmark target. Record toolchain, `GOARCH`, input sizes, and concurrency settings; keep them identical between comparisons. `-parallel` limits tests, not `b.RunParallel`; `-cpu=2` bounds its default workers, while `SetParallelism` multiplies that count. Check benchmark-specific worker creation too.

## Sources

- [Go101: allocations](https://go101.org/optimizations/0.3-memory-allocations.html), [retention](https://go101.org/article/memory-leaking.html), [copy costs](https://go101.org/article/value-copy-cost.html), [bounds checks](https://go101.org/optimizations/5-bce.html).
- [Go GC guide](https://go.dev/doc/gc-guide), [slices.Delete](https://pkg.go.dev/slices#Delete), [sync.Pool](https://pkg.go.dev/sync#Pool). Treat compiler examples as version-specific observations; confirm current behavior before applying them.
