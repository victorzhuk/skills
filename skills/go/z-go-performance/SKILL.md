---
name: z-go-performance
description: >
  Go performance optimization — allocation reduction, CPU efficiency, memory layout,
  GC tuning, pooling, caching, and hot-path patterns. Use when profiling has identified
  a bottleneck and you need the right pattern to fix it, or during code review to flag
  structural anti-patterns before measuring. Triggers on "sync.Pool", "escape analysis",
  "alloc_objects", "GOMEMLIMIT", "fieldalignment", "struct padding", "inlining",
  "cache locality", "hot path", "pprof", "benchstat", "b.Loop", "BenchmarkX".
  Does not cover measurement methodology (write/run/compare benchmarks) — see [[z-go-troubleshooting]];
  does not cover concurrency primitives — see [[z-go-concurrency]];
  does not cover data-structure choice internals — see [[z-go-safety]] for aliasing pitfalls.
---

# Go Performance

## Core discipline

Profile → hypothesize → change ONE thing → re-measure. Intuition about bottlenecks is wrong ~80% of the time. Reducing allocations per request yields more ROI than micro-optimizing CPU cycles.

Before touching Go code, verify the bottleneck is *in your process* — if 90% of latency is a slow DB query or upstream API, reducing allocations won't help.

```bash
fgprof -http :6060 &
```

None of `sync.Pool`, `GOMEMLIMIT`/`GOGC` tuning, `fieldalignment`, or the full
`Benchmark*`/`b.Loop()`/benchstat cycle below shows real usage across the current
fleet yet — that's not evidence against them, just that no profiled bottleneck has
needed them so far. They stay in this skill for when one does.

## Iteration cycle

```bash
go test -bench=BenchmarkFoo -benchmem -count=10 ./pkg/... | tee bench-before.txt
# apply ONE change
go test -bench=BenchmarkFoo -benchmem -count=10 ./pkg/... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
```

Paste `benchstat` output in the commit body (`perf(scope): ...`). Never claim improvement with `~` (no statistical significance).

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
| `alloc_objects` high | too many heap allocs | sync.Pool, prealloc, value receivers |
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
go build -gcflags="-m=2" ./pkg/... 2>&1 | grep "escapes to heap"
```

Common escape causes: interface boxing, taking address of loop variable (pre-1.22), closures capturing by reference, passing to `interface{}` parameters.

## Struct alignment

Padding waste adds up on hot-path structs. Run:

```bash
fieldalignment ./...
```

Pack large fields first (pointer/int64 = 8 bytes), bools/int8 last:

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

False sharing: avoid placing fields written by different goroutines in the same cache line (64 bytes). Pad with `_ [64]byte` when a struct is used as a goroutine-local shard.

Value types in hot loops are cheaper than pointer chasing — a `[]Foo` is a contiguous block; `[]*Foo` makes the CPU fetch each element from a random heap address.

## GC tuning

```bash
# Containers: set to 80-90% of container memory limit
GOMEMLIMIT=400MiB go run ./cmd/server

# Reduce GC frequency at cost of higher peak memory
GOGC=200  # default 100; higher = less frequent GC

# Diagnose GC activity
GODEBUG=gcchkmark=1,gctrace=1 go run ./cmd/server
```

## CPU hot-path patterns

| Pattern | Avoid | Prefer |
|---|---|---|
| Reflection | `reflect.DeepEqual` in loops | typed comparisons, `slices.Equal`, `bytes.Equal` |
| Interface dispatch | `any` parameters on hot path | concrete types or generics |
| Logging in loops | `log.Printf(...)` every iteration | log outside, or `slog.LogAttrs` with level check |
| panic/recover as flow | `panic` + `recover` for errors | error returns |
| Large copy on map access | `map[K]BigStruct` — copies value | `map[K]*BigStruct` |

Inlining: functions > 80 AST nodes won't inline. Check:

```bash
go build -gcflags="-m" ./... 2>&1 | grep "can inline\|too complex"
```

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
    return v.([]byte), err
}
```

Precompile regexps at init, precompute lookup tables, cache parsed config. For process-local LRU/LFU, see `samber/hot`.

## Do not

- Optimize without profiling — measure first, always.
- Change more than one thing between benchmark runs — you won't know what helped.
- Accept `~` benchstat rows as evidence of improvement.
- Reach for `unsafe` before exhausting typed alternatives.

## Verify

```bash
go test -bench=. -benchmem -count=10 ./... | tee bench-after.txt
benchstat bench-before.txt bench-after.txt
go build -gcflags="-m=2" ./... 2>&1 | grep "escapes to heap"
fieldalignment ./...
```
