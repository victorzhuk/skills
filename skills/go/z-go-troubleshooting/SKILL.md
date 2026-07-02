---
name: z-go-troubleshooting
description: >
  Systematic Go debugging — reproduce, instrument, find root cause, verify fix.
  Use when encountering panics, deadlocks, races, memory growth, high latency,
  flaky tests, or any "something is wrong" situation. Triggers on "panic",
  "deadlock", "race condition", "goroutine leak", "memory leak", "pprof",
  "GOTRACEBACK", "dlv", "delve", "go test -race", "why is this slow".
  Does not cover profiling interpretation or optimization patterns; see
  [[z-go-performance]] and [[z-go-concurrency]].
---

# Go troubleshooting

No fixes without a root cause. Symptom patches create new bugs. This is
especially true under time pressure.

## Feedback loop first

Before forming any hypothesis, build the tightest pass/fail signal you can —
**fast** (reruns in seconds), **deterministic** (same result every run),
**sharp** (fails close to the fault). Jumping straight to a hypothesis is the
exact failure this discipline prevents.

Prefer the tightest loop you can build:

1. A failing unit test reproducing the bug in-package.
2. A failing integration test against the real boundary (DB/HTTP/queue via `testcontainers`).
3. A scripted CLI / `curl` repro that fails deterministically.
4. `git bisect` against a known-good commit (regressions).
5. A one-off instrumented build — extra logs/metrics, `GODEBUG`, `-gcflags` — run against a live repro.
6. Logs/traces captured at the moment of the symptom (loosest; no local repro yet).

Tighten before you widen: make the loop faster (`-count`, smaller input), more
deterministic (`-race`, fixed seed, `synctest`), and sharper (assert nearer the
suspected fault) *before* changing code.

## Decision tree

| Symptom | First move |
|---|---|
| Build fails | `go build ./... 2>&1`, then `go vet ./...` |
| Wrong output / logic | Write a failing test; check error handling, nil, off-by-one |
| Panic / crash | `GOTRACEBACK=all ./app`, read the full stack |
| Flaky / race | `go test -race ./...` |
| Hang / frozen | `curl localhost:6060/debug/pprof/goroutine?debug=2` |
| High CPU | pprof CPU profile → flamegraph |
| Memory growing | pprof heap profile (`allocs` vs `inuse_space`) |
| High p99 latency | mutex + block + goroutine profiles together |

## Golden rules

1. Read the full error — file, line, type. Go there first.
2. Reproduce before fixing. Write a failing test; use `git bisect` for regressions.
3. One hypothesis at a time. Change one thing, measure, confirm.
4. Measure, don't guess — race detector, pprof, benchmarks.
5. Trace to root cause. Band-aids on symptoms create new bugs.
6. Check callers first — the "bug" may be unreachable in prod.
7. `fmt.Println` locally is fine; escalate tools only when needed.

## Common Go bug patterns

**Nil pointer / typed-nil interface trap**
```go
var p *MyType = nil
var i MyInterface = p  // i != nil — interface has non-nil type
```
Always compare to the concrete type, or return `nil` explicitly from
functions returning an interface. Recognize it here; the defense lives in
[[z-go-safety]].

**Variable shadowing**
```go
x, err := foo()
if err != nil {
    x, err := bar()  // new x, err — outer x unchanged
    _ = x
}
```
Use `=` for the outer variable; only `:=` the new one.

**Goroutine leak** — always `defer cancel()` right after `context.WithCancel`.
Detect with `goleak.VerifyNone(t)` in tests.

**Slice aliasing** — `b := a[:2]` shares memory; `append` may overwrite `a[2]`.
Copy when you don't own the slice: `b = append([]int(nil), a[:2]...)`. Same
append-aliasing trap [[z-go-safety]] covers as a design-time rule.

**Concurrent map write** — panics at runtime; use `sync.Map` or `sync.RWMutex`.
`go test -race` catches this. [[z-go-safety]] has the nil-map and concurrent-write
prevention patterns.

**Error swallowing** — never use `_` for errors; propagate with
`fmt.Errorf("do thing: %w", err)`. [[z-go-errors]] covers the wrapping and
handling rules this violates.

**defer in a loop** — defers accumulate until the function returns, not the
iteration. Wrap the body in a closure or extract a helper. [[z-go-safety]]
has the general defer-discipline rule.

## Race conditions and deadlocks

```sh
go test -race ./...
GORACE="log_path=/tmp/race" go test -race ./...
```

For a running service:
```sh
kill -SIGABRT <pid>   # dumps all goroutine stacks
# or
curl localhost:6060/debug/pprof/goroutine?debug=2
```

Deadlock signatures: `all goroutines are asleep`, cyclic lock acquisition,
channel send/recv with no other side, WaitGroup counter goes negative.

## pprof quick reference

Enable endpoint (dev/staging only — add auth in prod):
```go
import _ "net/http/pprof"
go http.ListenAndServe(":6060", nil)
```

Capture profiles:
```sh
# CPU (30s)
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30

# Heap
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap

# Goroutines
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/goroutine

# Mutex contention (requires runtime.SetMutexProfileFraction(1))
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/mutex
```

Compare heap snapshots to isolate a leak:
```sh
go tool pprof -base base.pb.gz current.pb.gz
```

## Delve (breakpoint debugging)

```sh
dlv test ./internal/mypackage -- -test.run TestMyCase
dlv attach <pid>
```

Useful commands: `b main.go:42`, `c`, `n`, `s`, `p myVar`, `goroutines`,
`goroutine <id> bt`.

## GODEBUG tracing

```sh
GODEBUG=gctrace=1 ./app          # GC pause frequency and size
GODEBUG=schedtrace=1000 ./app    # scheduler events every 1s
GODEBUG=asyncpreemptoff=1 ./app  # disable async preemption (debugging only)
```

Escape analysis (find unintended heap allocations):
```sh
go build -gcflags="-m=2" ./... 2>&1 | grep "escapes to heap"
```

## Test-driven debugging

Write the failing test first — minimal reproducer, prevents regression.
Flaky test? `-count=100 -race` amplifies; `goleak.VerifyNone(t)` for leaks.

## Production & hygiene

- Use `slog` in prod — never `fmt.Println`. Check logs before attaching a profiler.
- pprof behind auth only (mTLS / internal network). Capture at the moment of the symptom.
- Set `GOTRACEBACK=all` in the systemd unit or pod spec, not in code.
- Never `recover` panics you don't understand; never disable `-race` to pass tests.
- Never scatter nil guards — find why nil appears.

## Verify

```sh
go test -race ./...
go vet ./...
golangci-lint run
```

