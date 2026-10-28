---
name: z-go-concurrency
description: >
  Goroutines, channels, sync primitives, worker pools, and pipeline patterns for
  production Go. Triggers on "goroutine leak", "errgroup", "singleflight",
  "sync.Mutex", "worker pool", "channel ownership". Does not cover context
  propagation; see [[z-go-context]]. Does not cover leak-detection tooling; see
  [[z-go-troubleshooting]].
---

# Go Concurrency

Every goroutine is a liability until proven necessary. Correctness and leak-freedom first.

## Principles

Before adding synchronization, check whether workers can own independent state without changing the required behavior. Separate state when sharing serves no required purpose. When the contract requires shared state, preserve it and coordinate updates under an explicit ownership protocol.

1. Give every goroutine an exit condition and an owner that waits for completion. A WaitGroup joins work; it does not cancel or unblock it.
2. Channel sends copy values, not referenced data. Choose exclusive ownership transfer, immutable sharing, or synchronized mutation.
3. Pointer payloads are valid under that protocol. Copied slices, maps, and pointer-bearing structs still share storage; the sender must stop accessing transferred mutable data until ownership returns.
4. Assign one closer. Close only after all possible sends finish; with multiple senders, join them before closing. `sync.Once` prevents duplicate closes, not send/close races.
5. Specify channel direction (`chan<-`, `<-chan`) — compiler prevents misuse.
6. Default to unbuffered channels; buffers mask backpressure.
7. Guard channel operations that must unblock on cancellation with `ctx.Done()`. A ready cancellation case has no priority over other ready cases.
8. Reuse timers when repeated `time.After` allocations matter; check effective timer semantics before choosing a reset/drain protocol.

## Channel state and visibility

- A nil channel blocks sends and receives; setting a local input to `nil` disables its `select` case.
- A closed, drained channel stays ready and yields zero values. Check `ok`; return at stream end or disable that input in a multiplexing loop.
- `select` evaluates channel operands and send values before choosing a case. `case out <- expensive()` runs `expensive()` even if cancellation or `default` wins.
- A send synchronizes before completion of its matching receive. Closing synchronizes before a receive that observes closure (`ok == false`), not merely a receive of earlier buffered data. An unbuffered receive also synchronizes before completion of its matching send.
- Goroutine exit, `time.Sleep`, and `runtime.Gosched` do not join work or establish visibility. Use a channel, lock, WaitGroup, or documented atomic protocol.
- Atomics do not make a compound invariant atomic. Publishing a pointer atomically does not protect later mutations of its pointee.

## Channel vs Mutex vs Atomic

| Scenario | Primitive | Why |
|---|---|---|
| Passing data between goroutines | channel | Handoff under an explicit ownership protocol |
| Goroutine lifecycle / signals | channel + context | Clean shutdown via select |
| Protecting shared struct fields | `sync.Mutex` / `sync.RWMutex` | Simple critical sections |
| Independent counters, flags | `sync/atomic` | Atomic access; measure contention and cost |
| Write-once/read-many or disjoint-key map access | `sync.Map` | Specialized workloads; default to typed map + lock |
| Cache stampede prevention | `x/sync/singleflight` | Deduplicates in-flight calls |
| Caching an expensive init | `sync.Once` | Execute once, safe for concurrent callers |

## WaitGroup vs errgroup

| Need | Use |
|---|---|
| Wait for completion, no error collection | `sync.WaitGroup` |
| Collect first error | `errgroup.Group` |
| Cancel siblings on first error | `errgroup.WithContext` |
| Bounded concurrency | `errgroup.SetLimit(n)` |

`errgroup.Group.Go(func() error { ... })` — no manual Add/Done; first non-nil error is returned by `Wait`. This signature has always been `func() error`; nothing about it is Go-version-gated.

Go 1.25+: `wg.Go(f)` starts and tracks a task; `f` must not panic. Start tasks before `Wait` when the group is empty. Reuse a group for independent work only after previous `Wait` calls return. With manual `Add`/`Done`, register work before starting its goroutine.

## Sync Primitives

| Primitive | Key rule |
|---|---|
| `sync.Mutex` | Never hold across I/O; keep critical sections short |
| `sync.RWMutex` | Never upgrade `RLock` → `Lock` (deadlock) |
| `sync/atomic` | Prefer typed: `atomic.Int64`, `atomic.Bool` (Go 1.19+) |
| `sync.Map` | Individual operations are safe; multi-operation invariants need coordination |
| `sync.Pool` | Release aliases before `Put`; reset before reuse; entries may disappear at any time |
| `sync.Once` | Go 1.21+: `OnceFunc`, `OnceValue`, `OnceValues` |

Do not copy locks, WaitGroups, Once/Pool/Map values, or typed atomics after first use, including through containing structs, value receivers, range values, and channel sends. Keep them at stable addresses. Go 1.22 loop declarations can introduce implicit copies; see [[z-go-modernize]].

## Common Patterns

### Goroutine with clean exit

