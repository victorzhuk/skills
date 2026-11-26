---
name: z-go-bench-ab
description: "Compare Go benchmark implementations using interleaved samples, controls, and matching work. Use for benchstat comparisons or contention profiles. See [[z-go-perf-gate]] for release criteria."
---

# Go A/B benchmarking

Control arm order and work per iteration before attributing an A/B difference. Statistical significance cannot remove bias from the setup.

## Interleave inside the parent

With sibling `b.Run` benchmarks, `-count` repeats each leaf consecutively. Changes in machine conditions can then look like implementation differences.

Repeat inside the parent with `-count=1`. Rotate or shuffle the arm order across repetitions.

```go
for rep := range reps {
    rand.Shuffle(len(arms), func(i, j int) { arms[i], arms[j] = arms[j], arms[i] })
    for _, arm := range arms {
        b.Run(fmt.Sprintf("rep=%d/arm=%s", rep, arm.name), arm.fn)
    }
}
```

Group results with `benchstat -col /arm -ignore /rep`. The leading slash selects a benchmark-name key. Filter each pair separately.

Inspect the sequence of arm names in raw output before pooling the samples.

## Equalize the arms

Match allocation, copying, setup, and result consumption. Measure unavoidable differences separately.

Choose a metric that can distinguish the proposed mechanisms. Equal instruction counts can rule out fewer instructions as the cause.

## Controls, replication, floors

- Include a control that the change cannot affect. Investigate movement outside its expected range.
- Record the toolchain, CPU, runtime settings, sample count, and detection floor.
- Interleave baseline and candidate in one session. Otherwise, use an experimental design that accounts for session drift.
- Report inconclusive results explicitly. Repeat measurements after toolchain or runtime changes.
- Use a controlled runner for release decisions. See [[z-go-perf-gate]].

## Attributing profiles to benchmark time

- A contention profile can include benchmark calibration and setup. The final `N` and `ns/op` describe only the final timed run.
- Use a fixed iteration count. Measure wall time over the same interval as the profile.
- Contention delay sums waiting time across goroutines. It can exceed `GOMAXPROCS` times wall time. [Profile semantics](https://pkg.go.dev/runtime/pprof#Profile)
- Attribute process-wide delay to relevant stacks with `go tool pprof -peek`. Runtime-internal locks can contribute.
- Profile one package and one selected sub-benchmark. Collect mutex and block profiles in separate runs.
- Record the memory sampling rate. Use `GODEBUG=memprofilerate=1` for a separate detailed allocation profile.
- In `b.RunParallel` workers, report an error with `b.Error` and return. Call `b.Fatal` only on the benchmark goroutine.

## Verify

Run in the package that defines `BenchmarkAB`. Put test binaries in the project's binary directory.

```bash
set -o pipefail
mkdir -p bin
timeout 15m go test -parallel 4 -p 2 -run '^$' -bench '^BenchmarkAB$' -count=1 -benchmem -timeout 10m . | tee raw.txt
rg -o 'BenchmarkAB/rep=[0-9]+/arm=[a-z]+' raw.txt | head -20   # inspect order across repetitions
benchstat -col /arm -ignore /rep raw.txt
# contention pass, fixed count:
timeout 15m go test -parallel 4 -p 2 -run '^$' -bench '^BenchmarkAB$/^rep=0$/^arm=new$' -benchtime=100x -mutexprofile=mu.out -o bin/bench.test -timeout 10m .
go tool pprof -peek 'FunctionUnderTest' mu.out
```

Record the sample count, p-value, and detection floor for a negative result. See [[z-go-performance]] for optimization and [[z-go-perf-gate]] for release gates.
