---
name: z-go-interp-perf
description: "Profile Go interpreters and scripting VMs. Use for dispatch costs, boxing, binding caches, opcode fusion, or startup regressions. Use [[z-go-bench-ab]] for comparisons."
---

# Go interpreter/VM performance

Profile a representative program before changing its bytecode or execution model.

## Dispatch and metering

- Measure clocks, cancellation checks, atomics, locks, and interface conversions per instruction.
- If polling dominates, batch checks within an instruction budget. Test cancellation latency on loops, host calls, and short programs.
- Preserve the original deadline. A delayed poll must not start a new timeout period.
- Settle metering charges at poll boundaries, host calls, and exit. Enforce the original resource limits.
- Inspect callers of `atomic.Int32.Add` with `go tool pprof -peek 'Int32.*Add'`. Read locks can produce these samples.
- Before removing runtime checks, check each jump, handler, slot, constant, and fall-through path when loading a chunk.

## Values and name lookup

- Measure allocations for the concrete values and escape paths. A conversion to an interface need not allocate.
- If repeated binding lookup dominates, compare a per-site cache with the locked lookup.
- Associate each cached binding with its environment, namespace, and version. Capture the version before resolving the binding.
- Test rebinding and invalidation. Race detection alone cannot identify a stale binding.
- Measure write-heavy workloads as well as reads. An allocation on every write can erase the gain.

## Opcode fusion

Keep a consumer instruction separate when its operand can arrive after a VM frame returns.
Test rebinding with a bytecode closure as well as a synchronous host function.
Compare instruction counts across equivalent executions before attributing a gain to reduced dispatch.
Include production error paths and closures when comparing encodings.

## Startup and compile caches

- Share an immutable template only across compatible dialects and plugin sets. Reject mutations after publication.
- Run per-engine plugin initialization separately. `singleflight` shares concurrent results for the same key.
- For disabled logging, use `slog.DiscardHandler` where supported. A text handler can still format data for `io.Discard`.
- Consider striping only after measuring compile-cache contention. Check admission and eviction against the global capacity.
- Test capacities smaller than the stripe count. A zero local quota can prevent all admissions.
- Measure reclamation frequency and cache-line padding separately.

## Host calls

Cache a resolved handle by environment, namespace, and generation.
Reuse argument buffers only when callees cannot retain them.
Measure the call boundary against direct evaluation on the same VM.
Measure hashing and conversion costs over actual source lengths. Preserve input lifetime and immutability when using borrowed storage.

## Verification

- Compare VM and reference evaluator results on a fixed corpus. Check disagreements against the language contract.
- Measure latency, bytes, and allocations in both execution modes. Include read-heavy and write-heavy programs.
- Interleave comparison runs with an unchanged control. Run the race detector separately. See [[z-go-bench-ab]].

Use [[z-go-perf-gate]] for corpus release checks. See [[z-lisp-core]] for language and VM design.
