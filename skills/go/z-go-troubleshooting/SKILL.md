---
name: z-go-troubleshooting
description: "Debug Go crashes, hangs, races, leaks, and latency. Use for race reports, goroutine dumps, Delve, or pprof. See [[z-go-performance]] to interpret profiles."
---

# Go troubleshooting

## Reproduce the failure

1. Capture the error, stack, inputs, and affected build.
2. Find the smallest repeatable check through the affected interface. Use a unit test, integration test, or scripted command.
3. For regressions, use `git bisect` when you have a known working revision.
4. If reproduction requires a live service, collect bounded logs, traces, or profiles during the failure.
5. Change one condition at a time. Compare the result with the original failure.

## Decision tree

| Symptom | First move |
|---|---|
| Build fails | `go build ./... 2>&1`, then `go vet ./...` |
| Wrong output | Reproduce the observed value. Check error handling and boundary inputs. |
| Panic / crash | `GOTRACEBACK=all ./app`, read the full stack |
| Flaky / race | `timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...` |
| Hang | `curl 'http://127.0.0.1:6060/debug/pprof/goroutine?debug=2'` on the diagnostic listener |
| High CPU | pprof CPU profile → flamegraph |
| Memory growing | pprof heap profile (`allocs` vs `inuse_space`) |
| High p99 latency | mutex + block + goroutine profiles together |

## Common Go bug patterns

**Nil pointer / typed-nil interface trap**
```go
var p *MyType = nil
var i MyInterface = p  // i != nil — interface has non-nil type
```
A nil pointer stored in an interface retains its concrete type. Return an explicit `nil` interface when the result is absent. See [[z-go-safety]].

**Variable shadowing**
```go
x, err := foo()
if err != nil {
    x, err := bar()  // new x, err — outer x unchanged
    _ = x
}
```
Use `=` to assign the existing variable.

**Goroutine leak.** Call the cancel function when its owning operation ends. Check goroutine stacks for blocked workers. See [[z-go-testing]] for leak checks in parallel suites.

**Slice aliasing.** `b := a[:2]` shares its backing array with `a`. An append can overwrite `a[2]`. Copy with `b = append([]int(nil), a[:2]...)` when the caller needs independent storage.

**Concurrent map access.** Unsynchronized reads and writes can terminate the process with a fatal runtime error. Protect the map or give it one owner. The race detector reports races only on executed paths. [Race detector](https://go.dev/doc/articles/race_detector)

**Missing errors.** Check each error at its owner. Wrap it with `%w` when callers need its identity. See [[z-go-errors]].

**Deferred cleanup.** A deferred call runs when the containing function returns. Give each iteration a function scope when cleanup must occur before the next iteration.

## Race conditions and deadlocks

```sh
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...
GORACE="log_path=/tmp/race" timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...
```

For a running service with an accessible diagnostic endpoint:
```sh
curl 'http://localhost:6060/debug/pprof/goroutine?debug=2'
```

The default `SIGABRT` handler prints stacks and terminates the process. Use it only with authorization to terminate the process.

For a deadlock, inspect cycles in lock acquisition and blocked channel operations. A negative `sync.WaitGroup` counter causes a panic.

## pprof quick reference

Use an existing private diagnostic listener. For a local service, register these handlers on a dedicated mux. Importing `net/http/pprof` also registers routes on `http.DefaultServeMux`. Give the public server its own mux.

```go
func serveProfiles() error {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /debug/pprof/", pprof.Index)
    mux.HandleFunc("GET /debug/pprof/profile", pprof.Profile)
    server := &http.Server{
        Addr:              "127.0.0.1:6060",
        Handler:           mux,
        ReadHeaderTimeout: 5 * time.Second,
    }
    return server.ListenAndServe()
}
```

The route patterns require Go 1.22 or later. Handle the returned server error in the caller. [HTTP profiling](https://pkg.go.dev/net/http/pprof)

Capture profiles:
```sh
# CPU (30s)
go tool pprof -http=127.0.0.1:8080 'http://127.0.0.1:6060/debug/pprof/profile?seconds=30'

# Heap
go tool pprof -http=127.0.0.1:8080 http://127.0.0.1:6060/debug/pprof/heap

# Goroutines
go tool pprof -http=127.0.0.1:8080 http://127.0.0.1:6060/debug/pprof/goroutine

# Enable mutex sampling with a positive runtime.SetMutexProfileFraction value.
go tool pprof -http=127.0.0.1:8080 http://127.0.0.1:6060/debug/pprof/mutex
```

Compare heap snapshots to isolate a leak:
```sh
go tool pprof -base base.pb.gz current.pb.gz
```

## Delve (breakpoint debugging)

```sh
dlv test ./internal/mypackage -- -test.run TestMyCase
dlv attach "${TARGET_PID:?set TARGET_PID to the process ID}"
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

## Check the fix

- Run the agreed regression check against the original build and the build with the fix. Require the expected failure and success.
- Repeat intermittent cases within the project's test budget.
- Capture profiles only through an authorized diagnostics interface.
- Trace unexpected nil values and panics to their source before changing error handling.

### Project checks

```sh
timeout 5m go test -parallel 4 -p 2 -race -timeout 5m ./...
go vet ./...
golangci-lint run
```

