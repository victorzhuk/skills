---
name: z-go-bench-ab
description: A/B microbenchmark validity in Go — `-count` never interleaves b.Run arms; repeat inside the parent, equalize arm plumbing, keep a control cell; plus contention-profile attribution. Fire before quoting any benchstat delta.
---

# Go A/B benchmarking

An A/B delta is valid only when arm identity is decoupled from time, work, and construction. `p=0.000` asserts none of that — it only asserts within-run consistency, which a systematic per-arm bias satisfies perfectly. Three separate defects below each produced a confident, wrong conclusion at p=0.000 across n=20; two also replicated across sessions.

## Interleave inside the parent

`testing` walks a parent benchmark **once** to discover its `b.Run` leaves, then repeats each *leaf* `-count` times back-to-back. Five arms under `-count=20` yield five contiguous blocks of twenty — never an interleaving — so monotonic thermal/frequency drift is fully confounded with arm identity. Shuffling arm order inside the parent does not fix it: the parent body runs once, so the shuffle only picks which arm owns which block.

Do the repetition inside the parent, at `-count=1`:

```go
for rep := range reps {
    rand.Shuffle(len(arms), func(i, j int) { arms[i], arms[j] = arms[j], arms[i] })
    for _, arm := range arms {
        b.Run(fmt.Sprintf("rep=%d/%s", rep, arm.name), arm.fn)
    }
}
```

Pool with `benchstat -col /arm -ignore /rep`. The leading slash is required — it names a benchmark-name key; plain `-ignore rep` silently leaves every rep a single-sample row (`± ∞`). benchstat picks one base column per invocation, so each pairwise delta needs its own `-filter`.

Cheap check that catches blocking instantly: print the arm order from the raw output. Consecutive identical names = blocked, not interleaved.

## Equalize the arms

Any A/B over two hand-written execution paths must equalize allocation and copy idioms before its numbers mean anything. Real case: one arm appended a literal and patched fields in place; its twin built a zeroed local and copied a ~80-byte struct into the slice — tens of thousands of extra copies per op, on one side only, worth ~15%: the entire claimed "architecture" effect.

Watch for metrics that are true by construction: a counter identical across arms because the arms are 1:1 transliterations is a tautology, not a discriminator. It can still be a *finding* — identical instructions/op across encodings falsifies an instruction-count mechanism outright.

## Controls, replication, floors

- Keep one benchmark cell the change provably cannot affect as a built-in control. If the control moves, throw the run out.
- Replicate before believing: a +11.7% at p=0.009 (n=6) came back +2.4% at p=0.086 (n=12) — below the box's false-positive floor, exposed by a control cell reading +6.3% p=0.039 in the same run.
- Capture baseline and candidate in **one interleaved session**. Files captured minutes apart produce phantom regressions (an 18% goldset "regression" vanished when interleaved).
- Report "no effect" as a detection floor ("<2.4% not detectable here"), never as a proven null.
- Absolute ns figures do not survive a desktop/laptop box: same HEAD, same day, ~15% drift, invariant to GOMAXPROCS. Only interleaved same-session deltas are locally valid; absolute bars belong on a fixed hosted runner ([[z-go-perf-gate]]).
- Cross-library ratios (your engine vs another) are toolchain- and session-sensitive — one Go version bump moved one side ~8% and flipped a ratio's sign. State the toolchain with every cross-engine number and re-measure the competitor in the same session.

## Attributing profiles to benchmark time

- `-mutexprofile`/`-blockprofile` accumulate across Go's whole `b.N` ramp, but `ns/op` and `N` report only the final run — `delay / (ns/op × N)` pairs a long numerator with a short denominator and produces impossible ratios. Run at a fixed iteration count (`-benchtime=Nx`) so the function executes exactly once.
- Bound-check every contention ratio before quoting it: **delay ≤ GOMAXPROCS × wall** — that is all the goroutine-seconds that exist. A breach means numerator and denominator span different intervals.
- Profiles are process-wide and (since Go 1.22) include runtime-internal locks. Attribute with `go tool pprof -peek '<pattern>'`; never quote the `-top` total.
- Profile one sub-benchmark per invocation (`-bench '^Parent$/arm$'`), and take `-mutexprofile` and `-blockprofile` in separate passes — they perturb each other.
- Size memory attributions at `GODEBUG=memprofilerate=1`. The default sampling rate extrapolates: a follow-up sized as "the 42-alloc residue" measured 4 of 42 at exact rate.
- Prefer facts that need no normalization: "throughput regresses from 8 to 24 cores", "ns/op flat across parallelism levels" — quote those, not ratios.
- `b.Fatal` is invalid inside `b.RunParallel` (FailNow must run on the benchmark goroutine); use `b.Error` + `return`.

## Do not

- Quote a delta whose raw output shows blocked arm order.
- Accept `p=0.000` or cross-session replication as proof against systematic bias — replication controls machine drift, not asymmetric arm work.
- Compare benchmark files captured in separate sessions.
- Record a null result without a stated detection floor.
- Trust a run whose control cell moved.
- Assert a wall-clock ratio inside a parallel test suite — it measures suite contention; isolate the timed region.

## Verify

```bash
go test -bench '^BenchmarkAB$' -count=1 -benchmem ./... | tee raw.txt
rg -o 'BenchmarkAB/rep=[0-9]+/[a-z]+' raw.txt | head -20   # arm order must alternate
benchstat -col /arm -ignore /rep raw.txt
# contention pass, fixed count:
go test -bench '^BenchmarkAB$/new$' -benchtime=100x -mutexprofile=mu.out ./...
go tool pprof -peek 'FunctionUnderTest' mu.out
```

Record negative results with the evidence (n, p, floor) in the design doc so the lever is not re-proposed on the same numbers.

Optimization patterns are [[z-go-performance]] (including "Verify the premise first"); release gating [[z-go-perf-gate]].
