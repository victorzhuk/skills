# Go Skills

Go engineering discipline: architecture, testing, database, observability, security, performance, and tooling.

## Model-invoked

Model- or user-reachable via skill name and trigger phrasing.

- **[z-go-api-design](./z-go-api-design/SKILL.md)** — REST API contract design for OpenAPI-first Go, before ogen generates the transport — path versioning, keyset/cursor pagination, Idempotency-Key, RFC 9457 problem+json errors, PATCH-merge-patch…
- **[z-go-bdd](./z-go-bdd/SKILL.md)** — Go BDD and executable behavior contracts — two patterns, pick by audience. ginkgo/gomega (`Describe`/`When`/`It`, `Label("p0"...)`) suits engineer-only scenarios; Gherkin/godog (`.feature` files)…
- **[z-go-caching](./z-go-caching/SKILL.md)** — Redis caching and rate limiting for Go — cache-aside (read-through, delete-on-write invalidation, TTL jitter), singleflight before a distributed lock, fail-open on outages, and atomic INCR+EXPIRE or…
- **[z-go-ci](./z-go-ci/SKILL.md)** — GitHub Actions CI/CD for Go projects — test matrix, race detection, golangci-lint, govulncheck, CodeQL, GoReleaser, Dependabot/Renovate, and Docker image pipelines.
- **[z-go-clean-arch-di](./z-go-clean-arch-di/SKILL.md)** — Clean architecture wiring, layer direction, and dependency injection for Go services.
- **[z-go-clickhouse](./z-go-clickhouse/SKILL.md)** — ClickHouse analytics access from Go — append-only OLAP modeling, batch/async insert discipline, MergeTree engine selection.
- **[z-go-cobra-patterns](./z-go-cobra-patterns/SKILL.md)** — Cobra command-tree patterns for Go CLIs — command shape, RunE vs Run, PersistentPreRunE hooks, args validators, flag binding, JSON/human output, and signal handling.
- **[z-go-codegen-patterns](./z-go-codegen-patterns/SKILL.md)** — Use when authoring Go code generators, scaffold tools, AST manipulation, template-based codegen, golden-file tests, or YAML-driven generation pipelines. Also use when debugging generated output…
- **[z-go-concurrency](./z-go-concurrency/SKILL.md)** — Goroutines, channels, sync primitives, worker pools, and pipeline patterns for production Go.
- **[z-go-context](./z-go-context/SKILL.md)** — Idiomatic context.Context usage in Go — propagation, cancellation, timeouts, deadlines, WithoutCancel, and request-scoped values.
- **[z-go-database](./z-go-database/SKILL.md)** — Safe, explicit database access in Go — parameterized queries, NULLable columns, transactions, isolation levels, connection pool, migration tooling.
- **[z-go-dockerfile](./z-go-dockerfile/SKILL.md)** — Multi-stage Dockerfile authoring for Go services — a deps layer cached separately from source, BuildKit cache mounts, CGO_ENABLED=0 static builds, and the scratch vs distroless vs alpine call.
- **[z-go-documentation](./z-go-documentation/SKILL.md)** — Go documentation conventions — godoc comments, package comments, README structure, Example tests, API docs, and llms.txt.
- **[z-go-env-v11](./z-go-env-v11/SKILL.md)** — Parse environment configuration in Go with caarlos0/env v11 — generics, env.Options, struct tags, custom parsers, and injecting a custom env source for hermetic tests.
- **[z-go-errors](./z-go-errors/SKILL.md)** — Idiomatic Go error handling, wrapping, inspection, and hygiene — the single handling rule, sentinel vs typed errors, panic discipline.
- **[z-go-feature-flags](./z-go-feature-flags/SKILL.md)** — Feature flag lifecycle in a Go service — typed flag constants, a layered Evaluator (env kill-switch → remote provider → default), global vs per-user surfacing, fail-open/fail-closed semantics, a fake…
- **[z-go-goose](./z-go-goose/SKILL.md)** — Schema migrations for Go using goose (github.com/pressly/goose) — numbered SQL files, up/down blocks, PL/pgSQL wrapping with StatementBegin/End, embed.FS embedding, bare-text enum pattern, and…
- **[z-go-grpc](./z-go-grpc/SKILL.md)** — gRPC and protobuf service design in Go — field evolution, deadline propagation, the status-code/errdetails error model, interceptor ordering, streaming vs unary, and buf as the schema toolchain.
- **[z-go-http-client](./z-go-http-client/SKILL.md)** — Outbound HTTP client hardening for Go calling external APIs — timeouts, transport tuning, body draining, retry with backoff/jitter, and circuit breakers.
- **[z-go-interfaces](./z-go-interfaces/SKILL.md)** — Interface design, struct embedding, type assertions, compile-time checks, receiver rules, generics vs interfaces in Go.
- **[z-go-lint](./z-go-lint/SKILL.md)** — Configure and run golangci-lint, suppress warnings correctly, fix common lint findings, and integrate linting into CI/pre-commit hooks.
- **[z-go-llm-streaming](./z-go-llm-streaming/SKILL.md)** — Wire an LLM chat feature end-to-end in Go — decorate an SDK's chat-model interface (or a hand-rolled ChatCompleter), a resilience decorator, callback instrumentation, and Server-Sent Events streaming.
- **[z-go-makefile](./z-go-makefile/SKILL.md)** — Author a clean Makefile for a Go project's inner loop — DRY build recipes, build-dir handling (inline mkdir or order-only prereq), self-documenting help, version stamping, go tool codegen, and…
- **[z-go-mcp-server](./z-go-mcp-server/SKILL.md)** — MCP (Model Context Protocol) server authoring in Go — SDK choice, transport selection, stdio discipline, tool design, and testing.
- **[z-go-messaging](./z-go-messaging/SKILL.md)** — At-least-once delivery is the default reality for Go services on Kafka, RabbitMQ, or NATS — idempotent-consumer dedup, the transactional outbox, consumer-group rebalancing, and dead-letter queues.
- **[z-go-modernize](./z-go-modernize/SKILL.md)** — Modernize Go code and tooling to current idioms (Go 1.21–1.26). Covers deprecated package replacements, language feature adoption, stdlib upgrades, and test/bench patterns.
- **[z-go-naming](./z-go-naming/SKILL.md)** — Go naming conventions — MixedCaps, package stuttering, constructors, booleans, acronyms, enums, error strings, receivers, getters, functional options.
- **[z-go-observability](./z-go-observability/SKILL.md)** — Production observability for Go services — structured logging with log/slog, Prometheus metrics, OpenTelemetry tracing, pprof profiling, signal correlation.
- **[z-go-ogen](./z-go-ogen/SKILL.md)** — OpenAPI-first HTTP transport in Go using ogen (github.com/ogen-go/ogen).
- **[z-go-performance](./z-go-performance/SKILL.md)** — Go performance optimization — allocation reduction, CPU efficiency, memory layout, GC tuning, pooling, caching, hot-path patterns.
- **[z-go-pgvector](./z-go-pgvector/SKILL.md)** — pgvector-backed similarity search in Go — declaring vector(N) columns, encoding []float32 via pgvector.NewVector, distance operators (<->, <=>, <#>), ORDER BY ... LIMIT k queries, and choosing exact…
- **[z-go-pkg](./z-go-pkg/SKILL.md)** — Query the official pkg.go.dev API (v1beta) for Go module and package metadata — package info, module versions, symbols, imported-by, search, and vulnerabilities.
- **[z-go-safety](./z-go-safety/SKILL.md)** — Prevents panics, silent data corruption, and runtime bugs through defensive Go coding — nil panics, append aliasing, map concurrent-write panics, float comparison, numeric overflow, defer-in-loop…
- **[z-go-security](./z-go-security/SKILL.md)** — Go security hardening — injection prevention, crypto, path traversal, secrets, timing safety, and race-free concurrency.
- **[z-go-sqlc](./z-go-sqlc/SKILL.md)** — Use when writing or reviewing Go database access that should be type-safe — generating Go from SQL with sqlc, authoring sqlc.yaml, structuring queries/schema, and wiring sqlc output into the…
- **[z-go-style](./z-go-style/SKILL.md)** — Go code style — declarations, control flow, function design, and file organization.
- **[z-go-taskfile](./z-go-taskfile/SKILL.md)** — Author a Taskfile.yml (go-task) for orchestration around a Go project — docker, databases, pipelines, CLI shortcuts, E2E — while delegating the inner loop to the Makefile.
- **[z-go-telegram-bot](./z-go-telegram-bot/SKILL.md)** — Hand-rolled Telegram Bot API client in Go for MarkdownV2/Mini-App/Stars-level control — the minimal Bot struct over net/http, common methods (sendMessage, sendPhoto), MarkdownV2 escaping,…
- **[z-go-testing](./z-go-testing/SKILL.md)** — Go testing patterns — table-driven tests, testify assert/require/mock/suite, parallelism, goleak, fuzzing, TDD baby steps.
- **[z-go-troubleshooting](./z-go-troubleshooting/SKILL.md)** — Systematic Go debugging — reproduce, instrument, find root cause, verify fix.
