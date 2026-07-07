---
name: z-go-caching
description: Redis caching and rate limiting for Go — cache-aside (read-through, delete-on-write invalidation, TTL jitter), singleflight before a distributed lock, fail-open on outages, and atomic INCR+EXPIRE or Lua token-bucket limiting over racy GET-then-SET. Use when adding a cache layer or choosing go-redis vs rueidis. Triggers on "cache-aside", "singleflight", "INCR+EXPIRE", "token-bucket". Not CDN/HTTP caching; DB is [[z-go-database]], concurrency [[z-go-concurrency]], metrics [[z-go-observability]].
---

# Go caching

Cache is an optimization on top of a source of truth, never a second source of truth. Every pattern below exists to protect that invariant under real failure: Redis down, two thousand goroutines missing the same key at once, a write racing an invalidation.

## Client choice

| | go-redis v9 (`redis/go-redis`) | rueidis (`redis/rueidis`) |
|---|---|---|
| API shape | idiomatic per-command methods — `rdb.Get(ctx, key)` | fluent command builder — `client.B().Get().Key(k).Build()` |
| Pipelining | opt-in, explicit `Pipeline()` / `TxPipeline()` | automatic for concurrent calls, no code change |
| Client-side caching | not built in | opt-in server-assisted caching via `DoCache(ctx, cmd, ttl)` |
| Ecosystem | largest — most examples, `redisotel` OTel bridge, every tutorial assumes it | newer, both maintained under the `redis` GitHub org, growing fast |
| Default | reach for this first | reach for this once auto-pipelining or client-side caching removes a *measured* bottleneck a profiler pointed at |

Both are maintained by the Redis org now — this isn't a "official vs community" choice, it's ubiquity vs throughput headroom. Don't switch clients speculatively; go-redis's synchronous per-command API is easier to read in a code review and matches what the rest of the team already knows.

## Cache-aside is the default pattern

