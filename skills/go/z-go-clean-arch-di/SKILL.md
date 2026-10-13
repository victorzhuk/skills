---
name: z-go-clean-arch-di
description: Clean architecture wiring, layer direction, and dependency injection for Go services. Use when wiring composition roots, designing service/use-case interfaces, choosing a DI approach (manual vs library), phased injection, or a blocking Run(ctx) lifecycle. Triggers on "composition root", "DI library", "constructor injection", "samber/do", "google/wire", "uber-go/fx". Interfaces are [[z-go-interfaces]]; bounded-context boundaries [[z-domain-modeling]].
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

Transport never imports `internal/app`. It receives its deps through provider interfaces.

Container structs, a full wiring example, provider methods, interface narrowing, and a composition-root test: [references/di-contracts.md](references/di-contracts.md).

## Phased Wiring

Build in three phases so construction order is explicit — this lives in `bootstrap.go`:

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

Infra → services → usecases. Never reverse.

## Constructors

Return concrete structs; accept interface-typed params:

```go
// correct
func NewUserService(repo UserRepository, log *slog.Logger) *UserService

// wrong — leaks interface from implementation package
func NewUserService(repo UserRepository, log *slog.Logger) UserServiceInterface
```

Consumer structs hold interface-typed fields:

```go
type OrderUseCase struct {
    users   service.UserService
    auditor service.AuditService
}
```

## Interface Placement

Interfaces belong at the consumption site, not the implementation site:

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

Expose one owned blocking `Run(ctx) error` when that fits the existing lifecycle; preserve an approved Start/Shutdown seam. `bootstrap` wires the app and returns an internal shutdown closure that `Run` owns; nothing outside `app.go` calls shutdown directly.

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

Never call `os.Exit` inside `Run` — the caller (`main`) decides logging and exit code. Shutdown always runs on a fresh context (the parent is already cancelled by the time `gCtx.Done()` fires).

## Layer Direction

```
Domain      → nothing (stdlib only)
Infra       → Domain
UseCase     → Domain, Infra (via interface)
Transport   → Domain, UseCase (via interface)
App         → all layers (composition root only)
```

Enforce with `go-arch-lint`, `depguard`, or a custom CI check — violations accumulate silently otherwise.

## DI Library Decision

Prefer manual constructor injection for new wiring. Preserve an established DI framework; constructor count alone does not justify a migration.

Reach for a DI library only once you hit a concrete need manual wiring can't
satisfy on its own — dynamic plugin loading, or a lifecycle graph so tangled
that phased build funcs stop being readable. Until that need is real, adding
one is speculative complexity for a problem manual wiring already solves.

`google/wire` is archived and no longer maintained: keep it as a legacy maintenance branch, not a new dependency recommendation ([repository status](https://github.com/google/wire)). For a justified library choice, `uber-go/fx` is reflect-based with rich lifecycle hooks but
steeper learning curve; `samber/do` is generic-based with built-in health
checks and graceful shutdown.

## Quick Reference

| Pattern | Rule |
|---|---|
| Composition root | `internal/app/` — only package that knows all concrete types |
| Phased wiring | infra → services → usecases, never reverse |
| Constructors | return concrete struct, accept interface params |
| Interface placement | consumer side or `domain/`, not implementation side |
| Contract aliases | for readability in `bootstrap.go`, not to hide bad imports |
| Lifecycle | one blocking `Run(ctx) error` in `app.go`; shutdown is an internal closure |
| DI library | manual constructor injection by default, regardless of scale |
| Nil validation | check at external API boundaries only, not inside internal graph |
| Layer direction | enforced by lint tool in CI |
| Service locator | never pass the container as a dependency |
| Global vars / init() | never use for service setup |

## Verify

```sh
go build ./...
go-arch-lint check    # or: golangci-lint run --enable depguard
timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./...
```
