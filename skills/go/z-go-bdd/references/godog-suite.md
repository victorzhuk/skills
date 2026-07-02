# godog Suite

Use `go test` as the runner. The godog CLI is deprecated; keep it only when the project already uses it.

## Minimal suite

```go
package billing_test

import (
    "context"
    "os"
    "testing"

    "github.com/cucumber/godog"
)

func TestBDD(t *testing.T) {
    if err := os.MkdirAll("reports/bdd", 0o755); err != nil {
        t.Fatal(err)
    }

    suite := godog.TestSuite{
        Name: "billing",
        TestSuiteInitializer: func(ctx *godog.TestSuiteContext) {
            InitializeTestSuite(t.Context(), ctx)
        },
        ScenarioInitializer: InitializeScenario,
        Options: &godog.Options{
            Format:   bddFormat(),
            Paths:    []string{"features/billing"},
            Tags:     os.Getenv("BDD_TAGS"),
            TestingT: t,
        },
    }

    if suite.Run() != 0 {
        t.Fatal("non-zero BDD status")
    }
}

func bddFormat() string {
    if os.Getenv("CI") != "" {
        return "pretty,junit:reports/bdd/junit.xml,cucumber:reports/bdd/cucumber.json"
    }
    return "pretty"
}

func InitializeTestSuite(ctx context.Context, suite *godog.TestSuiteContext) {}

func InitializeScenario(ctx *godog.ScenarioContext) {
    steps := newSteps()
    ctx.Given(`^a customer has a valid card "([^"]+)"$`, steps.customerHasValidCard)
    ctx.When(`^the customer checks out an order for (\d+) cents$`, steps.customerChecksOut)
    ctx.Then(`^the order remains "([^"]+)"$`, steps.orderRemains)
}
```

Set `Paths` relative to the test package working directory. If the BDD package lives under `internal/billing`, root-level features may need `../../features/billing`.

## Commands

Prefer project wrappers:

```sh
make bdd
BDD_TAGS='@billing && ~@wip' make bdd
```

Fallback commands:

```sh
go test ./... -run '^TestBDD$'
go test ./internal/billing -run '^TestBDD$/^Gateway_timeout_leaves_order_pending$'
BDD_TAGS='@critical && ~@wip' go test ./... -run '^TestBDD$'
```

## Step definitions

Step functions are adapters between Gherkin and test helpers.

- Return `error` for assertion/setup failures.
- Use `context.Context` in step signatures when state must pass between steps.
- Use `godog.T(ctx)` when an assertion package needs `testing.TB`.
- Keep shared scenario state in a scenario-scoped struct or context value.
- Reset DB/app/provider state before each scenario.

## gherkingen

Use gherkingen to generate boilerplate from `.feature` files when the project accepts generated BDD stubs.

```sh
go install github.com/hedhyw/gherkingen/v4/cmd/gherkingen@latest
gherkingen features/billing/payment.feature > internal/billing/payment_feature_test.go
```

If the project already pins another major version, use that version. gherkingen v4 enables `t.Parallel()` by default; disable it for shared fixtures:

```sh
gherkingen -disable-go-parallel features/billing/payment.feature
```

Generated stubs are a starting point. Replace comments with calls into test helpers; do not leave business behavior only in generated skeletons.
