---
name: z-go-observability
description: "Instrument Go services with slog, Prometheus, OpenTelemetry, or pprof. Use for trace correlation, metrics cardinality, health probes, and private management endpoints."
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

Choose log levels from the project's operating contract. Attach an error attribute when an error caused the event.
Pass request context to context-aware slog methods. A handler can then read request and trace fields.
For separate local and production formats, select a handler during startup. This example uses a console adapter locally.

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

Use bounded label values. User IDs and complete URLs can create an unbounded number of metric series.

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

Instrument operations relevant to the trace. Avoid duplicate spans when an existing integration covers the operation. End each span you create.

## Signal Correlation

### Logs + Traces: attrs.go + enricher.go

A slog handler can add trace and span IDs from the current context to stdout records.

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

Use `otelslog` when the service exports log records through an OpenTelemetry `LoggerProvider`.
Configure its processor, exporter, and shutdown. Decide whether stdout should receive a separate copy.

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

Register pprof routes on a restricted management listener. Enabling a feature flag alone does not restrict network access.

```go
if os.Getenv("ENABLE_PPROF") == "true" {
    mgmtMux.Handle("/debug/pprof/", http.DefaultServeMux) // pprof import side-effect registers on DefaultServeMux
}
```

Use a continuous profiler only when the deployment supports its access controls, overhead, and retention policy.

## Management listener (metrics/pprof isolated)

Use a separate management mux and server for private diagnostics. Bind to a restricted address appropriate to the deployment.

```go
mgmtMux := http.NewServeMux()
mgmtMux.Handle("/metrics", promhttp.HandlerFor(registry, promhttp.HandlerOpts{}))

mgmtSrv := &http.Server{
    Addr:              mgmtAddr, // default ":9090"
    Handler:           mgmtMux,
    ReadHeaderTimeout: 5 * time.Second,
}

g, ctx := errgroup.WithContext(appCtx)
serve := func(srv *http.Server) func() error {
    return func() error {
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            return fmt.Errorf("serve %s: %w", srv.Addr, err)
        }
        return nil
    }
}
g.Go(serve(apiSrv))
g.Go(serve(mgmtSrv))
<-ctx.Done()

drain := func(srv *http.Server) error {
    shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
    defer cancel()
    if err := srv.Shutdown(shutdownCtx); err != nil {
        return fmt.Errorf("shutdown %s: %w", srv.Addr, err)
    }
    return nil
}
apiErr := drain(apiSrv)
mgmtErr := drain(mgmtSrv)
if err := errors.Join(g.Wait(), apiErr, mgmtErr); err != nil {
    return err
}
```

Give each listener a separate drain budget. Preserve each shutdown error.
After a drain failure, follow the bounded recovery policy in [[z-go-entrypoint]].
`Server.Close` does not join handlers. Close and join hijacked connections separately before releasing their dependencies.

The public mux MUST NOT register `/metrics` — scraping and profiling traffic never touches the API listener. Check probe:

```sh
curl -s localhost:9090/metrics | grep http_request_duration
```

## /healthz + /readyz producer contract

Two endpoints, two meanings — never merge them:

- `GET /healthz` reports process liveness. Keep remote dependencies out of this handler.
- `GET /readyz` reports whether the instance can serve traffic. Bound checks for required dependencies. Return a safe failure response.

Register them by hand in the composition root — these handlers live outside generated code (see [[z-go-ogen]]). Consumers hit these paths: Kubernetes probes in [[z-k8s-deploy]] and compose healthchecks in [[z-go-dockerfile]].

## Do not

- Log AND return the same error — duplicates noise up the stack.
- Use unbounded values (user IDs, raw URLs) as Prometheus label values.
- Omit `ctx` from DB or RPC calls — breaks trace propagation.
- Use `Summary` for latency — can't aggregate across instances.
- Expose pprof on a public port without authentication.
- Register `/metrics` or pprof on the public mux — they belong on the management listener only.
- Call `irate()` in SLO alerting rules — use `rate()`.
- Log PII, credentials, or full request bodies.

## Definition of Done

- Check latency histograms for the selected operations. Inspect trace and log attributes for sensitive data.
- Exercise an error path. Check span error recording, status, and the corresponding alert.

## Verification

```sh
curl -s http://localhost:9090/metrics | grep http_request_duration
OTEL_LOG_LEVEL=debug go run ./cmd/server
```
