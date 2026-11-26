---
name: z-go-ogen
description: "Generate a Go HTTP transport from OpenAPI using ogen. Use for generator pins, handler signatures, response types, validation, or authentication. See [[z-go-api-design]] for the API contract."
---

# OpenAPI transport with ogen

Edit the OpenAPI contract first. Regenerate the transport with the project's pinned ogen version.

## Spec-driven flow

1. Locate and edit the project's input specification.
2. Regenerate the transport package.
3. Implement the affected handler methods.
4. Wire the handler into the HTTP server.

Fix the specification, generator input, or generator configuration when generated output differs from the contract.

## Running ogen

Pin `github.com/ogen-go/ogen/cmd/ogen` to the project version. The directive below names the tool. On older Go versions, retain a pinned tools file or generator wrapper. [Generator setup](https://ogen.dev/docs/intro/)

**`go.mod` tool directive** (Go 1.24+, preferred):

```go
// go.mod
tool github.com/ogen-go/ogen/cmd/ogen
```

```sh
go tool ogen --target internal/api/gen --package gen --clean openapi.yaml
```

**`//go:generate` directive** in a dedicated file:

```go
// generate.go (package main or package yourpkg)
//go:generate go tool ogen --target internal/api/gen --package gen --clean openapi.yaml
```

```sh
go generate ./...
```

**Make/Task target** — wrap the invocation so flags and paths stay consistent:

```makefile
.PHONY: generate
generate:
	go tool ogen --target internal/api/gen --package gen --clean openapi.yaml
```

The `--clean` flag removes stale generated files. Use it only with a verified output directory containing generated files exclusively.

## Generated code boundary

ogen emits a package (conventionally `gen/`) that you must never hand-edit:

| Generated | Never touch |
|---|---|
| `Handler` interface | Add methods here via the spec |
| `UnimplementedHandler` | Do not override in the generated file |
| Request/response structs | Extend via the spec, not via embedding |
| `SecurityHandler` interface | Implement in your own file |
| The HTTP server (`*Server`) | Instantiate the generated server |

All customisation goes in files outside the generated package.

## Implementing handlers

Implement the generated handler interface. Embed `gen.UnimplementedHandler` only when a temporary 501 response is acceptable.

```go
type Handler struct {
    gen.UnimplementedHandler
    users UserUsecase
}

func NewHandler(deps Deps) *Handler {
    return &Handler{users: deps.Users}
}

func (h *Handler) CreateUser(ctx context.Context, req *gen.CreateUserReq) (*gen.User, error) {
    u, err := h.users.Create(ctx, req.Name)
    if err != nil {
        return nil, fmt.Errorf("create user: %w", err)
    }
    return &gen.User{ID: u.ID.String(), Name: u.Name, Email: u.Email}, nil
}
```

Inspect the generated handler signature for the operation. Return its generated response type in the response slot. Use the error slot only for failures that implement its error contract.

## Mapping generated ↔ domain types

Convert generated types at the transport boundary. Keep small mappings inline. Extract a mapping file when multiple handlers share conversion rules.

```go
// genmap.go — worth splitting out once conversions multiply across handlers

func toGenUser(u domain.User) *gen.User {
    return &gen.User{
        ID:    u.ID.String(),
        Name:  u.Name,
        Email: u.Email,
    }
}

func toGenStatus(s domain.Status) (gen.Status, error) {
    gs := gen.Status(s)
    if err := gs.Validate(); err != nil {
        return "", fmt.Errorf("map status %q: %w", s, err)
    }
    return gs, nil
}
```

Always call `gs.Validate()` after casting a domain enum to a gen enum. A bare cast
compiles but silently passes unknown values to clients when the two sets drift.

## Security handlers

Implement the generated `SecurityHandler` interface in its own file. ogen invokes it
before calling the operation handler, based on the security schemes declared in the spec.

Inspect the generated security interface and the pinned error handler. Return safe verification errors. Test the configured status mapping for authentication and authorization failures.

## Validation and error responses

Keep request-shape validation in the generated transport and business validation in the use case. Declare each expected error response in the OpenAPI spec, regenerate, then implement the actual generated response signature. Test a success, not-found, validation failure, and denied authorization against the real generated server. Unexpected internal errors must be logged once and translated to a safe transport response.

## Wiring the server

Instantiate `*gen.Server` with your handler and security handler, then attach it to your
router. Keep this in the composition root — typically `internal/app/`:

```go
srv, err := gen.NewServer(handler, securityHandler)
if err != nil {
    return fmt.Errorf("new gen server: %w", err)
}
mux.Handle("/api/v1/", http.StripPrefix("/api/v1", srv))
```

Register operational probes where the deployment expects them. Keep separately owned probes outside the generated business transport. See [[z-go-observability]].

```go
mux.HandleFunc("/healthz", healthzHandler)
mux.HandleFunc("/readyz", readyzHandler)
```

A build catches incompatible generated signatures. Behavior changes can still compile, especially with an embedded fallback handler.

See [[z-go-clean-arch-di]] for how the handler's use-case dependencies get wired.

## Verification

```sh
go generate ./...   # or your make/task target
go build ./...
go vet ./...
```

Run requests against the generated router. Check status, body, validation, authorization, and any operation that could return a fallback 501.
