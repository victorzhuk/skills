---
name: z-go-grpc
description: "Design Go gRPC services and protobuf contracts. Use for binary and JSON compatibility, Buf checks, deadlines, status details, streaming, and interceptor order."
---

# gRPC services

gRPC is the RPC half of an OpenAPI-first shop: internal service-to-service calls go
over gRPC+protobuf, external HTTP goes through ogen ([[z-go-ogen]]). The proto file
is the contract — treat it with the same discipline as `openapi.yaml`: change it
first, regenerate, then implement.

## Quick reference

| Decision | Default | Reach for the alternative when |
|---|---|---|
| Transport | `grpc-go` (`google.golang.org/grpc`) | connectrpc when browser/curl clients matter more than the existing grpc-go/xDS ecosystem |
| RPC shape | unary | streaming once one request/response can't carry the payload, or the client needs partial results before completion |
| Server instrumentation | `grpc.StatsHandler(otelgrpc.NewServerHandler())` | Attach telemetry to the RPC lifecycle |
| Buf compatibility category | `FILE` | `WIRE_JSON` covers JSON and binary formats. `WIRE` covers the binary format. |
| Keepalive | library defaults | tune only after a specific idle-connection or GOAWAY incident |
| Client construction | `grpc.NewClient` | never `grpc.Dial`/`DialContext` — deprecated since v1.63 |

## Proto evolution and wire compatibility

Preserve the field number and meaning for deployed clients. Add a field with a new number when the meaning changes. After removing a field, reserve its number and name to prevent reuse. Reservations do not restore its JSON representation.

```proto
message Order {
  reserved 3, 8 to 10;
  reserved "old_status", "legacy_total";

  string id = 1;
  string customer_id = 2;
  Status status = 4;
}
```

An added field is usually safe on the binary wire. ProtoJSON readers can reject unknown fields. A rename can break JSON and generated code. A new enum value can break exhaustive consumers. Exercise each supported encoding and generated client.

