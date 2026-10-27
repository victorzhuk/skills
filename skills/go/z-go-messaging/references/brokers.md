# Broker clients and consume-loop shapes

Client choice and minimal wiring per broker. Pattern content (idempotency, outbox, rebalance, DLQ, keys) lives in the main skill — this file is the "which library, what does the loop look like" reference.

## Kafka: franz-go vs segmentio/kafka-go

| | `twmb/franz-go` | `segmentio/kafka-go` |
|---|---|---|
| Design | Full protocol client — idempotent + transactional producer, exactly-once semantics, cooperative-sticky rebalancing, all SASL mechanisms, rack awareness | `io`-like reader/writer abstraction over the protocol; simpler surface |
| Consumer groups | Yes, including cooperative-sticky | Yes, via `ReaderConfig.GroupID` |
| Transactions / EOS | Yes | No |
| Compression | gzip, snappy, lz4, zstd | Supported, fewer knobs |
| Dependency | Pure Go, no cgo | Pure Go, no cgo |

Default to `franz-go` for a production consumer group with commit-after-process, backpressure, and any need for exactly-once inside a Kafka-only pipeline — it is the more complete and actively maintained client. Reach for `kafka-go` only for a small script or a simple pub/sub path where its `io`-shaped `Reader`/`Writer` API buys enough simplicity to outweigh the narrower feature set — its documented compatibility target (broker versions through 2.7.1) means newer broker-side features may lag.

### franz-go consumer group loop

```go
cl, err := kgo.NewClient(
    kgo.SeedBrokers("localhost:9092"),
    kgo.ConsumerGroup("orders-service"),
    kgo.ConsumeTopics("orders.created"),
    kgo.Balancers(kgo.CooperativeStickyBalancer()),
    kgo.DisableAutoCommit(),
    kgo.BlockRebalanceOnPoll(),
)
if err != nil {
    return fmt.Errorf("new kafka client: %w", err)
}
defer cl.CloseAllowingRebalance()

for {
    fetches := cl.PollFetches(ctx)
    if fetches.IsClientClosed() {
        return nil
    }
    if err := fetches.Err(); err != nil {
        return fmt.Errorf("poll fetches: %w", err)
    }

    for _, r := range fetches.Records() {
        if err := handle(ctx, r); err != nil {
            return fmt.Errorf("handle record at offset %d: %w", r.Offset, err)
        }
        if err := cl.CommitRecords(ctx, r); err != nil {
            return fmt.Errorf("commit record: %w", err)
        }
    }
    cl.AllowRebalance()
}
```

Commit only a contiguous processed prefix in each partition. These serial loops stop on failure; a supervisor can restart and replay from committed offsets. Add bounded retry or durable DLQ handoff before advancing past a failed record. Bound each batch below the group rebalance timeout; release blocked rebalances after committing and during close. Parallel consumers must track partition ownership and completion gaps explicitly.

### kafka-go consumer loop

```go
reader := kafka.NewReader(kafka.ReaderConfig{
    Brokers: []string{"localhost:9092"},
    GroupID: "orders-service",
    Topic:   "orders.created",
})
defer reader.Close()

for {
    msg, err := reader.FetchMessage(ctx)
    if err != nil {
        return fmt.Errorf("fetch message: %w", err)
    }
    if err := handle(ctx, msg); err != nil {
        return fmt.Errorf("handle message at offset %d: %w", msg.Offset, err)
    }
    if err := reader.CommitMessages(ctx, msg); err != nil {
        return fmt.Errorf("commit message: %w", err)
    }
}
```

Producer key for ordering — `kafka.Writer{Balancer: &kafka.Hash{}}`; franz-go records carry `Key: []byte(orderID)`. Verify the partitioner and hash before migrating producers: identical keys do not imply identical partitions across clients.

## RabbitMQ: `rabbitmq/amqp091-go`

The RabbitMQ team's own AMQP 0.9.1 client (successor to the unmaintained `streadway/amqp`) — the only client to reach for on RabbitMQ. It exposes the protocol directly: no built-in reconnect loop, so wrap `Dial` + `NotifyClose` in a reconnect helper for anything long-running.

