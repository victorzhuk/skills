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
)
if err != nil {
    return fmt.Errorf("new kafka client: %w", err)
}
defer cl.Close()

for {
    fetches := cl.PollFetches(ctx)
    if fetches.IsClientClosed() {
        return nil
    }
    if err := fetches.Err(); err != nil {
        return fmt.Errorf("poll fetches: %w", err)
    }

    fetches.EachRecord(func(r *kgo.Record) {
        if err := handle(ctx, r); err != nil {
            log.Error("handle record", "err", err, "offset", r.Offset)
            return // do not commit — bounded retry/DLQ owns this record's fate
        }
        if err := cl.CommitRecords(ctx, r); err != nil {
            log.Error("commit record", "err", err)
        }
    })
}
```

Commit per successfully handled record (or batch them and commit after the batch) — never `AutoCommitInterval` alone in front of a handler that can fail.

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
        log.Error("handle message", "err", err, "offset", msg.Offset)
        continue // skip commit — leave it for retry/DLQ handling
    }
    if err := reader.CommitMessages(ctx, msg); err != nil {
        return fmt.Errorf("commit message: %w", err)
    }
}
```

Producer key for ordering — `kafka.Writer{Balancer: &kafka.Hash{}}` (franz-go: `kgo.Record{Key: []byte(orderID)}`, default partitioner hashes it the same way).

## RabbitMQ: `rabbitmq/amqp091-go`

The RabbitMQ team's own AMQP 0.9.1 client (successor to the unmaintained `streadway/amqp`) — the only client to reach for on RabbitMQ. It exposes the protocol directly: no built-in reconnect loop, so wrap `Dial` + `NotifyClose` in a reconnect helper for anything long-running.

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
