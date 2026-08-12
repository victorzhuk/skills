---
name: z-go-interp-perf
description: Interpreter/scripting VM performance in Go — batched cancellation polls, preboxing, versioned-cell site caches, operand-only fusion, freeze-then-share startup templates, striped compile caches.
---

# Go interpreter/VM performance

In a Go VM the hot costs are rarely "dispatch architecture" — they are clocks, atomics, locks, and interface boxing executed per instruction or per host call. Remove those before considering an encoding rewrite; on one production VM, half of the flagship benchmark's runtime was clock + lock overhead.

## Dispatch-loop overhead anatomy

Profile-verified shares from a stack VM running a recursive workload — check these before anything structural:

- `ctx.Err()` per instruction on a deadline context ≈ 10% of runtime; an unconditional `time.Now` at call/loop opcodes ≈ 26%. Poll cancellation on an N-instruction budget (~128), and compute the deadline lazily at the *first* poll so short runs never touch the clock. Precedents: goja checks an atomic interrupt flag with an external `time.AfterFunc`; wasmtime's "slacked fuel" checks only at function entry and loop back-edges.
- Per-op atomic charging (metering, stats) — batch into a VM-local accumulator settled at poll boundaries, run exit, and host-call dispatch.
- `RWMutex` read locks surface in pprof as `atomic.Int32.Add`. Attribute with `go tool pprof -peek 'Int32.*Add'` before assuming counters.
- Validate chunks at load time so the hot loop drops per-instruction bounds checks — then **every** opcode carrying a jump, slot, or constant operand needs a validation case, including exception-handler addresses and fall-off-end (the last instruction must be non-fall-through). Re-audit on every new opcode; this bites twice otherwise.

## Boxing

Converting an 8-byte pointer-free value with bit pattern 0..255 to an interface is already 0-alloc (`runtime.staticuint64s`); negatives and ≥256 allocate. So prebox exactly what Go doesn't cover: bool singletons and a small-int range (goja's `intCache[256]` covers −256..−1 for the same reason). Verify any boxing claim per [[z-go-performance]] "Verify the premise first" before building on it.

## Global/name resolution

- A map lookup + `RWMutex` per global read dominates recursive workloads (33–50% of cycles in two separate profiling rounds). Fix: resolved-binding cells plus a per-chunk site cache — a hit is 2–3 atomic loads (site pointer, generation, cell version); a miss falls back to the locked path.
- The invalidation guard must be the **cell's own version, read before resolving the cell**. Reading it after pairs a fresh generation with an orphaned cell — a logical TOCTOU the race detector cannot see (reproduced as rare sticky divergences per hundreds of thousands of cycles).
- Publish nothing per write: a design that heap-allocates per *write* to make reads lock-free fails allocation gates on write-heavy loops. Locked-read cells with version snapshots keep both axes clean.
- Cover every lookup namespace. A Lisp-2 dialect's function-cell reads stayed uncached while value reads had the site cache — extending sites to the second namespace was worth −30% on the recursive cell.

## Superinstruction fusion

- Fuse operator resolution + operands into one instruction; keep the consumer (branch, store) a separate real instruction. If a rebind can produce the operand **asynchronously** — a VM-compiled closure call pushes a frame and returns later — a fused compute-and-branch cannot exist at the right time. Test rebind semantics with a bytecode-compiled closure, not a host function: host functions resolve synchronously and hide the hazard.
- Fusion harvests the instruction-count axis. After it, register encoding and pre-decoded dispatch measured a 2–6% ceiling against literature promising −47% instructions / −32% time on unfused VMs — published figures do not transfer. Measure instructions/op across arms first: identical counts falsify the mechanism outright.
- A prototype-vs-production dispatch gap is mostly **generality** (full opcode switch, error paths, try/catch, closure machinery), not encoding. Don't quote prototype ratios as architecture wins.

## Startup

- Freeze-then-share templates: build the stdlib environment once per (dialect fingerprint, plugin set) key, publish an immutable snapshot behind `atomic.Pointer`, and add a fail-closed guard refusing writes to a published layer. Per-engine cost drops from full init + closure rebuilds to a map copy or less (measured −68% time / −72% allocs). Precedents: goja's lazy templated globals (`sync.Once` name→factory, materialize on first access), starlark-go's freeze-then-share.
- `singleflight` collapses concurrent same-key calls **even for keys that will never complete** — a plugin that must initialize per engine needs an explicit call-site gate, not "the cache will naturally miss".
- `slog.DiscardHandler` (Go 1.24) beats `slog.New(TextHandler(io.Discard))`: `Enabled` is always false, skipping attribute formatting on every later call.

## Shared compile cache

- One mutex around the chunk cache stops scaling around 8 cores (measured: the cache was 60–88% of *all* blocking at 24 cores). Stripe it: per-stripe map/LRU/mutex plus engine-wide `atomic.Int64` occupancy counters as the sole aggregate authority, with admission that refuses rather than over-admits — the ceiling then holds exactly, no tolerance term.
- Per-stripe quotas divide small ceilings to zero (quota 0 → cache silently dead, tests pass vacuously); a pure global total with local-only eviction over-admits or ossifies. The counters+refusal hybrid is the shape that works.
- Make stripe count adaptive (1 below a ceiling threshold) so tiny-ceiling configs and existing tests keep exact single-stripe semantics.
- Move epoch/invalidation reclamation behind one CAS; never sweep the LRU on every miss.
- Skip cache-line padding of small stripe structs unless measured on the target — it measured neutral-to-worse here.

## Host-call boundary

- Give embedders a pre-resolved handle API (cached cell keyed by env + generation) instead of name lookup per call; a value-namespace fallback result must never be cached under a function-namespace key.
- Benchmarks and hot embedder code should pass a pre-built `[]Value` — variadic literals allocate a fresh slice per call (two 16-byte interface headers = the whole 32 B/op some Call benchmarks report).
- A lean fast path (no meter, no callbacks, plain ctx → single defer, CAS-claimed pooled VM) cut the call boundary 21–36%. But measure the raw floor first — bare apply on a reused VM — because if the floor is near a competitor's full path, boundary stripping alone can't win; VM internals must shrink too.
- Audit per-eval hashing/keying: `sha256.Sum256([]byte(src))` heap-copies the whole source per eval — one such site was 18% of alloc_space. Hash via `unsafe.Slice(unsafe.StringData(s), len(s))` or a stack buffer.

## Do not

- Rewrite dispatch or bytecode encoding before clocks, atomics, locks, and boxing are gone from the per-instruction path.
- Fuse a consumer whose operand can arrive asynchronously.
- Let a performance cache add a per-write heap allocation.
- Re-propose a closed lever without new evidence — keep a rejected-with-evidence ledger (measured delta, n, why) in the design docs; deferred levers get explicit re-trigger conditions.

## Verify

- Cross-validate VM vs reference evaluator on a fixed corpus after every change (parity is the correctness oracle, not either engine alone).
- Run the full corpus benchmark on **both** execution modes with alloc/bytes accounting — a win on the flagship microbench can regress write-heavy cells.
- Interleaved A/B with an untouched control cell per [[z-go-bench-ab]]; race detector separately and untimed.

Release gating for the corpus is [[z-go-perf-gate]]; language/VM design (tail calls, macros, value model) is [[z-lisp-core]].
