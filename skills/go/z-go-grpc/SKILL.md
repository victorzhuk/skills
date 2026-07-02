---
name: z-go-grpc
description: >
  gRPC and protobuf service design in Go — field evolution and wire
  compatibility, deadline propagation, the status-code/errdetails error
  model, interceptor chain ordering plus otelgrpc's stats-handler wiring,
  streaming vs unary, buf as the schema toolchain (lint, breaking,
  codegen), and keepalive tuning. Use when defining or evolving a .proto
  service, choosing unary vs streaming, wiring gRPC interceptors or a
  stats handler, mapping domain errors to gRPC status codes, or setting up
  buf lint/breaking in CI. Triggers on "protobuf", ".proto", "buf lint",
  "buf breaking", "grpc-go", "connectrpc", "grpc interceptor",
  "status.Error", "errdetails", "grpc-timeout". Does not cover context
  propagation; see [[z-go-context]]. Does not cover OTel span/metric
  patterns; see [[z-go-observability]]. Does not cover domain error
  strategy; see [[z-go-errors]]. Does not cover resource/API semantics;
  see [[z-go-api-design]]. See also: [[z-go-ogen]] (HTTP counterpart).
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
| Server instrumentation | `grpc.StatsHandler(otelgrpc.NewServerHandler())` | never an interceptor — otelgrpc's interceptor forms are deprecated |
| buf breaking category | `WIRE_JSON` | `WIRE` only if you control every client and can promise binary-only encoding |
| Keepalive | library defaults | tune only after a specific idle-connection or GOAWAY incident |
| Client construction | `grpc.NewClient` | never `grpc.Dial`/`DialContext` — deprecated since v1.63 |

## Proto evolution and wire compatibility

Protobuf's wire format has no way to detect a field decoded with a different
definition than it was encoded with. Treat every deployed `.proto` field as
permanent:

- **Never reuse or renumber a field number.** Two servers on different binary
  versions will otherwise decode the same bytes into different fields.
- **Never repurpose a field's meaning** for old clients, even without changing its
  number — add a new field instead and deprecate the old one.
- **Reserve deleted fields and names**, both, so no one accidentally reintroduces
  them and so JSON/text-format encoding of old data keeps parsing:

```proto
message Order {
  reserved 3, 8 to 10;
  reserved "old_status", "legacy_total";

  string id = 1;
  string customer_id = 2;
  Status status = 4;
}
```

