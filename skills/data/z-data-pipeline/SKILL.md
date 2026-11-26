---
name: z-data-pipeline
description: "Design and check analytics batch loads. Use for replay, backfill, late events, watermarks, freshness checks, or inconsistent metrics. See [[z-go-clickhouse]] for engine details."
---

# Analytics batch loads

## Select the load

Use a full refresh when it meets the freshness and cost requirements. Read a consistent source snapshot when the result must represent one point in time.
Use incremental loads when a full refresh exceeds those limits. Define a watermark, replay window, and stable deduplication key.
Account for source updates and deletions when they affect the metric.

## Load and publish

1. Assign stable identifiers to events and batches. Use atomic conflict handling for concurrent writers.
2. In PostgreSQL, pair `ON CONFLICT` with the appropriate constraint. A separate existence check can race another writer.
3. In ClickHouse, `ReplacingMergeTree` merges asynchronously. Use the table's intended `FINAL` or `argMax` read semantics.
4. Record event time and ingestion time. Assign late events to the reporting interval defined by the metric.
5. Backfill the affected range. Keep the batch unpublished until the quality checks pass.
6. Publish each metric from one shared view, table, or query. Keep filters such as paid status consistent across dashboards.

## Check the batch

| Check | Evidence |
|---|---|
| Volume | Compare actual rows with source counts or an agreed range. |
| Nulls | Check required fields and the approved null rate. |
| Live freshness | Compare the latest event time with the live freshness target. |
| Historical backfill | Check source completeness across the declared interval. |
| Replay | Retry a partial batch and run concurrent replays. Compare published logical results. |
| Late event | Read the corrected historical reporting interval. |

## Schedule the load

Use cron or a systemd timer for an independent job.

```ini
[Timer]
OnCalendar=*-*-* 02:00:00
```

Use an orchestrator when dependency ordering, retries, or workflow monitoring require it.
Use [[z-go-clickhouse]] for storage behavior and [[z-go-messaging]] for ingestion transport.
