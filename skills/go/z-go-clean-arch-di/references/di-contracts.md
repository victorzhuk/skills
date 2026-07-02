# DI Contracts

## Container Structs

Group dependencies by role, not by type:

```go
type container struct {
    infra    infraLayer
    services serviceLayer
    usecases usecaseLayer
}

type infraLayer struct {
    db     *pgxpool.Pool
    cache  *redis.Client
    logger *slog.Logger
}

type serviceLayer struct {
    users   *userservice.Service
    auditor *auditservice.Service
}

type usecaseLayer struct {
    accounts *accountuc.UseCase
    orders   *orderuc.UseCase
}
```

Add fields to the matching group. Do not flatten everything into one large struct.

## Full Wiring Example

```go
func newApp(cfg *config.Config) (*App, error) {
    infra, err := buildInfra(cfg)
    if err != nil {
        return nil, fmt.Errorf("build infra: %w", err)
    }
    services := buildServices(infra)
    usecases := buildUsecases(services)
    return &App{container: container{
        infra:    infra,
        services: services,
        usecases: usecases,
    }}, nil
}

func buildInfra(cfg *config.Config) (infraLayer, error) {
    pool, err := pgxpool.New(context.Background(), cfg.Database.DSN)
    if err != nil {
        return infraLayer{}, fmt.Errorf("open db: %w", err)
    }
    return infraLayer{db: pool, logger: cfg.Logger}, nil
}

func buildServices(infra infraLayer) serviceLayer {
    return serviceLayer{
        users:   userservice.New(infra.db, infra.logger),
        auditor: auditservice.New(infra.db),
    }
}

func buildUsecases(svc serviceLayer) usecaseLayer {
    return usecaseLayer{
        accounts: accountuc.New(svc.users, svc.auditor),
        orders:   orderuc.New(svc.users),
    }
}
```

## Provider Methods

Provider methods should not allocate, validate, or branch — they are simple field accessors:

```go
// Good
func (a *App) Orders() usecase.OrderUseCase {
    return a.container.usecases.orders
}

// Bad — lazy init logic belongs in buildUsecases, not here
func (a *App) Orders() usecase.OrderUseCase {
    if a.container.usecases.orders == nil {
        a.container.usecases.orders = orderuc.New(...)
    }
    return a.container.usecases.orders
}
```

## Narrowing Interfaces

When a use case needs only a subset of a service, define a narrow interface locally:

```go
// internal/usecase/notifications/contract.go
type userLookup interface {
    FindByID(ctx context.Context, id string) (*entity.User, error)
}

type UseCase struct {
    users  userLookup   // narrow — doesn't see Create, Delete
    mailer mailerService
}
```

`userservice.Service` satisfies `userLookup` without knowing about it. The use case is testable with a simple stub.

## Testing the Composition Root

Verify the composition root wires without panicking:

```go
func TestNewApp_Wires(t *testing.T) {
    cfg := config.NewForTest()
    app, err := newApp(cfg)
    require.NoError(t, err)
    require.NotNil(t, app.Orders())
    require.NotNil(t, app.Users())
}
```

This catches missing dependencies and nil returns from constructors early — before integration tests.