Read-through on miss, delete on write. No write-through, no cache warm-up job, no separate write path into the cache — one shape to reason about.

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
        s.redis.Set(ctx, key, data, ttlWithJitter(5*time.Minute))
    }
    return p, nil
}
```

`err == nil` is the only branch that trusts the cache. Any other outcome — miss, timeout, malformed payload — falls through to `s.repo`, the source of truth. See [[z-go-database]] for that side.

### Write-side invalidation: delete, never update-in-place

```go
func (s *Store) UpdatePlan(ctx context.Context, p *Plan) error {
    if err := s.repo.UpdatePlan(ctx, p); err != nil {
        return fmt.Errorf("update plan: %w", err)
    }
    if err := s.redis.Del(ctx, planKey(p.ID)).Err(); err != nil {
        s.log.WarnContext(ctx, "cache invalidate failed", "key", p.ID, "err", err)
    }
    return nil
}
```

`DEL` after the write commits, not `SET` with the new value. Writing the new value into the cache duplicates the serialization logic in a second place and — if the DB write later rolls back or a concurrent writer wins — can leave a cache entry that never actually existed in the source of truth. A missing key is always safe; a wrong value isn't. Worst case with delete-on-write is one extra read-through; that's the cost of correctness.

### TTL always, jittered

```go
func ttlWithJitter(base time.Duration) time.Duration {
    return base + time.Duration(rand.IntN(int(base/10)))
}
```

`rand.IntN` is from `math/rand/v2` (Go 1.22+) — the old `math/rand` package has a same-arity `Intn` (lowercase n) that's easy to reach for by habit instead.

No immortal keys, including "static" reference data — schema changes and forgotten invalidation paths both need a key to eventually die on its own. A flat TTL across every key of the same type means they all expire in the same second under steady traffic, and that second becomes a stampede; jitter spreads the expiry.

## Stampede protection

### singleflight first

A cold key under load means N concurrent requests per instance all miss at once and all hit the source of truth — across a fleet of M instances that's M×N total load on it. Collapse that in-process before reaching for anything distributed — see [[z-go-concurrency]] for the mechanics:

```go
v, err, _ := s.sf.Do(id, func() (any, error) {
    return s.loadPlan(ctx, id) // the read-through function above, minus the outer cache check
})
```

`singleflight.Group` dedupes callers within one process, so a fleet of instances still sends up to one load per instance to the database on a cold key — that's the M×N problem shrinking to just M, one load per instance, and M is normally something the database already survives.

### Distributed lock — rarely earned

Reach for a cluster-wide lock only when both hold: the recompute is expensive enough that M-instances-worth of concurrent load could actually hurt the source of truth, and the result can't tolerate the extra latency of the lock round trip. That's an infrequent combination — most stampedes die at singleflight.

When it's genuinely earned, use `SET key token NX PX ttl` as the lock primitive (never a bare `GET` then `SET` — that's the same race rate limiting must avoid), and release with a Lua script that compares the token before deleting, not a blind `DEL`:

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

A blind `DEL` on unlock can release a lock some other holder acquired after your own TTL expired. This adds real failure modes — stuck locks on crash, clock skew changing effective TTL — that singleflight doesn't have. Don't add it until singleflight has actually proven insufficient under measured load.

## What to cache, what never to

| Cache | Never cache |
|---|---|
| Read-heavy reference data (excursion listings, pricing tiers) | Authorization decisions — a stale grant is a security bug, not a performance win |
| Computed aggregates (search facets, popularity ranks) | Money: balances, order totals, payment state — correctness beats latency here |
| Expensive joins/rollups pulled from Postgres or ClickHouse | Anything the caller needs strict read-your-writes on without an explicit invalidation path |
| Anything that tolerates seconds of staleness | Per-request or single-use data — the round trip to Redis costs more than it saves |

## Serialization

JSON via `encoding/json` by default — debuggable straight out of `redis-cli`, no schema registry to coordinate across services. Reach for msgpack or protobuf only once profiling shows JSON encode/decode CPU or payload size is the actual bottleneck; the network round trip to Redis dwarfs JSON's marshal cost in almost every real workload.

## Fail-open discipline

Redis is an optimization, not a dependency. A Redis outage must degrade to source-of-truth reads, never take the service down.

- Give every Redis call a short, explicit timeout distinct from the request's own deadline (the `cctx` in the read-through example). Tens of milliseconds, not the request's full budget.
- Treat any Redis error — timeout, connection refused, context deadline exceeded — as a cache miss, not a request failure. Fall through to the repository.
- Configure the client's own dial/read/write timeouts short. A real outage should show up as elevated database load and latency, never as elevated error rate.
- Skip a circuit breaker on the cache path by default — a bounded per-call timeout plus treat-error-as-miss already caps the blast radius. Add a breaker only once a real incident showed fast-timeout floods needing one; don't build it "just in case."

## Rate limiting

Never `GET` the counter, compare in application code, then `SET` or `INCR` — two round trips with a gap between them means two concurrent requests can both read "under limit" and both pass. Every option below does the check-and-increment as one atomic server-side operation.

### Fixed window: Lua-wrapped INCR+EXPIRE

```lua
local n = redis.call("INCR", KEYS[1])
if n == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return n
```

```go
var incrExpire = redis.NewScript(`
local n = redis.call("INCR", KEYS[1])
if n == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return n
`)

n, err := incrExpire.Run(ctx, rdb, []string{key}, windowMs).Int64()
if err != nil {
    return true, nil // Redis unreachable — see fail-open discipline below before copying this line
}
allowed := n <= limit
```

Fail-open here is the default: it favors availability and matches the fail-open discipline the rest of this skill applies to the cache path. Reach for fail-closed, or a local in-process fallback limiter, when the limit itself is the security control — auth attempts, signup, password reset, any abuse/DDoS-facing limit where letting a flood through during a Redis blip is worse than the added latency or false rejections of failing closed.

The `EXPIRE` only fires on the first increment of the window, so it can't be reset by every subsequent hit. A lighter, race-tolerant variant skips the script and pipelines `Incr` with `ExpireNX` (Redis 7+, only sets a TTL if the key has none) in one round trip — accept that as good enough when the window boundary being off by a request or two doesn't matter.

### Token bucket: Lua for the read-modify-write

Fixed windows allow bursts at the window edge; a token bucket smooths that at the cost of a slightly heavier script maintaining `tokens` and a timestamp in a hash, refilling by elapsed time on every call:

```lua
local capacity, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local b = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(b[1]) or capacity
local ts = tonumber(b[2]) or now
tokens = math.min(capacity, tokens + math.max(0, now - ts) * rate / 1000)
redis.call("PEXPIRE", KEYS[1], 3600000)
if tokens < cost then
  redis.call("HSET", KEYS[1], "tokens", tokens, "ts", now)
  return 0