The following sketch aborts on cancellation and permits redelivery. Use it only
when that recovery behavior is intended; it does not implement graceful drain.

```go
ch, err := conn.Channel()
if err != nil {
    return fmt.Errorf("open channel: %w", err)
}
if err := ch.Qos(10, 0, false); err != nil { // prefetch 10, no size limit, per-consumer
    return fmt.Errorf("set qos: %w", err)
}

deliveries, err := ch.Consume(queueName, "", false, false, false, false, nil) // autoAck=false
if err != nil {
    return fmt.Errorf("consume: %w", err)
}

// Consume takes no context, so a bare range blocks forever while idle.
// Own the channel: close it on cancel to unblock the range.
closed := ch.NotifyClose(make(chan *amqp.Error, 1))
go func() {
    select {
    case <-ctx.Done():
        _ = ch.Close()
    case <-closed:
    }
}()

for d := range deliveries {
    if err := handle(ctx, d); err != nil {
        _ = d.Nack(false, requeueOnFailure) // false = single message, not multi
        continue
    }
    if err := d.Ack(false); err != nil {
        log.Error("ack delivery", "err", err)
    }
}
```

On cancel, closing the channel stops further broker delivery and requeues
unacknowledged messages. Buffered deliveries may still reach the loop; handlers
must honor cancellation and tolerate redelivery. An acknowledgement racing the
close can fail. `NotifyClose` lets the cancellation watcher exit when the broker
closes the channel first.

For graceful drain, assign a consumer tag, call `Cancel(tag, false)`, and keep
reading deliveries and acknowledging completed work while the channel remains
open. Give processing a separate bounded drain context. Close the channel and
connection after completion; on deadline, cancel processing and force-close
under an explicit redelivery policy. Join owned handlers before releasing their
dependencies. Verify this lifecycle against the broker; the abort sketch above
does not establish it.


`Qos(prefetchCount, 0, false)` bounds in-flight unacked messages per consumer — without it RabbitMQ pushes as fast as the network allows, and a slow handler backs up unbounded. Dead-lettering is declared on the queue at setup time (`x-dead-letter-exchange` argument), not in the consume loop.

## NATS: `nats.go` / JetStream

The official client. Use core NATS pub/sub only for fire-and-forget, at-most-once signaling; use JetStream (`nats.go/jetstream` package) for anything that needs persistence, redelivery, or a durable consumer.

```go
nc, err := nats.Connect(natsURL)
if err != nil {
    return fmt.Errorf("connect nats: %w", err)
}
defer nc.Close()

js, err := jetstream.New(nc)
if err != nil {
    return fmt.Errorf("jetstream context: %w", err)
}

stream, err := js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
    Name:     "ORDERS",
    Subjects: []string{"orders.*"},
})
if err != nil {
    return fmt.Errorf("create stream: %w", err)
}

consumer, err := stream.CreateOrUpdateConsumer(ctx, jetstream.ConsumerConfig{
    Durable:    "orders-service",
    AckPolicy:  jetstream.AckExplicitPolicy,
    MaxDeliver: 5,
})
if err != nil {
    return fmt.Errorf("create consumer: %w", err)
}

consCtx, err := consumer.Consume(func(msg jetstream.Msg) {
    if err := handle(ctx, msg); err != nil {
        _ = msg.Nak()
        return
    }
    _ = msg.Ack()
})
if err != nil {
    return fmt.Errorf("start consume: %w", err)
}
defer consCtx.Stop()
```

`AckExplicitPolicy` + `MaxDeliver` gives commit-after-process and bounded redelivery in one config block — no separate retry-counter plumbing needed, unlike Kafka.

## Versions checked

`twmb/franz-go` (actively released, latest tag mid-2026), `segmentio/kafka-go` v0.4.51, `rabbitmq/amqp091-go` v1.12.0, `nats-io/nats.go` v1.52.0 — re-check `go list -m -u` before pinning; these move fast enough that exact patch versions age out within a quarter.
