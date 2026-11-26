---
name: z-go-clickhouse
description: "Access ClickHouse from Go. Use for batch or async inserts, retry deduplication, MergeTree engines, sorting keys, and aggregate queries. Use [[z-go-database]] for OLTP."
---

# ClickHouse from Go

Match the table engine and query plan to the workload before selecting a Go client.

## OLTP habits that don't transfer

| Postgres habit | ClickHouse reality |
|---|---|
| Row updates | Heavyweight mutation operations rewrite data. Consider versioned rows for frequent updates. |
| Small synchronous inserts | Small inserts can create excessive parts. Batch rows or use asynchronous inserts. |
| Transaction boundaries | Check the engine, block, partition, and replication settings before promising atomicity. |
| Point lookup | A MergeTree primary index is sparse. Inspect granules read for the actual predicate. |

Keep transactional row updates in the existing OLTP store when they require its guarantees. See [[z-go-database]].

## Client choice: clickhouse-go vs ch-go

| | `clickhouse-go` v2 | `ch-go` |
|---|---|---|
| API shape | `database/sql`-ish plus a native `Conn`/`Batch` interface | low-level native protocol, columnar blocks |
| Built on | wraps `ch-go` for wire encode/decode (v2.3.x+) | — |
| Protocols | native TCP (9000) and HTTP (8123) | native TCP only |
| Use for | the default — repository queries, batch inserts, migrations, everything | max-throughput columnar ingest pipelines where profiling shows `clickhouse-go`'s row-oriented `Batch.Append` is the bottleneck |

Use the project's existing driver. Compare `ch-go` with native `clickhouse-go` when profiling identifies a row-encoding bottleneck.

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

Batch rows before `Send`. Tune batch size against latency, part creation, memory, and throughput. A batch can touch multiple partitions.

Close the batch on append errors and other early returns.

## Async inserts for many small writers

Consider async inserts for independent writers that cannot batch within their latency or memory budgets.

```go
ctx = clickhouse.Context(ctx, clickhouse.WithAsync(true))
err := conn.Exec(ctx,
    "INSERT INTO events (event_id, event_type, occurred_at, payload) VALUES (?, ?, ?, ?)",
    e.ID, e.Type, e.OccurredAt, e.Payload,
)
```

Use `clickhouse.WithAsync(true)` when the caller needs the result of the flush. With `false`, an acknowledgment can precede a failed flush.

Inspect the effective size, query-count, and timeout settings. Flush defaults and adaptive behavior vary by server release.

## Idempotent retries: insert_deduplication

Inspect the table engine, deduplication settings, and retention window. Keep retry payloads, ordering, and block boundaries stable. [MergeTree settings](https://clickhouse.com/docs/reference/settings/merge-tree-settings)

Use a stable `insert_deduplication_token` for the same logical insert when the engine supports it. Never reuse tokens across distinct writes.

Check async deduplication on the deployed version. Before 26.1, dependent incremental materialized views could still contain duplicates after a retry. Test both source and view. [ClickHouse 26.1](https://clickhouse.com/blog/clickhouse-release-26-01)

## Schema modeling: pick the engine

| Engine | What merge does | Use for |
|---|---|---|
| `MergeTree` | nothing beyond sorting/compaction | the default — raw append-only fact table |
| `ReplacingMergeTree(ver)` | keeps one row per `ORDER BY` key (highest `ver`, or last-inserted without `ver`) | CDC-style upserts — latest booking status, latest price |
| `SummingMergeTree` | sums numeric columns outside `ORDER BY` for rows sharing a key | simple additive rollups (counts, totals) where a raw table already exists elsewhere |
| `AggregatingMergeTree` | Merges aggregate states. | Precomputed aggregates, often supplied by a materialized view. |

Merges run asynchronously. Queries can observe several versions or partial aggregates before a merge. Aggregate explicitly when the contract requires it.

## ORDER BY and PARTITION BY

Design the sorting key from representative filters and cardinalities. The primary key defaults to the sorting key.

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

Inspect selected granules for each filter with `EXPLAIN indexes = 1`. A non-leading key may prune less data.

Use partitions for lifecycle operations, such as dropping a month. Keep partition cardinality low enough for merges.

## LowCardinality and Nullable

Measure `LowCardinality(String)` for columns with repeated values. Compare storage and query cost on representative data.

Use `Nullable` when absence has a distinct meaning. A sentinel must preserve that meaning in every aggregate and predicate.

## Reading the latest row: FINAL vs argMax

```sql
-- correct, but re-merges every touched part at query time — avoid on hot paths
SELECT booking_id, status FROM bookings FINAL WHERE booking_id = ?

-- equivalent only under the invariants below, no merge cost
SELECT booking_id, argMax(status, version) AS status
FROM bookings
GROUP BY booking_id
```

Use `argMax` only if grouping uses the full replacement key and versions break ties. Check null and deletion semantics. Otherwise retain `FINAL`.

## Query patterns: PREWHERE and materialized views

Inspect the plan before adding explicit `PREWHERE`. Compare rows and bytes read with the same predicates.

Use an incremental materialized view when measured query savings justify the added insert cost.

For broker delivery and acknowledgment, see [[z-go-messaging]].

## Checks

```sh
clickhouse-client --query "EXPLAIN indexes = 1 SELECT ... FORMAT PrettyCompact"  # confirm ORDER BY prefix is used (look for "Granules" pruning)
clickhouse-client --query "SELECT table, partition, count() FROM system.parts WHERE active GROUP BY table, partition ORDER BY count() DESC LIMIT 20"  # catch partition explosion
timeout 15m go test -parallel 4 -p 2 -race -timeout 10m ./internal/... # repository tests against a real clickhouse-server via testcontainers, not a fake
go vet ./...
```
