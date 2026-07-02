---
name: z-go-observability
description: >
  Production observability for Go services: structured logging with log/slog,
  Prometheus metrics, OpenTelemetry tracing, pprof profiling, and signal
  correlation. Use when instrumenting a service, adding metrics or spans,
  migrating from zap/logrus/zerolog, correlating logs with trace_id/span_id,
  or reviewing observability coverage. Triggers on "slog", "prometheus",
  "opentelemetry", "otel", "pprof", "histogram", "trace_id", "slog.InfoContext",
  "otelslog", "slog-zerolog", "exemplar". Does not cover performance profiling
  methodology; see [[z-go-troubleshooting]]. Error handling strategy lives in
  [[z-go-errors]].
---

# Go Observability

## Quick Reference

| Signal   | Question             | Tool                        | Gotcha                            |
|----------|----------------------|-----------------------------|-----------------------------------|
| Logs     | What happened?       | `log/slog`                  | Log OR return, never both         |
| Metrics  | How much / how fast? | `prometheus/client_golang`  | Never use unbounded label values  |
| Traces   | Where did time go?   | OpenTelemetry SDK            | Must propagate `ctx` everywhere   |
| Profiles | Why slow/OOM?        | `net/http/pprof`, Pyroscope | Gate behind auth in production    |
| Alerts   | Is it broken now?    | Prometheus + alertmanager   | Use `rate()` not `irate()` for SLOs |

## Logging

Use `log/slog` (Go 1.21+). Static message, dynamic data in key-value attrs.

```go
slog.InfoContext(ctx, "order placed", "order_id", orderID, "total", total)
slog.Error("payment failed", "err", err, "order_id", id)

// hot path — avoid allocations
slog.LogAttrs(ctx, slog.LevelInfo, "request handled",
    slog.String("method", r.Method),
    slog.Int("status", code),
    slog.Duration("elapsed", elapsed),
)
```

Levels: Debug (dev-only), Info (lifecycle), Warn (recoverable), Error (operator attention). `slog.Error` must include `"err"` attr. Keys use `snake_case`.

In middleware, attach `slog.With("request_id", ..., "trace_id", ...)` to context so all downstream calls carry the same fields.

**Dev-mode pretty console:** `samber/slog-zerolog/v2` behind `slog.Handler` is a
permanent house pattern, not a migration-then-delete shim — production keeps a plain
`slog.NewJSONHandler`, dev/local swaps in the pretty-console handler:

```go
import (
    "github.com/rs/zerolog"
    slogzerolog "github.com/samber/slog-zerolog/v2"
)

zlog := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr})
handler := slogzerolog.Option{Level: slog.LevelDebug, Logger: &zlog}.NewZerologHandler()
slog.SetDefault(slog.New(handler))
```

Go 1.26+: `slog.NewMultiHandler` for fan-out without third-party libs.

## Metrics

Histogram > Summary for latency — Histograms aggregate server-side and support `histogram_quantile`.

```go
var httpDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request latency.",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "route", "status"},
)

timer := prometheus.NewTimer(httpDuration.WithLabelValues(method, route, status))
defer timer.ObserveDuration()
```

**Label cardinality:** never use user IDs, full URLs, or other unbounded values as label values — it destroys Prometheus memory and performance.

## Tracing

Wire `TracerProvider` at startup, propagate `ctx` through every call.

```go
tp, err := newTracerProvider(ctx, serviceName, collectorEndpoint)
otel.SetTracerProvider(tp)

var tracer = otel.Tracer("my-service")

func (s *OrderService) Create(ctx context.Context, req CreateOrderReq) (*Order, error) {
    ctx, span := tracer.Start(ctx, "OrderService.Create")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.customer_id", req.CustomerID),
    )

    result, err := s.repo.Insert(ctx, req)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, fmt.Errorf("create order: %w", err)
    }
    return result, nil
}
```

Span every meaningful operation: service methods, DB queries, external calls, queue publishes. Always `defer span.End()`.

## Signal Correlation

### Logs + Traces: attrs.go + enricher.go

House default is hand-rolled: an `attrs.go` helper pulls `trace_id`/`span_id` off the
span in `ctx`, and an `enricher.go` slog handler wrapper injects them into every
record — no bridge dependency to keep in sync with the SDK.

```go
// attrs.go
func traceAttrs(ctx context.Context) []slog.Attr {
    sc := trace.SpanContextFromContext(ctx)
    if !sc.IsValid() {
        return nil
    }
    return []slog.Attr{
        slog.String("trace_id", sc.TraceID().String()),
        slog.String("span_id", sc.SpanID().String()),
    }
}

// enricher.go
type enricher struct {
    slog.Handler
}

func (e enricher) Handle(ctx context.Context, r slog.Record) error {
    r.AddAttrs(traceAttrs(ctx)...)
    return e.Handler.Handle(ctx, r)
}

func (e enricher) WithAttrs(attrs []slog.Attr) slog.Handler {
    return enricher{Handler: e.Handler.WithAttrs(attrs)}
}

func (e enricher) WithGroup(name string) slog.Handler {
    return enricher{Handler: e.Handler.WithGroup(name)}
}

slog.SetDefault(slog.New(enricher{Handler: slog.NewJSONHandler(os.Stdout, nil)}))
slog.InfoContext(ctx, "order created", "order_id", orderID) // trace_id/span_id now attached
```

`go.opentelemetry.io/contrib/bridges/otelslog` does the same job as a ready-made
handler — a fine alternative if the hand-rolled pair is more than you need, but it
isn't the house default.

### Metrics + Traces: Exemplars

```go
obs := httpDuration.WithLabelValues(method, route, status)
if eo, ok := obs.(prometheus.ExemplarObserver); ok {
    eo.ObserveWithExemplar(duration, prometheus.Labels{"trace_id": traceID})
} else {
    obs.Observe(duration)
}
```

## Profiling

Enable pprof conditionally; gate in production behind auth or a management port.

```go
if os.Getenv("ENABLE_PPROF") == "true" {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
}
```

For continuous profiling, wire Pyroscope at startup — it runs always-on without redeployment toggles. Neither continuous profiling nor Pyroscope is running anywhere in the current fleet — that's not evidence against them, just that `net/http/pprof` snapshots have covered every incident so far; reach for continuous profiling once that stops being true.

## Do not

- Log AND return the same error — duplicates noise up the stack.
- Use unbounded values (user IDs, raw URLs) as Prometheus label values.
- Omit `ctx` from DB or RPC calls — breaks trace propagation.
- Use `Summary` for latency — can't aggregate across instances.
- Expose pprof on a public port without authentication.
- Call `irate()` in SLO alerting rules — use `rate()`.
- Log PII, credentials, or full request bodies.

## Definition of Done

- Histogram per latency path; `slog.InfoContext(ctx, ...)` everywhere; no PII in attrs.
- Span per service method, DB query, external call; errors via `span.RecordError`; alert rules wired.

## Verify

```sh
curl -s http://localhost:9090/metrics | grep http_request_duration
OTEL_LOG_LEVEL=debug go run ./cmd/server
```
