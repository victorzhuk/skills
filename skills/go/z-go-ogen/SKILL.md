---
name: z-go-ogen
description: OpenAPI-first HTTP transport in Go using ogen (github.com/ogen-go/ogen). Use when editing an OpenAPI spec, regenerating the transport layer, or implementing handlers against the generated Server interface. Triggers on "ogen", "go tool ogen", "openapi.yaml", "generated Server interface", "SecurityHandler", "UnimplementedHandler". Does not cover database access, custom codegen, or contract semantics; see [[z-go-sqlc]], [[z-go-codegen-patterns]], and [[z-go-api-design]].
---

# OpenAPI transport with ogen

ogen reads an OpenAPI 3 spec and emits a complete, type-safe HTTP transport layer:
request/response structs, a `Handler` interface (one method per operation), a
`SecurityHandler` interface, an HTTP server, and input validation. The spec is the
single source of truth — change it first, then regenerate.

## Spec-driven flow

1. Edit `openapi.yaml` (or wherever your spec lives — the path is a project convention,
   not enforced by ogen).
2. Regenerate the transport package.
3. Implement the affected handler methods.
4. Wire the handler into the HTTP server.

Never change the generated package directly. If the generated output is wrong, the spec
or the `ogen` invocation is wrong — fix those.

## Running ogen

Three equivalent approaches — pick one per project, commit it, and use it consistently.

**`go.mod` tool directive** (Go 1.21+, preferred):

```go
// go.mod
tool github.com/ogen-go/ogen
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

The `--clean` flag removes stale generated files on each run. Always pass it.

## Generated code boundary

ogen emits a package (conventionally `gen/`) that you must never hand-edit:

| Generated | Never touch |
|---|---|
| `Handler` interface | Add methods here via the spec |
| `UnimplementedHandler` | Do not override in the generated file |
| Request/response structs | Extend via the spec, not via embedding |
| `SecurityHandler` interface | Implement in your own file |
| The HTTP server (`*Server`) | Instantiate; do not edit |

All customisation goes in files outside the generated package.

## Implementing handlers

Define a struct that satisfies the generated `Handler` interface. Embed
`gen.UnimplementedHandler` to get default `501 Not Implemented` responses for any
operation you have not yet wired up — this is safe during incremental development:

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

Return the typed response struct on success, or an error on failure. For domain errors
that map to specific HTTP status codes, return the corresponding generated error response
type (e.g. `*gen.NotFoundResponse`, `*gen.ValidationErrorResponse`) — ogen dispatches on
the concrete type.

## Mapping generated ↔ domain types

A dedicated `genmap.go` file per handler package is a good pattern once the mapping
surface grows — it keeps conversions out of handler methods and makes drift between
the gen package and domain enums visible in one place. At smaller scale, building the
`*gen.User{...}` literal directly inside the handler method (like `CreateUser` above)
is equally valid — most real ogen consumers do exactly that.

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

```go
type SecurityHandler struct {
    tokens TokenVerifier
}

func (s *SecurityHandler) HandleBearerAuth(
    ctx context.Context,
    operationName string,
    t gen.BearerAuth,
) (context.Context, error) {
    claims, err := s.tokens.Verify(t.Token)
    if err != nil {
        return ctx, ogenerrors.ErrSecurityRequirementIsNotSatisfied
    }
    return WithClaims(ctx, claims), nil
}
```

Return `ogenerrors.ErrSecurityRequirementIsNotSatisfied` on auth failure — ogen translates
this to a `401` response automatically.

## Validation and error responses

ogen validates incoming requests against the spec schema before your handler is called,
so you do not need to re-validate request shape. Handle domain-level errors explicitly:

```go
func (h *Handler) GetUser(ctx context.Context, params gen.GetUserParams) (*gen.User, error) {
    u, err := h.users.ByID(ctx, params.ID)
    if errors.Is(err, domain.ErrNotFound) {
        return nil, &gen.NotFoundResponse{Message: "user not found"}
    }
    if err != nil {
        return nil, fmt.Errorf("get user: %w", err)
    }
    return toGenUser(u), nil
}
```

For structured validation errors (field-level codes), define the error response shape in
the spec and return its generated type from the handler. Never invent error codes outside
the spec — extend the enum in `openapi.yaml` first, then regenerate.

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

See [[z-go-clean-arch-di]] for how the handler's use-case dependencies get wired.

## Verify

```sh
go generate ./...   # or your make/task target
go build ./...
go vet ./...
```

If `go build` fails after regeneration, the spec change is inconsistent with the handler
implementations — find every method on your `Handler` struct whose signature no longer
matches the regenerated interface and update it. The compiler output names each mismatch.
