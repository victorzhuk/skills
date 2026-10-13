---
name: z-qa-orchestrator
description: "Run acceptance and required regression checks through the project's runner. Use for full QA, test the app, QA reports, or /qa-run. Start with changed acceptance and critical smoke, then the broader merge gate. Scenario contracts belong to [[z-bdd]], failure triage to [[z-qa-debugger]]."
---

# QA Orchestrator

Run the project's acceptance gate and existing required checks. Use its own tooling and the approved verification scope.

## Discover before running

Before picking commands: find the project's runner (Makefile, Taskfile, `package.json` scripts -- see [[z-go-makefile]], [[z-go-taskfile]]), the test frameworks actually wired in (Go `testing` + testcontainers-go, vitest, playwright, pytest), and whether the project already has its own QA-cycle skill or command (a project-local `/qa-run` or `<project>-regression` skill). If one exists, use it -- most projects run tests directly through `go test`/`vitest`/`pytest` wired into CI with no dedicated QA layer at all; only build the phased flow yourself when nothing project-local covers it.

## Phases

Run the requested phases in order. Stop between phases after the first failed phase unless the caller requests continuation. Within a phase, collect the intended failure census without fail-fast; see [[z-qa-debugger]].

### Phase 1: Changed acceptance and critical smoke

- Record the selected scenarios and their public product boundaries before execution.
- Run changed acceptance scenarios and the project's required critical smoke journeys.
- Use browser, running-service, or CLI checks according to the product. Apply [[z-bdd]] for explicit assertions and evidence.
- Run build or setup prerequisites as needed. Preserve required static checks in their established order.

### Phase 2: Merge gate -- default depth

Run this scope when the caller says "run QA" or "test the app" without naming a phase.

- Run the broader required acceptance suite before merge, not only the changed scenarios.
- Preserve existing required regression, lint, type, race, and security checks.
- Run additional unit or integration checks for the named residual risks in the approved plan.
- Discover fixtures, build tags, and dependency setup rather than assuming a mechanism.

### Phase 3: Additional requested checks

- Run load, visual, accessibility, or manual checks when required by the project or the requested scope.
- Use [[z-qa-performance]] for load checks and [[z-qa-browser]] for browser-specific evidence.
- A check already required for acceptance belongs to the gate. Do not defer it because it is expensive.

## Running tests

Always go through the project's own runner -- `make test`, `task test`, `npm test` -- never a raw `go test`/`vitest` call unless no wrapper exists. A wrapper carries build tags, env setup (e.g. `TESTCONTAINERS_RYUK_DISABLED=true`), and coverage flags a raw invocation misses.

Inspect process deadlines, test timeouts, and parallel limits per [[z-testing-strategy]]. Use existing settings or temporary invocation bounds for ordinary runs; do not require a persistent tooling edit merely to run QA. Execute kernel-emitted commands literally through the driver's lifecycle, without added flags or deadlines.

## Reporting

Report each phase inline as you go: name, pass/fail, duration. Close with a SUMMARY table in the same reply.

Apply [[z-bdd]] to the overall verdict. Required skips, pending steps, missing results, blocked execution, and flakes prevent PASS.
Continuing after a failed phase collects evidence. It does not clear the earlier failure.

If the project already keeps a dated QA log (a `docs/qa/`-style tree, for example), append an entry there instead, matching that project's existing format. Don't invent a `results/` directory or a `SUMMARY.md` file on top of a convention that already exists.

## When to reach for a domain skill instead

The phases above cover running the suite. Reach for a narrower skill when the task needs more than that:
- Deep browser exploration, selector healing, ad hoc E2E authoring -> [[z-qa-browser]]
- API contract testing, auth flows -> [[z-qa-api]]
- Load/latency benchmarking beyond a load-smoke check -> [[z-qa-performance]]
- Building a P0/P1/P2 test plan from scratch -> [[z-qa-analyst]]
- Readable BDD scenarios and acceptance evidence -> [[z-bdd]]
- Generating explicitly requested skipped stubs -> [[z-qa-spec-writer]]
- Classifying failures, flaky-test triage, writing a QA report -> [[z-qa-debugger]]
- Visual regression or screenshot diffing, only if the project actually does it -> [[z-qa-browser]]
- Go behavior contracts, Ginkgo/Gomega or Gherkin/godog -> [[z-go-bdd]]
- Table-driven tests, testify, goleak patterns -> [[z-go-testing]]

## Do not

- Do not invent a multi-agent delegation flow -- run the phases yourself, in order.
- Do not start later phases after a failed phase unless the caller requested continuation.
- Do not mandate hurl, oha, vegeta, axe, or Lighthouse -- reach for them only if the project already uses them.
- Do not write a fixed `results/` + `SUMMARY.md` file structure -- report inline, or append to the project's own QA doc convention.
- Do not swap in a raw test command where the project has its own wrapper -- the wrapper carries flags and env setup a raw call misses.

## Verify

- Each phase reports name, pass/fail, duration; the run ends with a SUMMARY table or a doc-tree entry covering every phase attempted.
- A failed phase stops subsequent phases unless continuation was requested; report its failures and incomplete work.
