# Testcontainers Pattern

Use real infrastructure for behavior that depends on persistence, queues, caches, or external protocol contracts. The feature file stays domain-level; container wiring stays in the Go suite.

## Postgres suite setup

```go
package billing_test

import (
    "context"
    "testing"

    "github.com/cucumber/godog"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

type bddEnv struct {
    pg  *postgres.PostgresContainer
    dsn string
}

func TestBDD(t *testing.T) {
    env := &bddEnv{}

    suite := godog.TestSuite{
        Name: "billing",
        TestSuiteInitializer: func(ctx *godog.TestSuiteContext) {
            initializeSuite(t.Context(), ctx, env)
        },
        ScenarioInitializer: func(ctx *godog.ScenarioContext) {
            initializeScenario(ctx, env)
        },
        Options: &godog.Options{
            Format:   "pretty",
            Paths:    []string{"features/billing"},
            TestingT: t,
        },
    }

    if suite.Run() != 0 {
        t.Fatal("non-zero BDD status")
    }
}

func initializeSuite(root context.Context, suite *godog.TestSuiteContext, env *bddEnv) {
    suite.BeforeSuite(func() {
        pg, err := postgres.Run(root,
            "postgres:16-alpine",
            postgres.WithDatabase("payments_test"),
            postgres.WithUsername("test"),
            postgres.WithPassword("test"),
            postgres.BasicWaitStrategies(),
        )
        if err != nil {
            panic(err)
        }

        dsn, err := pg.ConnectionString(root, "sslmode=disable")
        if err != nil {
            panic(err)
        }

        env.pg = pg
        env.dsn = dsn
    })

    suite.AfterSuite(func() {
        _ = testcontainers.TerminateContainer(env.pg)
    })
}
```

## Scenario isolation

Reset state before each scenario:

- truncate mutable tables
- purge queues/topics
- reset fake provider calls
- clear cache keys owned by the test
- seed only the data required by `Given`

Do not share mutable scenario state through globals unless it is guarded and reset.

## Boundary choice

| Boundary | Preferred test double |
|---|---|
| Database | real container |
| Queue/cache | real container for critical flows; contract fake for fast paths |
| External HTTP provider | local fake server with provider contract fixtures |
| Email/SMS/payment gateway | fake adapter with captured calls; real sandbox only in scheduled suite |

Mock-only BDD is acceptable for adapter contracts. It is not enough for persistence, transactions, migrations, or retry/idempotency behavior.
