---
name: z-go-clean-arch-di
description: "Wire Go service dependencies through constructors and a composition root. Use for layer direction, interface ownership, startup, and shutdown. See [[z-go-interfaces]] for type contracts."
---

# Clean Architecture & DI

## Layout

```text
cmd/{service}/main.go      — flags, load config, call app.New(cfg).Run(ctx)
internal/
  app/
    app.go        — exported App type, Run(ctx) error
    bootstrap.go  — phased wiring, private build funcs
    config.go     — config load/validation
    logger.go     — logger setup
  domain/         — entities, value objects, repo/service interfaces (stdlib only)
  usecase/        — use-case structs + narrow local contracts
  service/        — domain services
  infra/          — DB, cache, external APIs — implements domain interfaces
  transport/      — HTTP/gRPC handlers — depends on use-case contracts
```

Give transport adapters their required dependencies. Keep the composition root independent of request handling.

Container structs, a full wiring example, provider methods, interface narrowing, and a composition-root test: [references/di-contracts.md](references/di-contracts.md).

## Phased Wiring

Construct dependencies before their consumers. The example uses three phases in `bootstrap.go`.

```go
type container struct {
    infra    infraLayer
    services serviceLayer
    usecases usecaseLayer
}

func buildContainer(ctx context.Context, cfg *config.Config) (container, error) {
    infra, err := buildInfra(ctx, cfg)
    if err != nil {
        return container{}, fmt.Errorf("build infra: %w", err)
    }
    services := buildServices(infra)
    usecases := buildUsecases(services)
    return container{infra, services, usecases}, nil
}
```

Use the dependency graph to establish initialization order.

## Constructors

Prefer concrete return types and narrow interfaces for dependencies that need a contract:

```go
func NewUserService(repo UserRepository, log *slog.Logger) *UserService
```

Shared protocols, runtime implementation selection, and deliberate API restriction can justify interface returns. See [[z-go-interfaces]].

Consumer structs hold interface-typed fields where callers need that contract:

```go
type OrderUseCase struct {
    users   service.UserService
    auditor service.AuditService
}
```

## Interface Placement

Prefer interfaces at the consumption site:

```go
// domain/usecase/user.go — shared across layers
type UserUseCase interface {
    FindByID(ctx context.Context, id string) (*entity.User, error)
    Create(ctx context.Context, req CreateUserReq) (*entity.User, error)
}

// internal/usecase/orders/contract.go — narrow, local
type userLookup interface {
    FindByID(ctx context.Context, id string) (*entity.User, error)
}
```

Use `domain/` for contracts shared across layers. Use package-local interfaces for deliberately narrower contracts.
Preserve shared or generated protocol ownership when the contract requires another location. See [[z-go-interfaces]].

## Contract Aliases

```go
// internal/app/bootstrap.go — reduce repetition in the wiring func
type (
    userService  = service.UserService
    auditService = service.AuditService
)
```

Never use aliases to hide cross-layer imports that violate direction rules.

## Lifecycle

Assign startup and shutdown to one owner. Preserve an existing blocking `Run` or separate start and stop contract.

```go
func (a *App) Run(ctx context.Context) error {
    srv, shutdown := bootstrap(ctx, a.cfg)

    runCtx, stop := context.WithCancel(ctx)
    defer stop()
    g, gCtx := errgroup.WithContext(runCtx)
    g.Go(func() error {
        defer stop()
        if err := srv.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            return fmt.Errorf("http server: %w", err)
        }
        return nil
    })
    g.Go(func() error {
        <-gCtx.Done()
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        return shutdown(shutdownCtx)
    })
    return g.Wait()
}
```

Return errors to `main`. Use a fresh bounded context to shut down after cancellation.

## Layer Direction

```
Domain      → nothing (stdlib only)
Infra       → Domain
UseCase     → Domain, Infra (via interface)
Transport   → Domain, UseCase (via interface)
App         → all layers (composition root only)
```

Use the project's import checks to enforce dependency direction.

## DI Library Decision

Start with manual constructor injection. Preserve an established DI framework when it meets the lifecycle contract.

Evaluate a library for a concrete discovery or lifecycle requirement. Check its support for startup failure and shutdown order.

For existing Wire code, account for its [archived repository](https://github.com/google/wire) before extending the dependency.

## Composition checks

- Keep concrete implementations at the composition root. Pass each consumer only the dependencies it needs.
- Reject invalid external input at the boundary. Construct internal dependencies before serving requests.
- Avoid global service registration and initialization through `init`.

## Verification

```sh
go build ./...
go-arch-lint check    # or: golangci-lint run --enable depguard
timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./...
```
