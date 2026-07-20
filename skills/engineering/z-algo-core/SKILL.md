---
name: z-algo-core
description: DS/algorithm selection judgment for production code, not competitive tricks — hash map for membership/dedup, slice+sort beats a tree until proven, heap for top-k, two-pointer/sliding-window for scans, BFS/DFS/topo-sort for dependency shapes. Triggers on Big-O, hash map vs tree. Does not cover profiling/tuning; see [[z-go-performance]].
---

# Algorithm core

Pick the data structure by what the code does with it — membership check, ordering, top-k, adjacency — not by habit, then measure before reaching for anything fancier.

## Complexity quick table

| Structure | Lookup | Insert | Ordered iteration | Use for |
|--|--|--|--|--|
| Array/slice | O(n) | O(1) amortized append | O(n log n) sort | default choice, best cache locality |
| Hash map | O(1) average | O(1) average | none | membership, dedup, counting |
| Balanced tree | O(log n) | O(log n) | O(n) in order | only when ordered iteration/range queries are load-bearing |
| Heap | O(1) peek | O(log n) | none | top-k, priority scheduling |
| Graph (adjacency list) | — | — | BFS/DFS O(V+E) | dependency graphs, reachability |

## When it matters

- below roughly n=1,000, the simplest structure wins — a linear scan over a slice beats a hash map's overhead at that scale and is trivially correct
- measure before optimizing above that threshold — a profiler pointing at real time spent beats guessing which O(n²) is "the" bottleneck
- an algorithm swap that isn't on a measured hot path is speculative work; [[z-no-over-engineering]] applies to data structures too

## Selection patterns

- map for a membership test or dedup (`if _, ok := seen[x]; ok`) — not a nested loop re-scanning a slice
- slice + sort beats a tree-based ordered structure until the workload proves otherwise — sort once and binary-search; simpler and usually faster than maintaining a balanced tree over a mostly-static dataset
- heap for top-k over a stream — a bounded k-sized heap beats sorting the whole stream when k is much smaller than n
- two-pointer / sliding-window for a sequential scan with a running invariant (subarray sum, longest substring without repeats) — turns an O(n²) nested scan into O(n)
- BFS/DFS/topological sort for dependency shapes: BFS for shortest-path-in-hops, DFS for exhaustive traversal or cycle detection, topo-sort for "what must run before what"

## Complexity smells a reviewer should catch

- nested loops over the same collection — an O(n²) hiding in plain sight; ask whether a map or a single indexed pass solves it
- sort inside a loop — sorting is O(n log n); sorting on every outer-loop iteration turns that into O(n² log n). Sort once, outside the loop
- repeated linear scans replaceable by one index pass — three separate loops each searching the same slice usually collapse into one pass that builds a map first

## Memory locality

- contiguous memory (array/slice) beats pointer-chasing (linked list, heap-allocated tree nodes) at scale — cache misses dominate once the working set exceeds L2/L3, regardless of Big-O. A "worse" O(n) scan over a contiguous slice frequently outruns a "better" O(log n) walk over scattered allocations at realistic n
- this is part of why slice+sort beats a tree-based structure so often in practice, not just in theory

## Language mapping

- Go: `map[K]V`, `container/heap`, `slices.Sort`/`slices.BinarySearch`
- Rust: `HashMap`/`BTreeMap`, `BinaryHeap`, `Vec::sort`/`binary_search`
- C++: `std::unordered_map`/`std::map`, `std::priority_queue`, `std::sort`/`std::lower_bound`

## Do not

- reach for data-structure exotica (skip list, trie, bloom filter, segment tree) without a measurement proving the standard structure is the bottleneck — real tools for real problems, not a default
- golf for Big-O at the cost of clarity when n is small and bounded — a ten-line O(n²) that's obviously correct beats an O(n log n) one that needs a comment to explain, until profiling says otherwise