- **Additive-only changes are safe by construction:** a new field, a new RPC method,
  a new `enum` value (proto3 tolerates unknown enum values on old clients — reserve
  removed ones, never delete outright). A field rename is wire-compatible (the tag
  number is what's on the wire) but breaks generated call sites — version it like
  any other breaking API change.

| Situation | Do this |
|---|---|
| New optional data on an existing message, old clients still valid | Add a field with a fresh number |
| A field's meaning would change for callers already deployed | New field, reserve the old number/name — never repurpose |
| A whole new capability alongside an existing RPC family | New RPC method on the same service |
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
    - WIRE_JSON
```

`STANDARD` is buf's own lint default — naming and versioning on top of basic
hygiene, a sane starting point. `FILE` is buf's breaking-change default, but it
only guards generated-code file placement; `WIRE_JSON` actually protects wire and
JSON compatibility — worth it the moment anything besides binary wire format
touches these messages (`grpcurl -format json`, a Connect/gRPC-Web client) — set
it explicitly.

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

It earns its keep over `local:` when no dev machine or CI runner should need a
`go install pkg@version` pin or any protoc-gen-* toolchain installed at
all — `buf generate` fetches and runs the plugin from the BSR instead, at the
cost of a network call on every `buf generate` and trusting the BSR's build of
the plugin.

CI gate — lint every push, breaking-check every PR against the target branch:

```sh
buf lint
buf breaking --against '.git#branch=main'
```

`bufbuild/buf-action` runs build+lint+format+breaking in one GitHub Actions job and
annotates the PR — prefer it over the older split `buf-lint-action`/`buf-breaking-action`.

## Deadline propagation

A client sets a deadline on `ctx`; grpc-go encodes it as a `grpc-timeout` header,
already adjusted for elapsed time so clock skew between hosts doesn't matter. The
server decodes it back into the `ctx` your handler receives — you don't construct
this deadline, you inherit it. Passing that same `ctx` into a downstream gRPC or
DB call re-encodes the remaining deadline automatically. The failure mode is
entirely self-inflicted: `context.Background()` on a downstream call silently
drops the deadline (and the trace) the caller already gave up on, so the
downstream call runs unbounded after the original caller has stopped waiting.
General propagation and cancellation rules — timeouts, `WithoutCancel`, value
keys — live in [[z-go-context]]; this is just the gRPC-specific wire behavior.

For streaming RPCs the deadline maps to `stream.Context()`, not a single call — see
Streaming below for checking it inside a send/receive loop.

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
        return nil, status.Error(codes.Internal, "internal error")
    }
    return toProtoOrder(order), nil
}
```

`status.Error`/`status.Errorf` is the transport boundary: use `%v` if you must
interpolate, never `%w` — the domain error chain must not leak past this point (see
[[z-go-errors]] for the general single-handling rule). `codes.Internal` gets a flat
generic message; the real `err` goes to the logging interceptor, not the client.

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
        recoveryUnaryInterceptor,
        authUnaryInterceptor,
        loggingUnaryInterceptor,
    ),
    grpc.ChainStreamInterceptor(
        recoveryStreamInterceptor,
        authStreamInterceptor,
        loggingStreamInterceptor,
    ),
)
```

Order, same reasoning for unary and stream:

1. **Recovery outermost** — a panic anywhere below must never take the process
   down; nothing else is allowed to run unprotected.
2. **Auth next** — reject unauthenticated calls before spending any cycles on
   business logic or logging them as if they mattered.
3. **Logging innermost** — closest to the handler, so it logs the auth-resolved
   identity and the actual outcome/status code.

otelgrpc is not in this chain. `UnaryServerInterceptor`/`StreamServerInterceptor`
are deprecated (otelgrpc v0.46+) in favor of the `grpc.StatsHandler` shown above,
which hooks the full RPC lifecycle, not just call start/end, and wires as its own
`grpc.ServerOption`. Its `TagRPC` callback establishes the span in `ctx` before the
interceptor chain runs, so `trace_id` is already there for auth and logging —
that's why it needs no chain slot. Span/metric patterns once `ctx` carries the span
live in [[z-go-observability]].

## Streaming

Unary is the default. Reach for streaming only when a single request/response
can't hold the payload, or the client needs partial results before the call
finishes — a live feed, a bulk export, a bulk upload. Three shapes:

- **Client streaming** — many requests, one response (bulk upload, batched writes).
- **Server streaming** — one request, many responses (export, live feed).
- **Bidi streaming** — both sides send independently (real-time sync).

Server side, check the stream's own context every iteration — a long loop that
never checks it keeps running (and keeps holding downstream resources) long after
a client has cancelled:

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

Streaming costs more than it looks: a partially-consumed stream isn't retryable the
way an idempotent unary call is, it pins to one backend for its lifetime, and
cancellation must be checked explicitly instead of falling out of a call deadline.
Don't reach for a bidi stream just to dodge N unary calls under a shared deadline —
a batched unary request is usually simpler to retry and version.

## Keepalive and connection tuning

Library defaults, almost never worth touching:

| Setting | Client default | Server default |
|---|---|---|
| Ping interval (`Time`) | disabled — pings never sent | 2h |
| Ping timeout (`Timeout`) | 20s (once pings are enabled) | 20s |
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

## Do not

- Reuse or renumber a proto field, or repurpose its meaning for existing clients —
  reserve the number and name instead.
- Return `codes.Internal` (or any code) with a raw internal `err.Error()` — log the
  detail, return a generic message.
- Use `%w` across the gRPC boundary — wrap internally, convert with `status.Error`
  at the handler.
- Wire `otelgrpc.UnaryServerInterceptor`/`StreamServerInterceptor` into the chain —
  deprecated; use `grpc.StatsHandler(otelgrpc.NewServerHandler())`.
- Call `context.Background()` for a downstream call inside a handler — it drops the
  deadline and trace the caller already gave you.
- Ignore `stream.Context().Done()` in a long streaming loop — a cancelled client
  otherwise keeps the handler goroutine and its downstream work alive.
- Reach for a bidi stream to dodge N unary calls — see the retry/LB cost above.
- Change keepalive settings without a specific dropped-connection incident driving it.
- Call `grpc.Dial`/`DialContext` — deprecated since v1.63; use `grpc.NewClient`.

## Verify

```sh
buf lint
buf breaking --against '.git#branch=main'
buf generate
go build ./... && go vet ./...
grpcurl -plaintext localhost:PORT list   # requires reflection registered
```
