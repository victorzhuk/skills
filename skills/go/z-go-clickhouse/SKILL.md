---
name: z-go-clickhouse
description: ClickHouse analytics access from Go — append-only OLAP modeling, batch/async insert discipline, MergeTree engine selection. Use when writing ClickHouse queries, choosing between clickhouse-go and ch-go, or reading deduplicated data with FINAL/argMax. Triggers on "ClickHouse", "MergeTree", "ReplacingMergeTree", "async_insert", "LowCardinality". Does not cover Postgres/OLTP access; see [[z-go-database]].
---

# ClickHouse from Go

ClickHouse is append-only columnar OLAP, not a row store. Every habit carried over from Postgres costs correctness or throughput until unlearned.

## OLTP habits that don't transfer

| Postgres habit | ClickHouse reality |
|---|---|
| `UPDATE`/`DELETE` a row | `ALTER TABLE ... UPDATE/DELETE` is a heavyweight async mutation — it rewrites whole parts in the background, not a row-level op. Model changes as a new versioned row instead (`ReplacingMergeTree`). |
| Row-by-row `INSERT` in a request handler | Every `INSERT` creates a new part on disk. One insert per event outruns the background merge scheduler within minutes. Batch or use `async_insert`. |
| Multi-statement transaction | No cross-statement transactions, no row-level locks. Each inserted block is atomic on its own; that's the whole guarantee. |
| Point lookup on a B-tree PK | `ORDER BY` is a sparse primary index (one entry per 8192-row granule by default) — a "point lookup" still scans a granule, and only helps if the filtered column is a prefix of `ORDER BY`. |

For genuinely transactional, row-level, low-latency lookups keep that data in Postgres — see [[z-go-database]]. ClickHouse is for aggregation over large append-only fact tables (events, bookings history, pricing snapshots), not the system of record.

## Client choice: clickhouse-go vs ch-go

| | `clickhouse-go` v2 | `ch-go` |
|---|---|---|
| API shape | `database/sql`-ish plus a native `Conn`/`Batch` interface | low-level native protocol, columnar blocks |
| Built on | wraps `ch-go` for wire encode/decode (v2.3.x+) | — |
| Protocols | native TCP (9000) and HTTP (8123) | native TCP only |
| Use for | the default — repository queries, batch inserts, migrations, everything | max-throughput columnar ingest pipelines where profiling shows `clickhouse-go`'s row-oriented `Batch.Append` is the bottleneck |

Default to `clickhouse-go`'s native `Conn` (not the `database/sql` shim — same reasoning as pgx-first for Postgres: skip the generic interface, take the driver-specific one). Reach for `ch-go` directly only once a specific ingest path is measurably CPU- or GC-bound in `Append`/`AppendStruct` — most marketplace-scale event pipelines never get there.

## Batching inserts

```go
conn, err := clickhouse.Open(&clickhouse.Options{
    Addr: []string{"clickhouse:9000"},
    Auth: clickhouse.Auth{
        Database: "analytics",
        Username: "app",
        Password: password,
    },
})
if err != nil {
    return fmt.Errorf("open clickhouse: %w", err)
}

batch, err := conn.PrepareBatch(ctx, "INSERT INTO events (event_id, event_type, occurred_at, payload)")
if err != nil {
    return fmt.Errorf("prepare batch: %w", err)
}
defer batch.Close()

for _, e := range events {
    if err := batch.Append(e.ID, e.Type, e.OccurredAt, e.Payload); err != nil {
        return fmt.Errorf("append event %s: %w", e.ID, err)
    }
}
return batch.Send()
```

Batch at least 1,000 rows per `Send`, ideally 10,000–100,000 — each `Send` becomes one part; small batches multiply part-creation and merge pressure. `defer batch.Close()` before `Send` runs so a failed append doesn't leak the underlying connection. Never issue one `INSERT` per row from application code.

## Async inserts for many small writers

Use `async_insert` only when the caller genuinely can't batch client-side — many independent small producers (per-pod event taps, one row per request) where accumulating a slice yourself isn't practical. If you can hold a buffer and flush on a ticker, batch and use `PrepareBatch` instead; server-side buffering is a fallback, not the default.

```go
ctx = clickhouse.Context(ctx, clickhouse.WithAsync(true))
err := conn.Exec(ctx,
    "INSERT INTO events (event_id, event_type, occurred_at, payload) VALUES (?, ?, ?, ?)",
    e.ID, e.Type, e.OccurredAt, e.Payload,
)
```

`clickhouse.WithAsync(wait bool)` sets `async_insert=1` always, and `wait_for_async_insert` to the `wait` argument. `WithAsync(true)` acks only after ClickHouse flushes the buffer to disk — the durable, retry-safe choice. `WithAsync(false)` acks on buffering alone, before flush — fire-and-forget, never use it for data you can't afford to silently lose.

Server-side flush triggers, whichever fires first: `async_insert_max_data_size` (100 MiB default), `async_insert_busy_timeout_ms` (200 ms default, 1000 ms on ClickHouse Cloud, adaptive since 24.2), `async_insert_max_query_number` (450 queries default).

## Idempotent retries: insert_deduplication

Synchronous inserts dedup by default (`insert_deduplicate=1`): a retried block — same rows, same order, same size — is silently dropped, so a blind retry after a network timeout can't double-insert. This only holds if the retry resends byte-identical blocks; don't reshuffle or re-batch rows between attempts.

Set `insert_deduplication_token` explicitly when you want dedup identity you control (e.g. a Kafka partition+offset range) instead of a content hash — needed when block boundaries can vary between retries but the logical unit of work is the same.

