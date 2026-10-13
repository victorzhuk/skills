# QA Skills

QA planning and autonomous API, browser, performance, and failure-triage workflows.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-qa-analyst](./z-qa-analyst/SKILL.md)** — Plan tests by behavior and risk; map requirements to assertions and execution evidence, distinguishing coverage from proof.
- **[z-qa-api](./z-qa-api/SKILL.md)** — API testing in Go: net/http/httptest for handler-level contract tests and testcontainers-go for real-boundary integration against a live Postgres. Auto-activates for: API testing, REST contract…
- **[z-qa-browser](./z-qa-browser/SKILL.md)** — Test browser flows through available host tools and the project's Playwright runner; verify current page state, meaningful assertions, and bounded execution.
- **[z-qa-debugger](./z-qa-debugger/SKILL.md)** — Test execution without fail-fast, failure classification, flaky detection, and QA report authoring. Auto-activates for: test failure triage, flaky tests, QA report, race conditions, test run…
- **[z-qa-orchestrator](./z-qa-orchestrator/SKILL.md)** — Runs a project's test suite as three phases — smoke, regression, full — stopping at the first failure (opt out with --continue-on-failure). Wraps go test -race, vitest, playwright, and govulncheck…
- **[z-qa-performance](./z-qa-performance/SKILL.md)** — Test load and throughput with user-count or arrival-rate workloads; gate business checks, latency, and errors while bounding generated traffic.
- **[z-qa-spec-writer](./z-qa-spec-writer/SKILL.md)** — Test framework auto-detection (Go testify/ginkgo/stdlib, JS/TS vitest/playwright, Python pytest) and compilable stub generation matched to the repo's real import and assert style.
