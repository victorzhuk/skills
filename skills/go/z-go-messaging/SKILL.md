---
name: z-go-messaging
description: "Implement idempotent Go consumers, transactional outboxes, and redelivery handling for Kafka, RabbitMQ, or JetStream. Use [[z-go-database]] for transaction mechanics."
---

# Go messaging

Define the delivery and acknowledgement contract at each boundary. A broker transaction cannot make an independent external effect atomic.

## Idempotent consumers

Two ways to make a handler safe under redelivery, in order of preference:

| Strategy | When | Cost |
|---|---|---|
| Idempotent write | Repeating the update produces the same result. Incrementing a counter changes it again. | No extra deduplication table |
| Dedup table keyed by message ID | Non-idempotent counters, appends, or multi-statement effects in the same database transaction | One extra row + index per message |

Commit the deduplication record and business write in the same transaction.
For an external payment, email, or HTTP request, use a durable handoff and a downstream idempotency contract.

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

Acknowledge a message after its effect commits. See [[z-go-database]] for rollback and isolation.

## Transactional outbox

Commit the business write and the outbox insert in the same database transaction. A broker cannot roll back a publication with that transaction.

1. Store the domain change and an unpublished event with its type, payload, headers, and creation time.
2. After commit, the relay publishes the event and marks its row as published.
3. On restart, retry unpublished rows. A crash after publication can produce a duplicate. Use an idempotent consumer.

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

Select rows with `FOR UPDATE SKIP LOCKED` in an explicit relay transaction. Keep the transaction open through publication and the status update. A standalone query releases its locks too early.

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

The relay retains its connection and row locks during the broker calls. Bound publish time and batch size against database capacity.
If lock duration is excessive, design a recoverable claim or lease before releasing the transaction.

## Consumer-group semantics

| Broker | Grouping unit | Ordering guarantee | Rebalance trigger |
|---|---|---|---|
| Kafka | Consumer group spread across partitions | Per-partition only — never across partitions, never per-topic | Member join/leave, partition count change |
| RabbitMQ | Competing consumers on one queue | Parallel delivery and redelivery can reorder processing | Consumer disconnect, queue failover |
| NATS JetStream | Durable consumer with work-queue retention | Shared workers can finish out of order | Consumer restart |

Acknowledge only after successful processing. A crash after an early acknowledgement can lose the business effect. For Kafka, commit only through the highest contiguous processed offset in each partition.

On shutdown, stop fetching new messages. Drain current handlers within the shutdown deadline. Acknowledge completed work before closing the client. Leave unfinished work eligible for redelivery.

## Poison messages

Bound retries with backoff, then dead-letter — never loop forever on a message that can't be processed:

| Broker | Native support | Pattern |
|---|---|---|
| Kafka | Application retry policy | Track attempts with backoff. After the limit, durably publish the failure before advancing the offset. |
| RabbitMQ | Dead-letter exchange | Configure the exchange and routing. Reject without requeue, or use the queue’s expiry or delivery limit. |
| NATS JetStream | `MaxDeliver` | Handle the delivery-limit advisory if the application needs a separate dead-letter stream. |

## Producer keys and ordering

| Broker | What the key controls | No key |
|---|---|---|
| Kafka | The configured partitioner maps keyed messages to partitions | Ordering applies within each partition |
| RabbitMQ | A binding routes a message to one or more queues | Multiple workers can complete out of order |
| NATS | Subjects select subscriptions and streams | Check the specific consumer’s delivery and ordering settings |

Changing the Kafka partition count can move a key to a different partition. Check historical ordering requirements before repartitioning.

## Do not

- Assume broker transactions guarantee a single write to an external database or service.
- Publish to a broker inside the business database transaction.
- Skip the outbox and publish directly after commit with no fallback — a crash in that gap silently drops the message.
- Ack or commit an offset before the handler's work is durably applied.
- Let a poison message retry unbounded — bound it, then DLQ it.
- Ignore the producer key when message order matters to a consumer.
- Close a consumer/channel on shutdown without draining in-flight work first.

## Verification

```sh
timeout 15m go test -parallel 4 -p 2 -race -timeout 10m ./internal/consumer/... ./internal/outbox/...
```

- Deliver the same ID twice. Check that the business effect occurs once.
- Interrupt the relay before publication. Check that the committed row remains available.
- Interrupt it after publication and before marking delivery. Check that a retry preserves the downstream effect.
- Exhaust the retry limit. Check the broker-specific poison-message outcome.
- Request shutdown during a batch. Check acknowledgements and pending work against the drain contract.

## Reference

Use [broker patterns](references/brokers.md) for client choices and consume loops.

## See also

Use [[z-cloudevents]] for event envelopes, identity, and protocol mappings.

Context cancellation inside a consumer loop: [[z-go-context]]. Consumer lag, DLQ counters, and per-message tracing: [[z-go-observability]]. Repository/transaction wiring beneath the outbox: [[z-go-database]]. Worker-pool shape for parallel handler execution: [[z-go-concurrency]].
