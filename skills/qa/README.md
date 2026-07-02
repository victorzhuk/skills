# QA Skills

QA planning and autonomous API, browser, performance, and failure-triage workflows.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-qa-analyst](./z-qa-analyst/SKILL.md)** — Codebase research and prioritized test-plan authoring: a requirements-traceability matrix tiered P0/P1/P2, backed by the project's own coverage tool.
- **[z-qa-api](./z-qa-api/SKILL.md)** — Go API testing with net/http/httptest for handler contract tests and testcontainers-go for real-boundary Postgres integration.
- **[z-qa-browser](./z-qa-browser/SKILL.md)** — Autonomous browser testing with playwright-cli, a ref-based token-efficient CLI; covers E2E flows and rare visual-regression needs via Playwright's `toHaveScreenshot()`.
- **[z-qa-debugger](./z-qa-debugger/SKILL.md)** — Test execution without fail-fast, failure classification, flaky detection, and QA report authoring.
- **[z-qa-orchestrator](./z-qa-orchestrator/SKILL.md)** — Runs a project's own test suite as three sequential phases — smoke, regression, full — through its existing make/task/npm runner.
- **[z-qa-performance](./z-qa-performance/SKILL.md)** — Load and throughput testing with k6 (Makefile-wired smoke/load/stress/spike targets) and Locust for non-HTTP worker/queue load.
- **[z-qa-spec-writer](./z-qa-spec-writer/SKILL.md)** — Test framework auto-detection and compilable stub generation matched to the repo's real import and assert style.
