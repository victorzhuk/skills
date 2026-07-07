---
name: z-go-messaging
description: At-least-once delivery is the default reality for Go services on Kafka, RabbitMQ, or NATS — idempotent-consumer dedup, the transactional outbox, consumer-group rebalancing, and dead-letter queues. Use when wiring a consumer/producer, an outbox relay, or DLQ routing. Triggers on "at-least-once", "idempotent consumer", "transactional outbox", "consumer group", "dead-letter queue", "JetStream". Does not cover transaction wiring or goroutines; see [[z-go-database]] and [[z-go-concurrency]].
---

# Go messaging

The moment a consumer handler touches anything outside the broker's own transactional boundary — a Postgres write, an HTTP call, an email — delivery is at-least-once, full stop. Kafka's exactly-once semantics (idempotent producer + transactions) only hold for a consume-transform-produce loop that never leaves Kafka. RabbitMQ and NATS core have no exactly-once mode at all. Design every consumer as if redelivery will happen, because it will: broker crashes, rebalances, client restarts, and network partitions all trigger reprocessing of already-handled messages.

## Idempotent consumers

Two ways to make a handler safe under redelivery, in order of preference:

| Strategy | When | Cost |
|---|---|---|
| Idempotent-by-construction (upsert on a natural key) | The business write already has a stable key — `INSERT ... ON CONFLICT (order_id) DO UPDATE` | Free — no extra table, no extra round-trip |
| Dedup table keyed by message ID | The write isn't naturally idempotent — counters, appends, side-effecting calls, multi-statement effects | One extra row + index per message |

Dedup table pattern — the dedup INSERT and the business write share one transaction, so either both land or neither does:

```go
tx, err := pool.Begin(ctx)
if err != nil {
    return fmt.Errorf("begin tx: %w", err)
}
defer tx.Rollback(ctx)

tag, err := tx.Exec(ctx,
    `INSERT INTO processed_messages (message_id) VALUES ($1) ON CONFLICT DO NOTHING`, msg.ID)
if err != nil {
    return fmt.Errorf("mark processed: %w", err)
}
if tag.RowsAffected() == 0 {
    return nil // already applied on a prior delivery — ack and move on
}

if err := applyBalanceChange(ctx, tx, msg); err != nil {
    return fmt.Errorf("apply balance change: %w", err)
}
return tx.Commit(ctx)
```

Full transaction/rollback boilerplate (panic-safe defer, isolation level): see [[z-go-database]]. Only ack the message after this transaction commits — see commit-after-process below.

## Transactional outbox

This is the one rule that makes the pattern work, and where it most often breaks: **the outbox INSERT must run in the exact same Postgres transaction as the business write.** Never publish to the broker from inside that transaction — a broker call cannot roll back with the database, so a "publish, then commit" or "commit, then publish with no fallback" order both have a window where one side succeeds and the other doesn't.

The flow:

1. **Business transaction** — one commit writes the domain row(s) and an `outbox` row (event type, payload, headers, `created_at`, `published_at NULL`).
2. **Relay** (separate process or goroutine, polling or CDC) — reads unpublished outbox rows, publishes each to the broker, then marks it published. Publish happens strictly after the business transaction has committed.
3. **Crash recovery** — if the relay dies between publish and mark-published, it republishes that row on restart. The outbox makes publishing at-least-once, not exactly-once: it guarantees the message is never lost, and the idempotent-consumer pattern above is what absorbs the resulting duplicate. Neither pattern alone is enough; they close the loop together.

```go
tx, err := pool.Begin(ctx)
if err != nil {
    return fmt.Errorf("begin tx: %w", err)
}
defer tx.Rollback(ctx)

if _, err := tx.Exec(ctx,
    `INSERT INTO orders (id, customer_id, total) VALUES ($1, $2, $3)`,
    order.ID, order.CustomerID, order.Total); err != nil {
    return fmt.Errorf("insert order: %w", err)
}
if _, err := tx.Exec(ctx,
    `INSERT INTO outbox (id, topic, payload, created_at) VALUES ($1, $2, $3, now())`,
    order.ID, "orders.created", payload); err != nil {
    return fmt.Errorf("insert outbox row: %w", err)
}
return tx.Commit(ctx)
```

Relay poll, `FOR UPDATE SKIP LOCKED` so multiple relay instances don't double-publish the same row. The lock only holds for the life of the transaction that took it — run the select and the publish loop inside one explicit `Begin`/`Commit`, never as a bare `pool.Query` (an unwrapped statement is its own implicit transaction and releases the row locks the instant it finishes, before `producer.Publish` even runs):

```go
tx, err := pool.Begin(ctx)
if err != nil {
    return fmt.Errorf("begin tx: %w", err)
}
defer tx.Rollback(ctx)

rows, err := tx.Query(ctx, `
    SELECT id, topic, payload FROM outbox
    WHERE published_at IS NULL
    ORDER BY id
    FOR UPDATE SKIP LOCKED
    LIMIT 100`)
if err != nil {
    return fmt.Errorf("select outbox batch: %w", err)
}

type outboxRow struct {
    id      int64
    topic   string
    payload []byte
}
var batch []outboxRow
for rows.Next() {
    var r outboxRow
    if err := rows.Scan(&r.id, &r.topic, &r.payload); err != nil {
        rows.Close()
        return fmt.Errorf("scan outbox row: %w", err)
    }
    batch = append(batch, r)
}
rows.Close()
if err := rows.Err(); err != nil {
    return fmt.Errorf("read outbox batch: %w", err)
}

for _, r := range batch {
    if err := producer.Publish(ctx, r.topic, r.payload); err != nil {
        return fmt.Errorf("publish outbox row %d: %w", r.id, err)
    }
    if _, err := tx.Exec(ctx,
        `UPDATE outbox SET published_at = now() WHERE id = $1`, r.id); err != nil {
        return fmt.Errorf("mark outbox row %d published: %w", r.id, err)
    }
}
return tx.Commit(ctx)
```

