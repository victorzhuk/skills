# Go Skills

Go engineering discipline: architecture, testing, database, observability, security, performance, and tooling.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-go-bdd](./z-go-bdd/SKILL.md)** — Go BDD and executable behavior contracts with Gherkin, godog, gherkingen, Cucumber JSON, acceptance criteria, living documentation, and behavior-first dev sessions.
- **[z-go-ci](./z-go-ci/SKILL.md)** — GitHub Actions CI/CD for Go projects — test matrix, race detection, golangci-lint, govulncheck, CodeQL, GoReleaser, Dependabot/Renovate, and Docker image pipelines.
- **[z-go-clean-arch-di](./z-go-clean-arch-di/SKILL.md)** — Clean architecture wiring, layer direction enforcement, and dependency injection patterns for Go services.
- **[z-go-cobra-patterns](./z-go-cobra-patterns/SKILL.md)** — Cobra command-tree patterns for Go CLIs — command/subcommand shape, RunE vs Run, PersistentPreRunE hook chain, args validators, flag binding, provider interfaces, JSON/human output, shell…
- **[z-go-codegen-patterns](./z-go-codegen-patterns/SKILL.md)** — Use when authoring Go code generators, scaffold tools, AST manipulation, template-based codegen, golden-file tests, or YAML-driven generation pipelines. Also use when debugging generated…
- **[z-go-concurrency](./z-go-concurrency/SKILL.md)** — Goroutines, channels, sync primitives, worker pools, and pipeline patterns for production Go.
- **[z-go-context](./z-go-context/SKILL.md)** — Idiomatic context.Context usage in Go — propagation, cancellation, timeouts, deadlines, WithoutCancel, and request-scoped values.
- **[z-go-database](./z-go-database/SKILL.md)** — Safe, explicit database access in Go — parameterized queries, NULLable columns, transactions, isolation levels, connection pool, and migration tooling.
- **[z-go-documentation](./z-go-documentation/SKILL.md)** — Go documentation conventions — godoc comments, package comments, README structure, CONTRIBUTING, CHANGELOG, Example tests, API docs, and llms.txt.
- **[z-go-env-v11](./z-go-env-v11/SKILL.md)** — Parse environment configuration in Go with caarlos0/env v11 — generics, env.Options, struct tags, custom parsers, and injecting a custom env source for hermetic tests.
- **[z-go-errors](./z-go-errors/SKILL.md)** — Idiomatic Go error handling, wrapping, inspection, and hygiene — the single handling rule, sentinel vs typed errors, panic discipline, and audit recipes.
- **[z-go-feature-flags](./z-go-feature-flags/SKILL.md)** — Feature flag lifecycle in a Go service — typed flag constants, a layered Evaluator (env kill-switch → remote provider → default), global vs per-user flag surfacing, fail-open/fail-closed…
- **[z-go-goose](./z-go-goose/SKILL.md)** — Schema migrations for Go services using goose (github.com/pressly/goose) — numbered SQL files, up/down annotation blocks, PL/pgSQL and multi-statement wrapping with StatementBegin/End, em…
- **[z-go-interfaces](./z-go-interfaces/SKILL.md)** — Interface design, struct embedding, type assertions, compile-time checks, receiver rules, and generics vs interfaces in Go.
- **[z-go-lint](./z-go-lint/SKILL.md)** — Configure and run golangci-lint, suppress warnings correctly, fix common lint findings, and integrate linting into CI/pre-commit hooks.
- **[z-go-llm-streaming](./z-go-llm-streaming/SKILL.md)** — Wire an LLM chat feature end-to-end in Go — provider-agnostic ChatCompleter interface, resilience and instrumentation decorators, and Server-Sent Events streaming to HTTP clients.
- **[z-go-makefile](./z-go-makefile/SKILL.md)** — Author a clean Makefile for a Go project's inner loop — DRY build recipes, order-only dir prereqs, self-documenting help, version stamping, go tool codegen, and test/lint layering.
- **[z-go-modernize](./z-go-modernize/SKILL.md)** — Modernize Go code and tooling to current idioms (Go 1.21–1.26). Covers deprecated package replacements, language feature adoption, stdlib upgrades, and test/bench patterns.
- **[z-go-naming](./z-go-naming/SKILL.md)** — Go naming conventions — MixedCaps, package stuttering, constructors, booleans, acronyms, enums, error strings, receivers, getters, and functional options.
- **[z-go-observability](./z-go-observability/SKILL.md)** — Production observability for Go services: structured logging with log/slog, Prometheus metrics, OpenTelemetry tracing, pprof profiling, and signal correlation.
- **[z-go-ogen](./z-go-ogen/SKILL.md)** — OpenAPI-first HTTP transport in Go using ogen (github.com/ogen-go/ogen).
- **[z-go-performance](./z-go-performance/SKILL.md)** — Go performance optimization — allocation reduction, CPU efficiency, memory layout, GC tuning, pooling, caching, and hot-path patterns.
- **[z-go-pgvector](./z-go-pgvector/SKILL.md)** — pgvector-backed similarity search in Go — declaring vector(N) columns, encoding []float32 as a Postgres literal, distance operators (<->, <=>, <#>), ORDER BY ... LIMIT k nearest-neighbour…
- **[z-go-pkg](./z-go-pkg/SKILL.md)** — Query the official pkg.go.dev API (v1beta) for Go module and package metadata — package info, module versions, symbols, imported-by, search, and vulnerabilities.
- **[z-go-safety](./z-go-safety/SKILL.md)** — Prevents panics, silent data corruption, and subtle runtime bugs through defensive coding patterns.
- **[z-go-security](./z-go-security/SKILL.md)** — Go security hardening — injection prevention, crypto, path traversal, secrets, timing safety, and race-free concurrency.
- **[z-go-sqlc](./z-go-sqlc/SKILL.md)** — Use when writing or reviewing Go database access that should be type-safe — generating Go from SQL with sqlc, authoring sqlc.yaml, structuring queries/schema, and wiring sqlc output into…
- **[z-go-style](./z-go-style/SKILL.md)** — Go code style — declarations, control flow, function design, and file organization.
- **[z-go-taskfile](./z-go-taskfile/SKILL.md)** — Author a Taskfile.yml (go-task) for orchestration around a Go project — docker, databases, pipelines, CLI shortcuts, E2E — while delegating the inner loop to the Makefile.
- **[z-go-telegram-bot](./z-go-telegram-bot/SKILL.md)** — Hand-rolled Telegram Bot API client in Go — no third-party bot library. Covers the minimal Bot struct over net/http, a generic call helper that decodes the {ok, result, description} envel…
- **[z-go-testing](./z-go-testing/SKILL.md)** — Go testing patterns — table-driven tests, testify assert/require/mock/suite, parallelism, goleak, fuzzing, TDD baby steps, and test quality rules.
- **[z-go-troubleshooting](./z-go-troubleshooting/SKILL.md)** — Systematic Go debugging — reproduce, instrument, find root cause, verify fix.
