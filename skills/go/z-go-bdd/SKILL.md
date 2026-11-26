---
name: z-go-bdd
description: "Run Go behavior scenarios with an existing Ginkgo/Gomega or godog harness. Use for step adapters, labels, fixtures, and test reports. See [[z-bdd]] for acceptance contracts."
---

# Go BDD

Implement the agreed behavior contract through the project's Go harness. Use [[z-bdd]] for scenario semantics and acceptance evidence.

Choose the framework that the project uses. A readable behavior contract can also use standard Go tests.

## Workflow

1. Identify the observable contract or the reason an internal change preserves behavior.
2. Inspect existing Go tests, Ginkgo imports, feature files, build tags, and runner targets.
3. Map each agreed scenario to the existing harness. Resolve ambiguous acceptance criteria before changing behavior.
4. Use Ginkgo specs or godog steps as adapters. Keep business rules in the application.
5. Run the affected scenario and the required suite. Follow the project's deadlines and worker limits.
6. Record the scenario, command, result, and report path.

## Pattern A — ginkgo/gomega

Use `Describe`, `When`, and `It` for observable behavior. Register `RunSpecs` once per suite package.

```go
var _ = Describe("Registry List", Label("p1"), func() {
    var tmp string

    BeforeEach(func() {
        tmp = newTempProject()
    })

    When("no config exists", func() {
        It("shows zero runtimes", func() {
            stdout, _, err := runEnt(tmp, "registry", "list")
            Expect(err).NotTo(HaveOccurred())
            Expect(stdout).To(ContainSubstring("0 runtimes"))
        })
    })
})
```

```go
func TestScenarioSuite(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Feature Lifecycle Scenario Suite")
}
```

Labels: `p0` (critical), `p1` (important), `p2` (lower impact). Keep cost and infrastructure labels separate from risk.
Filter a single Ginkgo suite package from its directory with `timeout 5m go test -p 2 -parallel 4 -timeout 4m . -ginkgo.label-filter=p0`.
Follow existing build tags and Make/Task targets. Required acceptance suites must run in the acceptance gate even when ordinary tests exclude them.

Use behavior names such as “shows zero runtimes” for both Ginkgo assertions and Gherkin steps.

## Pattern B — godog/Gherkin

Reference routing — load only the needed file:

- [Gherkin style](references/gherkin-style.md) covers feature files.
- [godog suite](references/godog-suite.md) covers steps and runner setup.
- [Tag taxonomy](references/tag-taxonomy.md) covers CI filters.
- [Report artifacts](references/report-artifacts.md) covers JUnit and Cucumber JSON.
- [Testcontainers patterns](references/testcontainers-pattern.md) covers real persistence and delivery boundaries.
- [Feature context](references/llm-feature-context.md) covers feature files as retrieval input.
- [Review checklist](references/anti-patterns.md) covers common test failures.

Starting points to copy: [assets/feature.template](assets/feature.template) for a tagged `.feature` skeleton, [assets/suite_test.template.go](assets/suite_test.template.go) for the `go test`-driven godog suite with CI report formats.

Use the project's `go test` integration for godog. Preserve an existing CLI runner when required.

## Shared rules

Apply to both patterns:

- Keep `_bdd_test.go`/`_test.go` files near the tested package unless the project has a dedicated BDD package.
- Use `t.Context()` when the Go version and test lifecycle support it. Supply the correct context to suite hooks.
- Reset mutable state before each scenario. Check that scenarios can run in any order.
- Exercise a real persistence or delivery boundary before claiming its behavior.

## Output

When finishing a behavior-changing task, include:

```md
Behavior changed:
- `<file path>`: <Scenario or It description>

Validated:
- `<command>`
- report: `<path>`
```

If you add no behavior test, state why.