Holding the transaction open across the publish loop keeps the row locks (and the connection) held for as long as the broker calls take — fine at a `LIMIT` of 100, shrink the batch if publish latency makes that too long a hold. A polling relay (100ms–1s interval) is the default. Reach for CDC (Debezium or logical replication tailing the outbox table) only once poll latency is a proven problem — it removes the poll interval at the cost of a CDC pipeline to run and monitor.

## Consumer-group semantics

| Broker | Grouping unit | Ordering guarantee | Rebalance trigger |
|---|---|---|---|
| Kafka | Consumer group spread across partitions | Per-partition only — never across partitions, never per-topic | Member join/leave, partition count change |
| RabbitMQ | Competing consumers on one queue | None, unless a single active consumer or a consistent-hash exchange pins a key to one queue | Consumer disconnect, queue failover |
| NATS JetStream | Durable consumer, work-queue policy | Per-subject with a single ordered consumer; a shared work-queue consumer gives none | Consumer/durable restart |

**Commit-after-process, never before.** Ack or commit only after the handler returns success. Interval-based auto-commit/auto-ack trades this away for convenience — a crash between "received" and "processed" loses the message even though the offset was already committed. Treat auto-commit as an opt-in for loss-tolerant, already-idempotent paths, not the default.

**Graceful shutdown drains before it disconnects.** On `SIGTERM` (Kubernetes sends this, then waits `terminationGracePeriodSeconds` before `SIGKILL`): stop pulling new messages first, let in-flight handlers finish under a bounded drain timeout, commit/ack their results, then close the client. A rebalance or pod kill that yanks the connection before drain either loses in-flight work or forces redelivery — which is exactly why idempotency is a prerequisite for this pattern, not an afterthought.

## Poison messages

Bound retries with backoff, then dead-letter — never loop forever on a message that can't be processed:

| Broker | Native support | Pattern |
|---|---|---|
| Kafka | None | Track attempt count in a header or side table; retry with backoff (in-process, or a delayed retry topic); after N attempts, produce to `<topic>.dlq` with original headers + failure reason, then commit past the offset so later valid records on that partition aren't blocked |
| RabbitMQ | Native dead-lettering | Set `x-dead-letter-exchange` (+ optional routing key) on the queue; `Nack(false, false)` or exceeding `x-message-ttl`/a delivery-count limit routes the message to the DLX automatically |
| NATS JetStream | `MaxDeliver` on the consumer config | Once exceeded, the message stops redelivering; wire an advisory-subject handler to move it into your own DLQ if you need the payload preserved |

## Producer keys and ordering

| Broker | What the key controls | No key |
|---|---|---|
| Kafka | `hash(key) % partitions` (unkeyed records go round-robin/sticky-random) | No ordering guarantee across messages |
| RabbitMQ | Routing key → queue binding, not partitioning | Still delivered correctly; ordering only holds with a single consumer on that queue |
| NATS | Subject hierarchy, not a key field | No partitioning concept; ordering is per-subject with a single ordered consumer |

Changing a Kafka topic's partition count changes `hash(key) % partitions` for every key on that topic — don't repartition a topic whose consumers depend on historical per-key ordering.

## Do not

- Assume Kafka's exactly-once semantics extend past the broker boundary — any external write (DB, HTTP, email) inside the handler makes it at-least-once regardless of producer/consumer transaction config.
- Publish to the broker from inside the business database transaction — the two systems can't commit atomically together; use the outbox.
- Skip the outbox and publish directly after commit with no fallback — a crash in that gap silently drops the message.
- Ack or commit an offset before the handler's work is durably applied.
- Let a poison message retry unbounded — bound it, then DLQ it.
- Ignore the producer key when message order matters to a consumer.
- Close a consumer/channel on shutdown without draining in-flight work first.

## Verify

```sh
go test -race ./internal/consumer/... ./internal/outbox/...
```

- Idempotency: replay the same message ID twice through the handler in a test; assert the business effect applied exactly once.
- Outbox: kill the relay (or fail the publish call) between insert and publish in a test; assert the row is still published on the next poll and the business write was never lost.
- Poison path: force N handler failures then assert the message lands on the DLQ/DLX and stops redelivering.
- Shutdown: send the drain signal mid-batch in a test harness; assert in-flight messages finish and commit before the client closes.

## Reference

- `references/brokers.md` — client choice per broker (franz-go vs segmentio/kafka-go, amqp091-go, nats.go/JetStream) and minimal consume-loop shapes.

## See also

Context cancellation inside a consumer loop: [[z-go-context]]. Consumer lag, DLQ counters, and per-message tracing: [[z-go-observability]]. Repository/transaction wiring beneath the outbox: [[z-go-database]]. Worker-pool shape for parallel handler execution: [[z-go-concurrency]].
