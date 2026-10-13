---
name: z-go-bench-ab
description: A/B microbenchmark validity in Go — `-count` never interleaves b.Run arms; repeat inside the parent, equalize arm plumbing, keep a control cell; plus contention-profile attribution. Fire before quoting any benchstat delta.
---

# Go A/B benchmarking

An A/B delta is valid only when arm identity is decoupled from time, work, and construction. `p=0.000` asserts none of that — it only asserts within-run consistency, which a systematic per-arm bias satisfies perfectly. Use controlled arm order and inspect the raw samples before attributing a change.

## Interleave inside the parent

`testing` walks a parent benchmark **once** to discover its `b.Run` leaves, then repeats each *leaf* `-count` times back-to-back. Five arms under `-count=20` yield five contiguous blocks of twenty — never an interleaving — so monotonic thermal/frequency drift is fully confounded with arm identity. Shuffling arm order inside the parent does not fix it: the parent body runs once, so the shuffle only picks which arm owns which block.

Do the repetition inside the parent, at `-count=1`:

```go
for rep := range reps {
    rand.Shuffle(len(arms), func(i, j int) { arms[i], arms[j] = arms[j], arms[i] })
    for _, arm := range arms {
        b.Run(fmt.Sprintf("rep=%d/arm=%s", rep, arm.name), arm.fn)
    }
}
```

Pool with `benchstat -col /arm -ignore /rep`. The leading slash is required — it names a benchmark-name key; plain `-ignore rep` silently leaves every rep a single-sample row (`± ∞`). benchstat picks one base column per invocation, so each pairwise delta needs its own `-filter`.

Cheap check that catches blocking instantly: print the arm order from the raw output. Consecutive identical names = blocked, not interleaved.

## Equalize the arms

Equalize allocation, copying, setup and result consumption when comparing two implementations. If one arm does extra work, measure that separately rather than attributing all of its cost to the feature under test.

Watch for metrics that are true by construction: a counter identical across arms because the arms are 1:1 transliterations is a tautology, not a discriminator. It can still be a *finding* — identical instructions/op across encodings falsifies an instruction-count mechanism outright.

## Controls, replication, floors

- Keep one benchmark cell the change provably cannot affect as a built-in control. If the control moves, throw the run out.
- Replicate with an unaffected control cell and record the toolchain, CPU, runtime settings and sample count.
- Capture baseline and candidate in one interleaved session where possible; otherwise use a paired design that accounts for session drift.
- Report an inconclusive result with the experiment's detection limits; lack of significance is not proof of equality.
- Use a controlled runner for release decisions ([[z-go-perf-gate]]). Local results can guide investigation but need measured noise bounds.
- Re-measure cross-library comparisons in the same environment after a toolchain or runtime change.

## Attributing profiles to benchmark time

- `-mutexprofile`/`-blockprofile` accumulate across Go's whole `b.N` ramp, but `ns/op` and `N` report only the final run — `delay / (ns/op × N)` pairs a long numerator with a short denominator and produces impossible ratios. Use a fixed iteration count (`-benchtime=Nx`) and account for discovery/setup work; collect wall time over the same interval as the profile.
- Contention delay sums time across waiting goroutines, including goroutines not executing on a P. It can exceed GOMAXPROCS × wall; normalize only with a defined population and matching measurement interval. See [pprof profile semantics](https://pkg.go.dev/runtime/pprof#Profile).
- Profiles are process-wide and (since Go 1.22) include runtime-internal locks. Attribute with `go tool pprof -peek '<pattern>'`; never quote the `-top` total.
- Profile one sub-benchmark per invocation (`-bench '^Parent$/arm$'`), and take `-mutexprofile` and `-blockprofile` in separate passes — they perturb each other.
- Size memory attributions at `GODEBUG=memprofilerate=1`. The default sampling rate estimates counts; report sampling settings.
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
set -o pipefail
timeout 15m go test -parallel 4 -p 2 -bench '^BenchmarkAB$' -count=1 -benchmem -timeout 10m ./... | tee raw.txt
rg -o 'BenchmarkAB/rep=[0-9]+/arm=[a-z]+' raw.txt | head -20   # inspect order across repetitions
benchstat -col /arm -ignore /rep raw.txt
# contention pass, fixed count:
timeout 15m go test -parallel 4 -p 2 -bench '^BenchmarkAB$/rep=0$/arm=new$' -benchtime=100x -mutexprofile=mu.out -timeout 10m ./...
go tool pprof -peek 'FunctionUnderTest' mu.out
```

Record negative results with the evidence (n, p, floor) in the design doc so the lever is not re-proposed on the same numbers.

Optimization patterns are [[z-go-performance]] (including "Verify the premise first"); release gating [[z-go-perf-gate]].
