---
name: z-go-caching
description: "Design Redis caches and rate limiters in Go. Use for cache-aside reads, invalidation, TTL jitter, singleflight, atomic counters, and token buckets. See [[z-go-database]] for authoritative storage."
---

# Go caching

Use Redis for data that can tolerate the documented staleness window. Keep an authoritative read path.

## Client choice

| | go-redis v9 (`redis/go-redis`) | rueidis (`redis/rueidis`) |
|---|---|---|
| API shape | idiomatic per-command methods — `rdb.Get(ctx, key)` | fluent command builder — `client.B().Get().Key(k).Build()` |
| Pipelining | opt-in, explicit `Pipeline()` / `TxPipeline()` | automatic for concurrent calls, no code change |
| Client-side caching | Experimental from v9.22.0. Requires RESP3. | Available through `DoCache(ctx, cmd, ttl)`. |

Keep the project's client unless a measured requirement justifies a change. Check server and client compatibility. [Redis client-side caching](https://redis.io/docs/latest/develop/clients/client-side-caching/)

## Cache-aside is the default pattern

Read from the authoritative store on a cache miss. Invalidate the key after a committed write.

### Read-through

```go
func (s *Store) GetPlan(ctx context.Context, id string) (*Plan, error) {
    key := planKey(id)

    cctx, cancel := context.WithTimeout(ctx, 50*time.Millisecond)
    b, err := s.redis.Get(cctx, key).Bytes()
    cancel()
    if err == nil {
        var p Plan
        if json.Unmarshal(b, &p) == nil {
            return &p, nil
        }
    }

    p, err := s.repo.GetPlan(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get plan: %w", err)
    }

    if data, err := json.Marshal(p); err == nil {
        cctx, cancel := context.WithTimeout(ctx, 50*time.Millisecond)
        err := s.redis.Set(cctx, key, data, ttlWithJitter(5*time.Minute)).Err()
        cancel()
        if err != nil {
            s.log.WarnContext(ctx, "cache populate failed", "err", err)
        }
    }
    return p, nil
}
```

Use the cached value only after a successful read and decode. See [[z-go-database]] for the repository fallback.

### Write-side invalidation: delete, never update-in-place

```go
func (s *Store) UpdatePlan(ctx context.Context, p *Plan) error {
    if err := s.repo.UpdatePlan(ctx, p); err != nil {
        return fmt.Errorf("update plan: %w", err)
    }
    cctx, cancel := context.WithTimeout(ctx, 50*time.Millisecond)
    defer cancel()
    if err := s.redis.Del(cctx, planKey(p.ID)).Err(); err != nil {
        s.log.WarnContext(ctx, "cache invalidate failed", "key", p.ID, "err", err)
    }
    return nil
}
```

An older read can populate a stale value after invalidation. Failed invalidation also leaves stale data until expiry.

Test that race against the permitted staleness window. For stronger guarantees, use a version check or bypass the cache.

### TTL always, jittered

```go
func ttlWithJitter(base time.Duration) time.Duration {
    if base <= 0 {
        panic("cache ttl must be positive")
    }
    jitter := base / 10
    if jitter == 0 {
        return base
    }
    return base + time.Duration(rand.Int64N(int64(jitter)))
}
```

`rand.Int64N` comes from `math/rand/v2` (Go 1.22+). Reject invalid TTLs during startup.

Use a finite TTL. Add jitter when many keys could expire together.

## Stampede protection

### singleflight first

Coalesce concurrent misses for the same key within each service instance.

Use the `DoChan` pattern in [[z-go-concurrency]] around `s.loadPlan(loadCtx, id)`. Give shared work a bounded service context. Let each caller cancel its own wait. Wait for loads before closing storage.

A cold key can still cause one load per instance. Measure the combined load on the source.

### Distributed lock — rarely earned

Consider a distributed lock when per-instance loads exceed the source's capacity and callers can tolerate coordination latency.

Acquire a lease with `SET key token NX PX ttl`. Release it only when its value still equals the owner's token.

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

A lease can expire while the owner is still working. A blind delete can then release another owner's lock.

## What to cache, what never to