See [binary compatibility](https://protobuf.dev/programming-guides/proto3/#binary-wire-safe-changes) and [ProtoJSON compatibility](https://protobuf.dev/programming-guides/json/#json-wire-safety).

| Situation | Do this |
|---|---|
| New optional data on an existing message, old clients still valid | Add a field with a fresh number |
| Changed field meaning | Deprecate the old field. Reserve its name and number after removal. |
| New RPC | Deploy server support before clients call it, or handle `UNIMPLEMENTED` |
| Backward-incompatible request/response reshape | New message type (`CreateOrderV2Request`) or a new versioned RPC — never mutate an existing message's wire shape |

## buf toolchain

`buf.yaml` (v2) declares the module and the lint/breaking policy:

```yaml
version: v2
modules:
  - path: proto
lint:
  use:
    - STANDARD
breaking:
  use:
    - FILE
```

Use `STANDARD` for Buf's default lint rules. Select the breaking category from the public contract. `FILE` and `PACKAGE` protect generated source at different scopes. `WIRE_JSON` and `WIRE` cover encoding compatibility. See [Buf breaking rules](https://buf.build/docs/breaking/rules/).

`buf.gen.yaml` (v2) wires plugins under `local:` — a plain `$PATH` lookup for a
`protoc-gen-*` binary. Pin the installed plugin version the same way in dev and
CI (a pinned `go install pkg@version`, not a floating `@latest`), same discipline
as any other codegen dependency:

```yaml
version: v2
clean: true
plugins:
  - local: protoc-gen-go
    out: gen/go
    opt: paths=source_relative
  - local: protoc-gen-go-grpc
    out: gen/go
    opt: paths=source_relative
inputs:
  - directory: proto
```

`remote:` swaps that `$PATH` lookup for a BSR-hosted plugin, pinned by tag
instead of `go install`:

```yaml
version: v2
clean: true
plugins:
  - remote: buf.build/protocolbuffers/go:v1.36.11
    out: gen/go
    opt: paths=source_relative
inputs:
  - directory: proto
```

Use a remote plugin when the build must run without a local plugin executable. Generation then depends on the Buf Schema Registry.

CI gate — lint every push, breaking-check every PR against the target branch:

```sh
buf lint
buf breaking --against '.git#branch=master'
```

`bufbuild/buf-action` runs build+lint+format+breaking in one GitHub Actions job and
annotates the PR — prefer it over the older split `buf-lint-action`/`buf-breaking-action`.

## Deadline propagation

Set a deadline on the client context. gRPC sends the remaining timeout. Pass the handler context to downstream RPCs and database calls. A new background context discards the request deadline and trace.
See [[z-go-context]] for deadline and value propagation. For a streaming RPC, use `stream.Context()` throughout the send or receive loop.

## Error model

Map domain errors to gRPC status codes at the handler boundary, mirroring the
ogen handler mapping in [[z-go-ogen]] — same idea, different transport:

| Domain condition | Code |
|---|---|
| Not found | `codes.NotFound` |
| Validation failure | `codes.InvalidArgument` |
| Conflict / duplicate | `codes.AlreadyExists` |
| Caller lacks permission | `codes.PermissionDenied` |
| Missing/invalid credentials | `codes.Unauthenticated` |
| Rate limited / quota exceeded | `codes.ResourceExhausted` |
| State machine precondition unmet | `codes.FailedPrecondition` |
| Deadline hit before completion | `codes.DeadlineExceeded` |
| Downstream dependency unreachable | `codes.Unavailable` |
| Anything unexpected | `codes.Internal` |

```go
func (s *OrderServer) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.GetOrderResponse, error) {
    order, err := s.orders.ByID(ctx, req.Id)
    switch {
    case errors.Is(err, domain.ErrNotFound):
        return nil, status.Error(codes.NotFound, "order not found")
    case err != nil:
        slog.ErrorContext(ctx, "get order failed", "err", err)
        return nil, status.Error(codes.Internal, "internal error")
    }
    return toProtoOrder(order), nil
}
```

Convert internal errors at the transport boundary. Log the cause once before returning a public status. If an interceptor owns translation, preserve the cause until it reaches that interceptor. Keep request summaries separate.

For structured, machine-parseable detail (field violations, quota info), attach
`errdetails` instead of stuffing it into the message string:

```go
st := status.New(codes.InvalidArgument, "invalid order")
st, err := st.WithDetails(&errdetails.BadRequest{
    FieldViolations: []*errdetails.BadRequest_FieldViolation{
        {Field: "quantity", Description: "must be positive"},
    },
})
if err != nil {
    return nil, status.Error(codes.Internal, "internal error")
}
return nil, st.Err()
```

## Interceptor chain and otelgrpc

Interceptors nest — the first argument to `grpc.ChainUnaryInterceptor` is
outermost, the last is closest to the handler:

```go
srv := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
    grpc.ChainUnaryInterceptor(
        loggingUnaryInterceptor,
        recoveryUnaryInterceptor,
        authUnaryInterceptor,
    ),
    grpc.ChainStreamInterceptor(
        loggingStreamInterceptor,
        recoveryStreamInterceptor,
        authStreamInterceptor,
    ),
)
```

Test the chain on success, authentication failure, and panic. The outer logger records the final status. Recovery protects inner calls only. Expose identity through explicit request attributes if the outer logger needs it.

Register `otelgrpc.NewServerHandler()` as a stats handler. Its `TagRPC` method attaches the span before the interceptor chain runs. Use the span context in authentication and request logging. See [[z-go-observability]].

## Streaming

Unary is the default. Reach for streaming only when a single request/response
can't hold the payload, or the client needs partial results before the call
finishes — a live feed, a bulk export, a bulk upload. Three shapes:

- **Client streaming** — many requests, one response (bulk upload, batched writes).
- **Server streaming** — one request, many responses (export, live feed).
- **Bidi streaming** — both sides send independently (real-time sync).

Inspect the stream context inside long loops. Stop downstream work when the client cancels.

```go
func (s *ExportServer) StreamOrders(req *pb.StreamOrdersRequest, stream pb.ExportService_StreamOrdersServer) error {
    ctx := stream.Context()
    for order := range s.orders.Iter(ctx, req.CustomerId) {
        if err := ctx.Err(); err != nil {
            return status.FromContextError(err).Err()
        }
        if err := stream.Send(toProtoOrder(order)); err != nil {
            return fmt.Errorf("send order: %w", err)
        }
    }
    return nil
}
```

Client side, `io.EOF` from `Recv()` is a clean end of stream, not an error to wrap:

```go
for {
    resp, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        return fmt.Errorf("receive order: %w", err)
    }
    process(resp)
}
```

Use a batch unary call when the caller must retry the entire operation. A stream stays on one backend. Define a resume protocol if a disconnected client must continue partway through.

## Keepalive and connection tuning

Library defaults, almost never worth touching:

| Setting | Client default | Server default |
|---|---|---|
| Ping interval (`Time`) | disabled — pings never sent | 2h |
| Ping timeout (`Timeout`) | 20s with client pings | 20s |
| `EnforcementPolicy.MinTime` | — | 5m |

Touch these only for a specific, already-observed problem:

- A cloud load balancer or NAT kills idle connections before gRPC's own keepalive
  fires — lower the client's `Time` below that idle timeout.
- A streaming-heavy client legitimately needs faster pings than the server allows.

If you lower the client's ping interval, lower the server's `EnforcementPolicy.MinTime`
to match. Skip that and the server tears the connection down with
`GOAWAY ENHANCE_YOUR_CALM`, which shows up days later as an unexplained connection
drop, not as a keepalive misconfiguration.

## grpc-go vs connectrpc

| | grpc-go | connectrpc (connect-go) |
|---|---|---|
| Wire protocol | gRPC over HTTP/2 only | gRPC + gRPC-Web + Connect from the same handler, no proxy |
| Browser/curl debugging | needs a gRPC-Web proxy (Envoy) or `grpcurl` | plain HTTP — curl, Postman, browser `fetch` work directly |
| Codegen | `protoc-gen-go` + `protoc-gen-go-grpc` | `protoc-gen-connect-go` (local plugin, same wiring as grpc-go's) |
| Ecosystem | de facto standard everywhere, deep xDS/service-mesh integration | newer, Go/TS-first, passes the full gRPC conformance suite |
| Reach for it when | already on grpc-go infra, need xDS/mesh integration, polyglot fleet | want browser clients without an Envoy hop, or need plain HTTP/1.1 reachability |

Default to grpc-go for internal service-to-service RPC on this stack — external
HTTP, including anything a browser or Telegram Mini App talks to, already goes
through ogen. Reach for connectrpc only if a concrete client needs gRPC-Web or
plain-HTTP access without standing up a proxy.

## Transport integration

- Protect internal errors at each transport boundary.
- Register OpenTelemetry with `grpc.StatsHandler(otelgrpc.NewServerHandler())`.
- Use `grpc.NewClient` in versions that support it. Review resolver defaults when migrating from `grpc.Dial`.

## Checks

```sh
buf lint
buf breaking --against '.git#branch=master'  # use the project's compatibility baseline
buf generate
go build ./... && go vet ./...
grpcurl -plaintext localhost:PORT list   # requires reflection registered
```

Exercise an old client against the new server and a new client against the old server. Check binary and JSON consumers where supported.