end
redis.call("HSET", KEYS[1], "tokens", tokens - cost, "ts", now)
return 1
```

`now` (`ARGV[3]`) is passed in from the calling instance's clock. That's fine as long as every instance's clock is close enough to agree on refill amounts; if instances can run with skewed clocks, pull time from `redis.call("TIME")` inside the script instead of trusting the client — most single-region deployments never need this.

A CAS loop (`WATCH`/`MULTI`/`EXEC`) does the same thing at the cost of a dedicated connection and a retry-on-conflict loop — reach for it only when the team is avoiding Lua entirely (audit tooling, `EVAL` disabled by policy); otherwise the script is fewer moving parts.

## Hot keys and big keys

- **Hot key**: one key absorbing disproportionate traffic (a trending listing, a global counter) can saturate a single cluster shard even though aggregate cluster capacity is fine. Detect with `redis-cli --hotkeys` (needs an LFU `maxmemory-policy`) or per-key-*pattern* command metrics — never per literal key, that's unbounded cardinality. Fix by fronting the key with a short in-process cache (a few seconds is enough) before it reaches Redis at all, or sharding a counter into N sub-keys summed on read.
- **Big key**: a single key holding a multi-hundred-KB value blocks Redis's single-threaded command loop while it's read or written, and bloats replication traffic. Detect with `redis-cli --bigkeys`. Fix by splitting into multiple keys or storing the payload where it belongs — Postgres, ClickHouse, object storage — and caching a reference or a paginated slice instead of the whole blob.
- Never `KEYS *` in production; it's O(N) over the whole keyspace and blocks every other client while it runs. Use `SCAN` with a cursor.

## Key naming and versioned prefixes

Namespace every key: `<service>:<entity>:<id>` — `excursions:plan:8f21`, not `plan_8f21`. Keeps `SCAN`/`--bigkeys` output legible and stops collisions when several services share one Redis instance.

Bake a schema version into the prefix: `excursions:plan:v2:8f21`. Bump the version segment when the cached shape changes, and old-version keys just age out on their own TTL — no coordinated flush, no migration script, no risk of a stale-shaped value surviving a deploy. Never reuse a version segment for an incompatible shape; a rollback would then read the new shape as if it were the old one.

## Do not

- Update a cache entry in place on write — delete it and let the next read repopulate it.
- Ship a cache key without a TTL, including reference data that "never changes."
- Give every key of one type the same flat TTL with no jitter — that's a synchronized-expiry stampede waiting for steady traffic to trigger it.
- Reach for a distributed lock as the default stampede guard — try singleflight first; the lock adds failure modes (stuck locks, clock skew) that only pay for themselves against a load pattern singleflight has actually failed on.
- Cache authorization decisions or money balances/order totals.
- Check-then-act (`GET` then `SET`/`INCR`) for a rate limiter — do the increment and the limit decision atomically, in Lua or via a single pipelined round trip.
- Let a Redis timeout or connection error propagate into a request failure — every cache read/write path needs a fallback to the source of truth.
- Run `KEYS *` against a production instance, or store a value large enough to make `redis-cli --bigkeys` complain.
- Reach for msgpack/protobuf before a profiler has pointed at JSON serialization as the cost.

## Verify

```sh
redis-cli --bigkeys                 # oversized single-key values
redis-cli --hotkeys                 # requires an LFU maxmemory-policy
rg -n '\.Set\(ctx' --type go        # every cache Set carries an expiration argument
rg -n '\.Del\(ctx' --type go        # every write path that updates cached data also invalidates it
```

Kill the Redis connection in a local/staging environment and re-run the read path: requests should still succeed (elevated latency is fine, errors are not) — that's the fail-open contract proven, not assumed.
