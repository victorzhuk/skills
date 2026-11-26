---
name: z-go-performance
description: "Measure and optimize Go allocation, memory retention, CPU cost, and contention after locating the bottleneck. Use [[z-go-bench-ab]] for comparative benchmark design."
---

# Go Performance

## Core discipline

Locate the bottleneck in the process or an external dependency.
Select a CPU profile, allocation profile, heap profile, trace, or contention profile for the symptom.
Change one variable at a time. Repeat the measurement with equivalent inputs.

## Iteration cycle

```bash
set -o pipefail
timeout 5m go test -run='^$' -bench=BenchmarkFoo -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./pkg/... | tee bench-before.txt
# apply ONE change; these sequential runs are exploratory, not a causal A/B claim
timeout 5m go test -run='^$' -bench=BenchmarkFoo -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./pkg/... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
```

Record workload and results. Sequential runs can reflect machine drift. Use [[z-go-bench-ab]] to attribute small differences. A nonsignificant result cannot establish equality.

## Check the premise first

- **Heap allocations.** Inspect escape diagnostics. Measure allocations on the actual benchmark path before adding a pool.
- **Interface conversions.** Measure the concrete types and escape paths. A conversion can use static data, stack storage, or heap allocation.
- **Struct layout.** Compare all variants with `unsafe.Sizeof` and `unsafe.Offsetof` on the target architecture.
- **Allocation size.** Compare allocation counts and bytes across representative capacities. Use `GODEBUG=memprofilerate=1` only in a separate diagnostic run.
- If the measured mechanism differs from the hypothesis, report the observed mechanism.

Use `b.Loop()` on Go 1.24+ to time the loop and preserve its results.

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
| High `alloc_objects` | Many allocated objects | Locate allocation sites before measuring changes. |
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

Measure representative input sizes and retained results. Address-taking or a closure alone does not establish a heap allocation.

## Retained memory

- Clone a substring or subslice when it retains unwanted storage. Capacity clipping preserves the backing array. See [[z-go-safety]].
- Clear obsolete pointer-bearing elements after manual compaction. On Go 1.22+, `slices.Delete` clears the obsolete tail. Keep the returned slice.
- Measure retained map memory before rebuilding it. `clear(m)` makes no guarantee about released backing storage.
- Bound pooled buffer capacity. Release an object only after all mutable views expire. A pool can discard entries at any time.

## Struct alignment

Padding waste adds up on hot-path structs. Run:

```bash
fieldalignment ./...
```

Measure each layout on the target architecture. Reorder fields only when the change preserves layout contracts. The example sizes assume amd64.

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

Check for false sharing when independently written fields contend on the target CPU. Measure padding on that architecture and account for added memory.

`[]Foo` stores values contiguously. `[]*Foo` adds indirection and can reduce copying. Compare indexed iteration with `for _, v := range s` on representative data. Preserve aliasing behavior.

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

Inspect measured indexing hotspots with `go build -gcflags='-d=ssa/check_bce/debug=1'`. Instantiate the relevant generic functions. Measure runtime after changing bounds checks.

## I/O & networking

For a measured connection-reuse bottleneck, clone the default transport before tuning it:

```go
transport := http.DefaultTransport.(*http.Transport).Clone()
transport.MaxIdleConnsPerHost = 64
transport.MaxIdleConns = 256
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

## Verification

```bash
set -o pipefail
timeout 5m go test -run='^$' -bench=. -benchmem -count=10 -cpu=2 -timeout 2m -p 2 -parallel 2 ./... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
go build -gcflags="-m=2" ./... 2>&1 | rg "escapes to heap"
fieldalignment ./...
```

Use a bounded project benchmark. Record toolchain, architecture, inputs, and concurrency. For `b.RunParallel`, account for `-cpu`, `SetParallelism`, and custom workers.

## Sources

- [Go101: allocations](https://go101.org/optimizations/0.3-memory-allocations.html), [retention](https://go101.org/article/memory-leaking.html), [copy costs](https://go101.org/article/value-copy-cost.html), [bounds checks](https://go101.org/optimizations/5-bce.html).
- Check compiler-dependent examples with the project’s toolchain. [Go GC guide](https://go.dev/doc/gc-guide), [slices.Delete](https://pkg.go.dev/slices#Delete), [sync.Pool](https://pkg.go.dev/sync#Pool).