Async inserts do **not** dedup by default (`async_insert_deduplicate=0`) — turn it on explicitly if retried async inserts must be idempotent, and don't pair it with a dependent materialized view (known gaps between async dedup and MV triggering).

## Schema modeling: pick the engine

| Engine | What merge does | Use for |
|---|---|---|
| `MergeTree` | nothing beyond sorting/compaction | the default — raw append-only fact table |
| `ReplacingMergeTree(ver)` | keeps one row per `ORDER BY` key (highest `ver`, or last-inserted without `ver`) | CDC-style upserts — latest booking status, latest price |
| `SummingMergeTree` | sums numeric columns outside `ORDER BY` for rows sharing a key | simple additive rollups (counts, totals) where a raw table already exists elsewhere |
| `AggregatingMergeTree` | merges `AggregateFunction` state columns (`-State`/`-Merge`) | pre-aggregating arbitrary functions (`uniq`, `quantile`, not just sums) — always fed via a materialized view |

`ReplacingMergeTree`/`SummingMergeTree`/`AggregatingMergeTree` only collapse rows **on merge**, which runs in the background at an unpredictable time — a query against unmerged parts still sees duplicates or partial sums. Keep the raw `MergeTree` table too if you can't tolerate that, and query it directly.

## ORDER BY and PARTITION BY

`ORDER BY` is the primary index — put the column most queries filter on first, and put low-cardinality columns before high-cardinality ones so early granules skip more data:

```sql
CREATE TABLE events
(
    event_id    UUID,
    event_type  LowCardinality(String),
    tenant_id   UInt32,
    occurred_at DateTime,
    payload     String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (event_type, tenant_id, occurred_at)
```

Filtering on `event_type` alone, or `event_type` + `tenant_id`, uses the index. Filtering on `tenant_id` alone (skipping the prefix) does not — it's a full scan.

Keep `PARTITION BY` coarse — by month (`toYYYYMM(...)`), not by day, and never day × tenant. Each distinct partition value is a separate physical part-set; partitioning by a high-cardinality combination explodes part count, slows merges, and bloats `system.parts` metadata. Cardinality that needs to be queried belongs in `ORDER BY`, not `PARTITION BY`.

## LowCardinality and Nullable

Wrap enum-like string columns — status, event type, country — in `LowCardinality(String)`: dictionary-encoded, far smaller on disk, faster to filter and `GROUP BY` than plain `String`. The default is `<10k` unique values; past that the dictionary itself gets expensive.

Avoid `Nullable(T)` when a sentinel works — `Nullable` adds a hidden null-map column per row and blocks some read optimizations. Default to a sentinel (`0`, `''`, `'unknown'`) and reserve `Nullable` for a dimension where a sentinel would corrupt an aggregate (e.g. a nullable discount that must not be confused with a zero discount).

## Reading the latest row: FINAL vs argMax

```sql
-- correct, but re-merges every touched part at query time — avoid on hot paths
SELECT booking_id, status FROM bookings FINAL WHERE booking_id = ?

-- same correctness, no merge cost
SELECT booking_id, argMax(status, version) AS status
FROM bookings
GROUP BY booking_id
```

`FINAL` is fine for small dimension tables or ad hoc debugging. On a hot aggregation path over a large `ReplacingMergeTree`, use `argMax(value, version_column)` with `GROUP BY` instead — same correctness, without forcing a merge per query.

## Query patterns: PREWHERE and materialized views

ClickHouse auto-promotes cheap, selective `WHERE` conditions to `PREWHERE` (`optimize_move_to_prewhere`, on by default) — it reads the filter columns, drops non-matching granules, then reads the rest of the row only for survivors. Manual `PREWHERE` is only worth writing once `EXPLAIN` shows the optimizer picked the wrong column to filter first.

Querying raw fact tables directly is the default. Reach for a materialized view over `AggregatingMergeTree` (or `SummingMergeTree`) once a specific dashboard query is measurably too slow against raw rows — the view computes on every `INSERT` into the source table, not on a schedule, trading write cost for read cost.

Events landing in ClickHouse from Kafka/RabbitMQ/NATS go through an ordinary consumer that batches and calls `PrepareBatch` like any other writer; see [[z-go-messaging]] for consumer patterns — the queue side of that pipeline isn't covered here.

## Do not

- Issue one synchronous `INSERT` per row from a request handler — batch, or use `async_insert` for genuinely unbatchable writers.
- Use `ALTER TABLE ... UPDATE/DELETE` as a request-path operation — it's an async part rewrite; model the change as a new versioned row.
- Run `FINAL` on a hot aggregation query — use `argMax`/`GROUP BY`.
- Set `PARTITION BY` on a high-cardinality or multi-column key (day × tenant) — partition explosion kills merge throughput. Put that cardinality in `ORDER BY`.
- Reach for `Nullable(String)` where a sentinel default already disambiguates "empty" from "unset".
- Assume `insert_deduplicate` protects a retry that reorders or re-batches rows — it hashes the exact block.
- Treat ClickHouse as a system of record for data that needs transactions or row-level locks — that's Postgres; see [[z-go-database]].

## Verify

```sh
clickhouse-client --query "EXPLAIN indexes = 1 SELECT ... FORMAT PrettyCompact"  # confirm ORDER BY prefix is used (look for "Granules" pruning)
clickhouse-client --query "SELECT table, partition, count() FROM system.parts WHERE active GROUP BY table, partition ORDER BY count() DESC LIMIT 20"  # catch partition explosion
go test -race ./internal/... # repository tests against a real clickhouse-server via testcontainers, not a fake
go vet ./...
```
