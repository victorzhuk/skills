---
name: z-go-concurrency
description: "Coordinate goroutines, channels, ownership, and cancellation. Use for errgroup, WaitGroup, worker pools, timers, singleflight, and leak checks. See [[z-go-context]] for context propagation."
---

# Go Concurrency

Give each goroutine an owner, a stop condition, and a completion signal.

## Principles

Prefer independent state when the behavior allows it. Document the ownership or synchronization protocol for shared state.

1. Decide whether the work can run synchronously. If it needs a goroutine, identify who joins it.
2. Select exclusive transfer, immutable sharing, or synchronized mutation. Sending a slice, map, or pointer can share underlying storage.
3. After transferring mutable data, wait for ownership to return before accessing it again.
4. Assign one closer to each channel. Join all senders before closing. `sync.Once` alone cannot prevent a send during close.
5. Restrict channel direction in signatures with `chan<-` or `<-chan`.
6. Select a buffer capacity from the intended backpressure. An unbuffered channel synchronizes each send with a receive.
7. Include cancellation in operations that must unblock. A ready `ctx.Done()` case has no priority over another ready case.
8. Reuse timers if repeated allocation matters. Check the module's timer semantics before selecting a reset protocol.

## Channel state and visibility

- A nil channel blocks both sends and receives. Set a local input to nil to disable its `select` case.
- A closed, drained channel stays ready and returns zero values. Check `ok` on receive. Return or disable the input when it closes.
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
| Independent counters or flags | `sync/atomic` | Measure contention |
| Write-once, read-many or disjoint-key maps | `sync.Map` | Prefer a typed map and lock for general use |
| Cache stampede prevention | `x/sync/singleflight` | Deduplicates in-flight calls |
| Caching an expensive init | `sync.Once` | Execute once, safe for concurrent callers |

## WaitGroup vs errgroup

| Need | Use |
|---|---|
| Wait for completion, no error collection | `sync.WaitGroup` |
| Collect first error | `errgroup.Group` |
| Cancel siblings on first error | `errgroup.WithContext` |
| Bounded concurrency | `errgroup.SetLimit(n)` |

`errgroup.Group.Go` accepts `func() error`. `Wait` returns the first non-nil error after all group functions finish.

From Go 1.25, `wg.Go(f)` starts and tracks a function that must not panic. Register new work before waiting on an empty group. Reuse the group after previous waits return.

## Sync Primitives

| Primitive | Key rule |
|---|---|
| `sync.Mutex` | Keep the protected operation short. Move I/O outside the lock when the invariant permits it. |
| `sync.RWMutex` | Never upgrade `RLock` → `Lock` (deadlock) |
| `sync/atomic` | Prefer typed: `atomic.Int64`, `atomic.Bool` (Go 1.19+) |
| `sync.Map` | Coordinate invariants spanning multiple operations. |
| `sync.Pool` | Release aliases before `Put`. Reset objects before reuse. Entries can disappear at any time. |
| `sync.Once` | Go 1.21+: `OnceFunc`, `OnceValue`, `OnceValues` |

Keep synchronization values at stable addresses after first use. Copies can occur through structs, range variables, receivers, or channel sends. See [[z-go-modernize]].

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

Give each service its own `singleflight.Group`. Do not copy it after first use. Include all result-dependent inputs in the key, including tenant or authorization scope.

Give shared work a service-owned context. Derive its deadline from the dependency contract. Cancel it when the service stops.

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

`DoChan` lets one caller stop waiting while the shared load continues. Register work before starting it. At shutdown, close admission and cancel the service context. Wait for all loads before closing the repository. A timeout cannot stop code that ignores cancellation. Calling `Forget` on waiter cancellation permits a second concurrent load. Test both waiters and shutdown during a load.

### Fan-out / fan-in

- Fan-out: start a bounded number of workers reading from the input, each owning its output channel.
- Select on `ctx.Done()` for both input receives and output sends. A bare range over an open, idle input cannot observe cancellation.
- Fan-in: give each upstream a forwarding goroutine with the same receive/send cancellation guards.
- Each worker closes its own output on exit. Wait for all forwarding goroutines before closing the merged output.

### Timer reuse in hot loop

Go 1.23 timer semantics allow collection of unreachable timers and prevent stale channel readings after `Stop` or `Reset`. Compatibility settings can retain earlier behavior in Go 1.23–1.26. Go 1.27 removed `asynctimerchan`. Reuse a timer to reduce allocations. This loop resets the timer after reading its previous tick.

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

## Do not

- Call `wg.Add` inside the new goroutine. The caller can reach `Wait` first.
- Close a channel while a sender may still use it.
- Access transferred mutable data concurrently without synchronization.
- Upgrade `RLock` to `Lock` — deadlock.
- Rely on `len(ch)` to predict whether a later send or close is safe.
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

## Checks

```sh
timeout 5m go test -race -timeout 2m -p 2 -parallel 2 ./...
golangci-lint run ./...
```

Exercise closed input, cancellation while blocked, and sender completion before close. A passing race check does not prove liveness.

For singleflight, test that duplicate keys share work within the intended scope
and that independent service instances or tenants cannot share results.

## Sources

- [Go101: channels](https://go101.org/article/channel.html), [channel closing](https://go101.org/article/channel-closing.html), [common concurrency mistakes](https://go101.org/article/concurrent-common-mistakes.html).
- [Go memory model](https://go.dev/ref/mem), [select semantics](https://go.dev/ref/spec#Select_statements), [timer compatibility](https://go.dev/doc/godebug).
- [Google Go best practices: global state](https://google.github.io/styleguide/go/best-practices.html#global-state).