```go
func (w *Worker) run(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case item, ok := <-w.queue:
            if !ok {
                return
            }
            w.process(item)
        }
    }
}
```

### errgroup with bounded workers

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)
for _, item := range items {
    g.Go(func() error {
        return process(ctx, item)
    })
}
if err := g.Wait(); err != nil {
    return fmt.Errorf("process batch: %w", err)
}
```

### singleflight — cache stampede prevention

Store `sf singleflight.Group` on each `Service`, alongside its repository; do not
share a package-level group across independent service instances or copy the
service after first use. An ID-only key is valid only when the result depends
solely on that ID within the instance. Include tenant, authorization, or other
result-affecting scope in an unambiguous key when those vary per call.

Pass a service-owned `workCtx` separately from each caller's `ctx`. All calls
on the instance share that work lifetime; derive it at application startup and
cancel it during owned shutdown. The example uses a five-second source budget;
choose the bound from the dependency contract.

```go
func (s *Service) fetchUser(ctx, workCtx context.Context, id string) (*User, error) {
    if err := ctx.Err(); err != nil {
        return nil, err
    }
    result := s.sf.DoChan(id, func() (any, error) {
        const loadTimeout = 5 * time.Second
        loadCtx, cancel := context.WithTimeout(workCtx, loadTimeout)
        defer cancel()
        return s.repo.GetUser(loadCtx, id)
    })
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    case r := <-result:
        if r.Err != nil {
            return nil, fmt.Errorf("fetch user: %w", r.Err)
        }
        return r.Val.(*User), nil
    }
}
```

`DoChan` lets a caller stop waiting; it does not cancel or join the shared load.
Keep shared work registered with the application's existing work owner before
it can start. On shutdown, close admission, cancel `workCtx`, and join all loads
before closing the repository. A timeout cannot stop a dependency that ignores
cancellation. Do not call `Forget` when one waiter cancels: that permits a second
load while the first is still running. Test leader and follower cancellation
independently, plus service shutdown during a load.

### Fan-out / fan-in

- Fan-out: start a bounded number of workers reading from the input, each owning its output channel.
- Select on `ctx.Done()` for both input receives and output sends. A bare range over an open, idle input cannot observe cancellation.
- Fan-in: give each upstream a forwarding goroutine with the same receive/send cancellation guards.
- Each worker closes its own output on exit. Close the merged output only after all forwarding goroutines have joined.

### Timer reuse in hot loop

With Go 1.23 timer semantics, unreachable timers can be collected before expiry; channel `Stop`/`Reset` exclude stale notifications. Go 1.23–1.26 can retain legacy behavior through the main module's version or `GODEBUG` compatibility settings; Go 1.27 removed `asynctimerchan`. Reuse avoids repeated allocations, rather than fixing a universal timer leak. The loop below resets only after consuming the previous tick.

```go
t := time.NewTimer(interval)
defer t.Stop()
for {
    select {
    case <-ctx.Done():
        return
    case <-t.C:
        work()
        t.Reset(interval)
    }
}
```

## Goroutine spawn checklist

Before every `go func`:
- [ ] How does it exit? (context, channel close, done signal)
- [ ] Can it be signalled to stop?
- [ ] Is something waiting for it? (WaitGroup / errgroup)
- [ ] Who owns the channels it uses?
- [ ] Should this be synchronous instead?

## Do not

- `wg.Add` inside the goroutine — `Wait` may return before `Add` is called.
- Close a channel while a sender may still use it.
- Access transferred mutable data concurrently without synchronization.
- Upgrade `RLock` to `Lock` — deadlock.
- Treat `len(ch)` or an "is closed" probe as permission to send or close; state can change immediately.
- Leave `select` without `ctx.Done()` in goroutines that run until cancellation.
- Spawn goroutines without a bound — use `errgroup.SetLimit(n)` or a semaphore.

## Leak detection

```go
// go.uber.org/goleak — add to TestMain
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

```sh
timeout 5m go test -race -timeout 2m -p 2 -parallel 2 ./...
runtime.NumGoroutine()           # runtime count
curl http://localhost:6060/debug/pprof/goroutine?debug=2  # stack dump
```

## Verify

```sh
timeout 5m go test -race -timeout 2m -p 2 -parallel 2 ./...
golangci-lint run ./...
```

Prefer the project's bounded test target. Exercise closed input, cancellation while blocked, and sender completion before close; the race detector alone does not prove liveness.

For singleflight, verify that duplicate keys share work within the intended scope
and that independent service instances or tenants cannot share results.

## Sources

- [Go101: channels](https://go101.org/article/channel.html), [channel closing](https://go101.org/article/channel-closing.html), [common concurrency mistakes](https://go101.org/article/concurrent-common-mistakes.html).
- [Go memory model](https://go.dev/ref/mem), [select semantics](https://go.dev/ref/spec#Select_statements), [timer compatibility](https://go.dev/doc/godebug).
- [Google Go best practices: global state](https://google.github.io/styleguide/go/best-practices.html#global-state).
