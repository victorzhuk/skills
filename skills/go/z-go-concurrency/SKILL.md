---
name: z-go-concurrency
description: >
  Goroutines, channels, sync primitives, worker pools, and pipeline patterns for production Go.
  Use when writing or reviewing concurrent code — goroutine lifecycle, channel ownership,
  errgroup, singleflight, fan-out/fan-in, or race-condition audits. Triggers on
  "goroutine leak", "errgroup", "singleflight", "sync.Mutex", "sync.Pool", "worker pool",
  "fan-out", "select ctx.Done", "go func", "channel ownership".
  Does not cover context propagation rules; see [[z-go-context]].
  Does not cover goroutine leak detection tooling; see [[z-go-troubleshooting]].
---

# Go Concurrency

Every goroutine is a liability until proven necessary. Correctness and leak-freedom first.

## Principles

1. Every goroutine must have a clear exit — context, done channel, or WaitGroup.
2. Share memory by communicating; channels transfer ownership. Mutexes protect shared state.
3. Send copies, not pointers on channels — pointers create invisible shared memory.
4. Only the sender closes a channel — receiver close panics if sender writes after.
5. Specify channel direction (`chan<-`, `<-chan`) — compiler prevents misuse.
6. Default to unbuffered channels; buffers mask backpressure.
7. Always include `ctx.Done()` in `select` — omitting it leaks goroutines on cancellation.
8. Never use `time.After` in hot loops — reuse `time.NewTimer` + `Reset`.

## Channel vs Mutex vs Atomic

| Scenario | Primitive | Why |
|---|---|---|
| Passing data between goroutines | channel | Explicit ownership transfer |
| Goroutine lifecycle / signals | channel + context | Clean shutdown via select |
| Protecting shared struct fields | `sync.Mutex` / `sync.RWMutex` | Simple critical sections |
| Counters, flags | `sync/atomic` | Lock-free, lower overhead |
| Read-heavy concurrent map | `sync.Map` | Optimized for high read/low write |
| Cache stampede prevention | `x/sync/singleflight` | Deduplicates in-flight calls |
| Caching an expensive init | `sync.Once` | Execute once, safe for concurrent callers |

## WaitGroup vs errgroup

| Need | Use |
|---|---|
| Fire-and-forget, no errors | `sync.WaitGroup` |
| Collect first error | `errgroup.Group` |
| Cancel siblings on first error | `errgroup.WithContext` |
| Bounded concurrency | `errgroup.SetLimit(n)` |

`errgroup.Group.Go(func() error { ... })` — no manual Add/Done; first non-nil error is returned by `Wait`. This signature has always been `func() error`; nothing about it is Go-version-gated.

## Sync Primitives

| Primitive | Key rule |
|---|---|
| `sync.Mutex` | Never hold across I/O; keep critical sections short |
| `sync.RWMutex` | Never upgrade `RLock` → `Lock` (deadlock) |
| `sync/atomic` | Prefer typed: `atomic.Int64`, `atomic.Bool` (Go 1.19+) |
| `sync.Map` | No explicit locking; use `RWMutex`+map when writes dominate |
| `sync.Pool` | Always `Reset()` before `Put()`; reduces GC pressure |
| `sync.Once` | Go 1.21+: `OnceFunc`, `OnceValue`, `OnceValues` |

## Common Patterns

### Goroutine with clean exit

```go
func (w *Worker) run(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case item := <-w.queue:
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

```go
var sf singleflight.Group

func (s *Service) fetchUser(ctx context.Context, id string) (*User, error) {
    v, err, _ := sf.Do(id, func() (any, error) {
        return s.repo.GetUser(ctx, id)
    })
    if err != nil {
        return nil, fmt.Errorf("fetch user: %w", err)
    }
    return v.(*User), nil
}
```

### Fan-out / fan-in

```go
// fanOut: spawn n workers reading from in; each gets its own output channel.
// Each goroutine: defer close(ch), for item := range in { select ch<-/ctx.Done }.
// merge: one goroutine per upstream channel draining → out with ctx.Done guard;
// WaitGroup closes out when all upstreams finish.
```

### Timer reuse in hot loop

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
- Close a channel from the receiver side.
- Send pointers on channels when the goroutine on the other end writes to them.
- Upgrade `RLock` to `Lock` — deadlock.
- Use `time.After` in loops — a timer is allocated and never collected until it fires.
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
go test -race ./...
runtime.NumGoroutine()           # runtime count
curl http://localhost:6060/debug/pprof/goroutine?debug=2  # stack dump
```

## Verify

```sh
go test -race ./...
golangci-lint run ./...
```
