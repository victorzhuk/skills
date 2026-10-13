---
name: z-go-bdd
description: "Wire Go behavior scenarios through existing Ginkgo/Gomega or godog harnesses. Use for Go BDD suites, step adapters, tags, and runner reports. Shared readable contracts and acceptance evidence belong to [[z-bdd]]. Test selection belongs to [[z-testing-strategy]]."
---

# Go BDD

Implement the agreed behavior contract through the project's Go harness. Use [[z-bdd]] for scenario semantics and acceptance evidence.

Ginkgo and godog are runner choices. Neither framework is required merely to write a readable behavior contract.

## Workflow

1. Classify the task.
   - Observable behavior: API/CLI response, workflow, permission, auth, billing, retry, state transition, persistence effect, external side effect, user-visible error, production bug.
   - Internal-only: private helper, mechanical refactor, generated code, DTO mapping without logic.
2. Inspect the project for an existing harness — `**/*_bdd_test.go` with `ginkgo`/`gomega` imports, `features/**/*.feature` with `godog`, BDD Make/Task targets. Match whatever is already wired.
3. Preserve an existing harness and map readable scenarios to its executable assertions.
   - **Pattern A — ginkgo/gomega**: use when already adopted or chosen for Go scenario execution.
   - **Pattern B — godog/Gherkin**: use when the project chooses executable `.feature` files.
4. For observable behavior, write or update the scenario first.
   - If acceptance criteria are ambiguous, draft the scenario and ask for confirmation.
   - Without a BDD harness, use readable scenarios with the existing runner. Treat new dependencies as a separate tooling decision.
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

Labels: `p0` (critical), `p1` (important), `p2` (lower impact). Keep cost and infrastructure labels separate from risk.
Filter with `timeout 5m go test -parallel 4 -p 2 -timeout 5m ./... -ginkgo.label-filter=p0` when no wrapper exists.
Follow existing build tags and Make/Task targets. Required acceptance suites must run in the acceptance gate even when ordinary tests exclude them.

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

Starting points to copy: [assets/feature.template](assets/feature.template) for a tagged `.feature` skeleton, [assets/suite_test.template.go](assets/suite_test.template.go) for the `go test`-driven godog suite with CI report formats.

Follow [[z-bdd]] for the shared contract. Use `references/gherkin-style.md` for syntax examples and step semantics.

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
