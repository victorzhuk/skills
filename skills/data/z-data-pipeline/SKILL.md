---
name: z-data-pipeline
description: Analytics pipeline discipline — idempotent batch loads, append-only modeling for late-arriving data, incremental vs full-refresh judgment, single metric definitions across dashboards, ingestion quality gates, cron before an orchestrator. Does not cover ClickHouse specifics; see [[z-go-clickhouse]].
---

# Data pipeline discipline

Analytics pipelines default to append-only, idempotent, and ClickHouse-shaped. Row-level OLTP mutation habits don't transfer — see [[z-go-clickhouse]] for the engine side.

## Batch ingestion

- Idempotent loads: key every batch (source id + batch id, or a natural business key) so a rerun after a partial failure doesn't double-count. ClickHouse: `ReplacingMergeTree` keyed on that id, or dedupe at insert with an existence check. Postgres: `ON CONFLICT DO UPDATE`.
- Backfill one partition or date range at a time, not "truncate and reload everything." A backfill that touches the whole table blocks readers and hides the actual gap you're fixing.

## Append-only modeling

- Model events by `event_time`, not `ingestion_time`. Late-arriving data — an offline mobile client, a retried webhook — lands hours after the event happened; partition and query on when it occurred, not when it showed up.
- A late row reprocesses the partition it belongs to, not "today's" partition. Getting this wrong is the most common cause of a metric that's quietly wrong for the last N days until a reconciliation catches it.
- Engine and table-design specifics (MergeTree family, `FINAL`/`argMax` reads): [[z-go-clickhouse]].

## Incremental vs full-refresh

Full-refresh is the correct default until incremental earns its complexity:

| | Full-refresh | Incremental |
|---|---|---|
| Source | mutates in place (dimension tables) | append-only, high volume |
| Correctness | always matches the source | depends on a correct watermark/dedup key |
| Cost | rereads everything every run | reads only the delta |

Reach for incremental once full-refresh is measurably too slow or too expensive for the freshness SLA — not by default because it feels more sophisticated.

## Metrics-layer consistency

One definition per metric, computed once — a view, a metrics table, a single query template every dashboard reads from. A metric redefined per-dashboard (one query's `WHERE status = 'paid'`, another's `WHERE status IN ('paid', 'partially_refunded')`) is a modeling bug, not a BI-tool quirk, and it surfaces as "why do these two dashboards disagree" months later.

## Data-quality gates at ingestion

Run these immediately after load, before anything downstream reads the data:

- **Row count** — expected vs actual, alarm past an N% deviation from the trailing average.
- **Null threshold** — a required column's null rate crossing a set bound.
- **Freshness** — `max(event_time)` within the SLA window.

Fail the load on a gate breach. A silent partial load that passes downstream is worse than a late one — it looks correct until someone reconciles against the source.

## Scheduling

cron or a systemd timer for a job with no real dependency graph — one job, one schedule, one log:

```ini
# systemd timer unit
[Timer]
OnCalendar=*-*-* 02:00:00
```

Reach for an orchestrator (dbt/Airflow-class) only once there's an actual DAG: multiple jobs with real dependency edges, per-task retry/backoff, or SLA tracking across a graph. Three cron jobs with no dependency between them don't need Airflow to run them; they need three cron jobs.

## Boundary

- ClickHouse engine choice, query patterns, client library: [[z-go-clickhouse]].
- Ingestion transport — Kafka/RabbitMQ/NATS consumer patterns feeding the load: [[z-go-messaging]].
- Warehouse querying and semantic-layer tools (e.g. Wren): out of scope here — consult find-docs or the tool's own documentation.

## Do not

- Truncate-and-reload a large table nightly "to be safe" when an idempotent incremental load would do — full-refresh cost grows with the table, freshness doesn't.
- Redefine a metric's filter or aggregation inside a dashboard query instead of pointing at the shared definition.
- Skip the freshness/row-count/null check because "it worked last time" — that's exactly the run it won't.
- Reach for an orchestrator before a second real dependency edge exists between jobs.
- Key a dedup or idempotency check on `ingestion_time` instead of a stable business or event key.

## Verify

- Rerunning the same batch leaves row counts unchanged (idempotency holds).
- Freshness/row-count/null-threshold checks pass post-load on the actual data, not just "the job exited 0."
- A late-arriving record lands in its correct event-time partition, not today's.

see [[z-go-clickhouse]], [[z-go-messaging]]