| Cache | Never cache |
|---|---|
| Read-heavy reference data (excursion listings, pricing tiers) | Authorization decisions — a stale grant is a security bug, not a performance win |
| Computed aggregates (search facets, popularity ranks) | Money: balances, order totals, payment state — correctness beats latency here |
| Expensive joins/rollups pulled from Postgres or ClickHouse | Anything the caller needs strict read-your-writes on without an explicit invalidation path |
| Anything that tolerates seconds of staleness | Per-request or single-use data — the round trip to Redis costs more than it saves |

## Serialization

Start with the existing format. Change serialization only when measured latency, size, or compatibility requires it.

## Fail-open discipline

If cache access fails, read from the authoritative store within the remaining request budget.

- Bound Redis dial, read, and write timeouts separately from the total request.
- Treat malformed entries and cache timeouts as misses. Respect cancellation of the original request.
- Monitor database load during cache outages. Add a breaker or load shedding when the fallback cannot sustain expected traffic.

## Rate limiting

Update the counter, expiry, and admission decision atomically. Concurrent callers can otherwise admit more requests than the contract permits.

### Fixed window

```go
var incrExpire = redis.NewScript(`
local n = redis.call("INCR", KEYS[1])
if n == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return n
`)

func withinLimit(ctx context.Context, rdb *redis.Client, key string, windowMs, limit int64) (bool, error) {
    if windowMs <= 0 || limit < 0 {
        return false, errors.New("invalid rate limit")
    }
    n, err := incrExpire.Run(ctx, rdb, []string{key}, windowMs).Int64()
    if err != nil {
        return false, fmt.Errorf("rate limit: %w", err)
    }
    return n <= limit, nil
}
```

Choose the outage policy at the endpoint when the limiter returns an error. Distinguish an unavailable limiter from an exhausted limit.

Set the expiry on the first increment. Later hits must preserve the same window. A plain pipeline cannot guarantee atomicity.

### Atomic token bucket

A fixed window permits bursts near its boundary. A token bucket limits bursts according to capacity and refill rate.

```lua
local capacity, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
if not capacity or not rate or not now or not cost or capacity <= 0 or rate <= 0 or cost <= 0 or cost > capacity then
  return redis.error_reply("invalid bucket parameters")
end
local refill_ms = math.max(1, math.ceil(capacity / rate * 1000))
local b = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(b[1]) or capacity
local previous = tonumber(b[2]) or now
local ts = math.max(previous, now)
tokens = math.min(capacity, tokens + (ts - previous) * rate / 1000)
local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end
redis.call("HSET", KEYS[1], "tokens", tokens, "ts", ts)
redis.call("PEXPIRE", KEYS[1], refill_ms + ts - now)
return allowed
```

Pass time in integer milliseconds and rate in tokens per second. Restrict configuration to finite values that produce a supported Redis expiry. Use one clock across instances. Preserve the later timestamp if the clock moves backward.

A `WATCH`, `MULTI`, and `EXEC` transaction can replace Lua when scripting is unavailable. Bound retries on conflicts.

## Hot keys and big keys

- A hot key can saturate one shard. Check command frequency and the configured eviction policy before using `redis-cli --hotkeys`.
- Inspect large values with `redis-cli --bigkeys`. Measure encoded bytes and latency before splitting a key.
- Use cursor-based `SCAN` for production inspection. A full `KEYS` call can block other clients.

## Key naming and versioned prefixes

Namespace keys by service, entity, and identity. Include a version when the stored value format changes. Let old keys expire.

## Checks

```sh
redis-cli --bigkeys                 # oversized single-key values
redis-cli --hotkeys                 # requires an LFU maxmemory-policy
rg -n '\.Set\(ctx' --type go        # every cache Set carries an expiration argument
rg -n '\.Del\(ctx' --type go        # every write path that updates cached data also invalidates it
```

Admit the first valid request. Exhaust the bucket before testing rejection. Check positive expiry after both outcomes. Test refill, invalid parameters, and a backward clock step.

Simulate an unavailable cache against disposable state. Check authoritative reads, latency, and the endpoint's limiter outage policy.
