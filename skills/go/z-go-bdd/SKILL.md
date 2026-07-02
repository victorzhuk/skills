---
name: z-go-bdd
description: Go BDD and executable behavior contracts — two real patterns, pick by audience. Pattern A is ginkgo/gomega (`Describe`/`When`/`It` plus `Label("p0"/"p1"/"p2")` priority tags), for scenarios only engineers read. Pattern B is Gherkin/godog/gherkingen (`.feature` files, Cucumber JSON), for scenarios non-engineers need to read or author. Use when adding or changing observable Go behavior, writing `.feature` files or `*_bdd_test.go` ginkgo specs, implementing godog steps, generating BDD boilerplate, or asked for BDD/Gherkin/Given-When-Then/acceptance tests.
---

# Go BDD

Use an executable behavior contract before changing observable behavior. Change the contract first, then the code.

## Workflow

1. Classify the task.
   - Observable behavior: API/CLI response, workflow, permission, auth, billing, retry, state transition, persistence effect, external side effect, user-visible error, production bug.
   - Internal-only: private helper, mechanical refactor, generated code, DTO mapping without logic.
2. Inspect the project for an existing harness — `**/*_bdd_test.go` with `ginkgo`/`gomega` imports, `features/**/*.feature` with `godog`, BDD Make/Task targets. Match whatever is already wired.
3. If neither exists, choose by audience:
   - **Pattern A — ginkgo/gomega**: nobody outside engineering reviews or authors this scenario. This is the more common case.
   - **Pattern B — godog/Gherkin**: the scenario itself needs to be readable, or reviewable, by product/support/QA who don't read Go.
4. For observable behavior, write or update the scenario first.
   - If acceptance criteria are ambiguous, draft the scenario and ask for confirmation.
   - If the project has no BDD harness and neither pattern is worth introducing yet, use the nearest behavior-level Go test and ask before adding a dependency.
5. Implement steps/specs as adapters.
   - They prepare state, perform actions, and assert outcomes.
   - Business logic stays in domain/use-case code, not in step or spec functions.
6. Run targeted BDD first, then the relevant suite.
7. Report evidence: file path, scenario/spec name, command, pass/fail result, report path when generated.

## Pattern A — ginkgo/gomega

`Describe`/`When`/`It` nesting; `Label("p0"/"p1"/"p2")` for priority. One `_bdd_test.go` per feature area, one `_suite_test.go` per package registering `RunSpecs`:

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

Labels: `p0` (critical, every push), `p1` (important), `p2` (nice-to-have, slow, or infra-gated — e.g. `Label("p2", "container")`). Filter with `go test ./... -ginkgo.label-filter=p0`. Put suites that shell out to a real binary or hit real infra behind a build tag (`//go:build scenarios`) so plain `go test ./...` stays fast; run the tagged suite through its own Make/Task target.

`Describe`/`When`/`It` text should still read as behavior, not implementation — the same discipline as Gherkin's `Given`/`When`/`Then` (below), just expressed in Go instead of a separate file.

## Pattern B — godog/Gherkin

Reference routing — load only the needed file:

- `references/gherkin-style.md` — writing or reviewing `.feature` files.
- `references/godog-suite.md` — godog harness, step registration, commands.
- `references/tag-taxonomy.md` — tags and CI filters.
- `references/report-artifacts.md` — JUnit/Cucumber JSON outputs and evidence.
- `references/testcontainers-pattern.md` — real DB/queue/cache boundaries.
- `references/llm-feature-context.md` — using features as agent/RAG context.
- `references/anti-patterns.md` — review checklist.

Gherkin rules:

- One scenario proves one behavior.
- `Given` prepares state.
- `When` performs one user/system action.
- `Then` asserts observable outcomes.
- Keep step text in domain language. Avoid function names, table names, selectors, mocks, and transport plumbing unless those are the behavior.
- Use `Scenario Outline` only when the examples table is part of the requirement.
- Use tags for domain, risk, story, and test type.

Use `go test` integration for godog; avoid the deprecated godog CLI unless the project already depends on it.

## Shared rules

Apply to both patterns:

- Keep `_bdd_test.go`/`_test.go` files near the tested package unless the project has a dedicated BDD package.
- Use `t.Context()` where possible. For suite hooks (ginkgo `BeforeEach`/`AfterEach`, godog `TestSuiteInitializer`), pass the context through closures.
- Reset scenario/spec state in hooks; scenarios must not depend on execution order.
- Use testcontainers or contract fakes for real boundaries; do not make mock-only BDD prove persistence, queue, or provider behavior.

## Output

When finishing a behavior-changing task, include:

```md
Behavior changed:
- `<file path>`: <Scenario or It description>

Validated:
- `<command>`
- report: `<path>`
```

If no behavior test was added, state the reason in one sentence.
