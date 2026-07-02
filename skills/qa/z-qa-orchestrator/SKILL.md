---
name: z-qa-orchestrator
description: "Runs a project's own test suite as three sequential phases -- smoke, regression, full -- stopping at the first failure by default (opt out with --continue-on-failure). Wraps native tooling (go test -race, vitest, playwright, govulncheck) through the project's make/task/npm runner instead of a fixed script roster, and defers to a project's own QA-cycle skill or command when one already exists. Auto-activates for: 'run full QA suite', 'test the app', 'QA report', 'regression testing', '/qa-run'. Does not delegate to per-domain z-qa-* skills as sub-agents -- for depth in one domain use [[z-qa-browser]], [[z-qa-api]], [[z-qa-performance]], [[z-qa-analyst]], [[z-qa-spec-writer]], or [[z-qa-debugger]] directly."
---

# QA Orchestrator

Run one project's test suite through three phases -- smoke, regression, full -- using the project's own tooling. Sequential, stop-on-first-failure by default.

## Discover before running

Before picking commands: find the project's runner (Makefile, Taskfile, `package.json` scripts -- see [[z-go-makefile]], [[z-go-taskfile]]), the test frameworks actually wired in (Go `testing` + testcontainers-go, vitest, playwright, pytest), and whether the project already has its own QA-cycle skill or command (a project-local `/qa-run` or `<project>-regression` skill). If one exists, use it -- most projects run tests directly through `go test`/`vitest`/`pytest` wired into CI with no dedicated QA layer at all; only build the phased flow yourself when nothing project-local covers it.

## Phases

Run in order. Stop at the first failure unless the caller passes `--continue-on-failure`.

### Phase 1: Smoke (~3-5 min)
Fast signal before deeper work.
- Lint changed files only, through the project's linter wrapper (`golangci-lint run --new`, `eslint`, etc.)
- `go vet ./...` for touched Go packages
- Unit tests only, no race/coverage: `go test -short ./...`, `vitest run --changed`

### Phase 2: Regression (~15-30 min) -- default depth
Full behavioral suite across every real boundary the project already exercises. Run this when the caller just says "run QA" or "test the app" without naming a phase.
- Go: `go test -race -cover ./...` via the repo's Makefile/Taskfile target, not a raw invocation; integration tests spin up real dependencies through testcontainers-go (e.g. Postgres) -- no docker-compose or kubectl step needed
- JS/TS: full `vitest` run; `playwright test` for first-party E2E specs (see [[z-qa-browser]] for CLI-driven exploratory work, [[z-go-bdd]] for Ginkgo/Gomega or Gherkin behavior contracts)
- `govulncheck ./...` when it's already wired into CI

### Phase 3: Full (~1-2h)
Regression plus everything expensive or manual.
- Everything in Phase 2
- Full Playwright E2E suite, not just changed specs
- Load smoke if the project has a load target: k6 via its own Makefile target (`test-load-smoke`, `test-load`, ...), checking `http_req_duration` p95/p99 and `http_req_failed` against configured thresholds; Locust for worker/queue-shaped load with no HTTP surface (see [[z-qa-performance]])
- The project's manual-smoke checklist, if it keeps one -- walk it, don't skip it

## Running tests

Always go through the project's own runner -- `make test`, `task test`, `npm test` -- never a raw `go test`/`vitest` call unless no wrapper exists. A wrapper carries build tags, env setup (e.g. `TESTCONTAINERS_RYUK_DISABLED=true`), and coverage flags a raw invocation misses.

## Reporting

Report each phase inline as you go: name, pass/fail, duration. Close with a SUMMARY table in the same reply.

If the project already keeps a dated QA log (a `docs/qa/`-style tree, for example), append an entry there instead, matching that project's existing format. Don't invent a `results/` directory or a `SUMMARY.md` file on top of a convention that already exists.

## When to reach for a domain skill instead

The phases above cover running the suite. Reach for a narrower skill when the task needs more than that:
- Deep browser exploration, selector healing, ad hoc E2E authoring -> [[z-qa-browser]]
- API contract testing, auth flows -> [[z-qa-api]]
- Load/latency benchmarking beyond a load-smoke check -> [[z-qa-performance]]
- Building a P0/P1/P2 test plan from scratch -> [[z-qa-analyst]]
- Generating test stubs or BDD specs from a plan -> [[z-qa-spec-writer]]
- Classifying failures, flaky-test triage, writing a QA report -> [[z-qa-debugger]]
- Visual regression or screenshot diffing, only if the project actually does it -> [[z-qa-browser]]
- Go behavior contracts, Ginkgo/Gomega or Gherkin/godog -> [[z-go-bdd]]
- Table-driven tests, testify, goleak patterns -> [[z-go-testing]]

## Do not

- Do not invent a multi-agent delegation flow -- run the phases yourself, in order.
- Do not parallelize phases by default -- sequential with stop-on-first-failure is the real-world pattern; skip ahead only when the caller explicitly passes `--continue-on-failure`.
- Do not mandate hurl, oha, vegeta, axe, or Lighthouse -- reach for them only if the project already uses them.
- Do not write a fixed `results/` + `SUMMARY.md` file structure -- report inline, or append to the project's own QA doc convention.
- Do not swap in a raw test command where the project has its own wrapper -- the wrapper carries flags and env setup a raw call misses.

## Verify

- Each phase reports name, pass/fail, duration; the run ends with a SUMMARY table or a doc-tree entry covering every phase attempted.
- A failed phase halts the run (unless `--continue-on-failure`) and that failure is reported before anything else.
