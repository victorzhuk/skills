---
name: z-algo-core
description: "Choose a data structure for lookup, ordering, top-k queries, or graph traversal. Compare time and space costs. Use [[z-go-performance]] to measure Go code."
---

# Algorithm core

Identify the required operations and their frequency. Measure the candidate structure with representative inputs.

## Complexity quick table

| Structure | Lookup | Insert | Ordered iteration | Use for |
|--|--|--|--|--|
| Array/slice | O(n) | O(1) amortized append | O(n log n) sort | default choice, best cache locality |
| Hash map | O(1) average | O(1) average | none | membership, dedup, counting |
| Balanced tree | O(log n) | O(log n) | O(n) in order | only when ordered iteration/range queries are load-bearing |
| Heap | O(1) root, O(n) arbitrary lookup | O(log n) | none | top-k, priority scheduling |
| Graph (adjacency list) | — | — | BFS/DFS O(V+E) | dependency graphs, reachability |

## When it matters

- Start with a simple structure for bounded inputs. A scan can outperform hashing for some key types and collection sizes.
- Measure representative hit rates, mutations, and repeated queries before changing a hot path. See [[z-no-over-engineering]].

## Selection patterns

- map for a membership test or dedup (`if _, ok := seen[x]; ok`) — not a nested loop re-scanning a slice
- For mostly static ordered data, compare sorting once and binary search with maintaining a balanced tree.
- heap for top-k over a stream — a bounded k-sized heap beats sorting the whole stream when k is much smaller than n
- Use a sliding window when its invariant lets either endpoint advance without backtracking. For sums, check assumptions about negative values.
- BFS/DFS/topological sort for dependency shapes: BFS for shortest-path-in-hops, DFS for exhaustive traversal or cycle detection, topo-sort for "what must run before what"

## Complexity smells a reviewer should catch

- Estimate iteration counts before classifying nested loops. An inner loop that consumes each item once can still give linear total work.
- If the sort key and collection remain unchanged, sort once outside the loop.
- Compare repeated searches with the cost of building and maintaining an index.

## Memory locality

Compare a contiguous scan with pointer-based lookup on the target workload.
Record input size and key distribution. Cache misses can outweigh a lower operation count.

## Language mapping

- Go: `map[K]V`, `container/heap`, `slices.Sort`/`slices.BinarySearch`
- Rust: `HashMap`/`BTreeMap`, `BinaryHeap`, `Vec::sort`/`binary_search`
- C++: `std::unordered_map`/`std::map`, `std::priority_queue`, `std::sort`/`std::lower_bound`

## Check the algorithm

Test empty inputs, duplicate keys, and the largest supported input. Check ordering requirements before replacing a map, tree, or sorted slice.
Compare the time and memory costs of the existing and proposed structures on representative data.
