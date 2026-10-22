# Agent Skills

[![skills.sh](https://skills.sh/b/victorzhuk/skills)](https://skills.sh/victorzhuk/skills)

A public collection of reusable `z-*` agent skills for real engineering work.

The layout is inspired by [mattpocock/skills](https://github.com/mattpocock/skills): small, composable skills under `skills/`, grouped by domain, with lightweight repo scripts for listing and validation.

## Quickstart

Install from the repository:

```bash
npx skills@1.7.2 add victorzhuk/skills
```

For Pi or any harness that scans skill directories, you can also point it at this repo's `skills/` directory or copy selected skill directories into your installed skills folder.

```bash
# copy individual skill directories into a flat installation
mkdir -p ~/.agents/skills
for skill in skills/*/z-*; do
  cp -R "$skill" ~/.agents/skills/
done
```

## Why these skills exist

- Keep engineering guidance reusable instead of buried in one-off prompts.
- Make agent behavior more predictable through progressive disclosure: short descriptions first, full `SKILL.md` only when needed.
- Keep domain-specific rules close to the work: Go, QA, Rust, writing, and engineering process.

## Repo structure

```text
skills/
  cpp/          # C++ skills
  data/         # analytics data pipeline skills
  dotnet/       # .NET skills
  engineering/  # changelog, architecture, tooling, skill authoring
  flutter/      # Flutter skills
  go/           # Go engineering skills
  infra/        # Kubernetes, Terraform, self-hosted, and deploy-pipeline skills
  lisp/         # embeddable Lisp VM skills
  lua/          # embedded Lua scripting skills
  network/      # network fundamentals and debugging skills
  php/          # PHP skills
  product/      # idea-to-OpenSpec pipeline: grilling, design briefs, PRDs
  python/       # Python skills
  qa/           # QA planning and execution skills
  rust/         # Rust skills
  typescript/   # TypeScript skills
  writing/      # docs and prose skills
docs/
  inventory.md  # copied z-* skill list and sanitization notes
scripts/
  list-skills.mjs
  check-skills.mjs
.github/workflows/
  check.yml
  release.yml
```

## Maintenance

```bash
npm run list
npm run check
npm run changeset
```

Changesets handles version notes; GitHub Actions validates skills and opens version PRs.

Edit reusable skills in this repository. Treat installed copies as outputs, and use the host's managed installer when one exists.
Keep host-specific settings in the host configuration rather than modifying installed skill copies.

## Reference

### C++

Modern C++ for native/perf modules and codegen targets.

- **[z-cpp-core](./skills/cpp/z-cpp-core/SKILL.md)** — Modern C++ for native/perf modules and codegen targets — RAII and rule of zero, smart pointers over raw owning pointers, sanitizers in CI. Baseline C++20; check toolchain before assuming C++23/26.

### Data

Analytics data pipeline discipline — batch ingestion, append-only modeling, and scheduling judgment.

- **[z-data-pipeline](./skills/data/z-data-pipeline/SKILL.md)** — Analytics pipeline discipline — idempotent batch loads, append-only modeling for late-arriving data, incremental vs full-refresh judgment, single metric definitions across dashboards, ingestion quality gates, cron before an orchestrator.
- **[z-postgres-table-design](./skills/data/z-postgres-table-design/SKILL.md)** — PostgreSQL schema design depth — data types, indexing (GIN/GiST per type), constraints, IDENTITY vs UUIDv7, TOAST, and a type do-not-use list.

### .NET

C#/ASP.NET Core web API conventions for inherited and green services.

- **[z-dotnet-core](./skills/dotnet/z-dotnet-core/SKILL.md)** — C#/ASP.NET Core APIs — nullable reference types, dependency injection, EF Core reads, and async I/O; verify the target framework.

### Engineering

General engineering process, changelog, architecture, repository tooling, skill authoring, and cross-language code-quality doctrine.

- **[z-algo-core](./skills/engineering/z-algo-core/SKILL.md)** — DS/algorithm selection judgment for production code, not competitive tricks — hash map for membership/dedup, slice+sort beats a tree until proven, heap for top-k, two-pointer/sliding-window for scans, BFS/DFS/topo-sort for dependency shapes.
- **[z-changelog](./skills/engineering/z-changelog/SKILL.md)** — Maintain a Keep a Changelog 1.1.0 CHANGELOG.md — [Unreleased] upkeep, the six change types, the release cut, YANKED, the SemVer note, and the three real project styles…
- **[z-clean-output](./skills/engineering/z-clean-output/SKILL.md)** — Omit irrelevant authorship and process commentary. Preserve genuine generated-file markers, required licenses and provenance, and relevant tool and model names.
- **[z-cloudevents](./skills/engineering/z-cloudevents/SKILL.md)** — CloudEvents envelopes and protocol mappings. Use for event identity, structured or binary HTTP mode, data_base64, or event schema evolution. Payload validation belongs to [[z-json-schema]]. Go delivery patterns belong to [[z-go-messaging]].
- **[z-codegraph](./skills/engineering/z-codegraph/SKILL.md)** — Use an existing CodeGraph integration for call graphs, impact analysis, affected tests, or route discovery; discover host tools and verify index freshness.
- **[z-creating-flow-doc](./skills/engineering/z-creating-flow-doc/SKILL.md)** — Document an operation, RPC, cron, or query using local conventions, Mermaid by default, and paired diagrams only when required.
- **[z-deep-modules](./skills/engineering/z-deep-modules/SKILL.md)** — Deep-module design vocabulary — depth as leverage at the interface, seams, adapters, the deletion test, interface-is-the-test-surface.
- **[z-domain-modeling](./skills/engineering/z-domain-modeling/SKILL.md)** — Build and maintain a domain model — ubiquitous language, bounded contexts, aggregates and invariants.
- **[z-git-guardrails](./skills/engineering/z-git-guardrails/SKILL.md)** — Install a best-effort Claude Code filter for literal destructive Git commands; preserve the host permission boundary.
- **[z-json-schema](./skills/engineering/z-json-schema/SKILL.md)** — JSON Schema contracts for configuration and payload validation. Use for schema authoring, dialect migration, $ref resolution, or compatibility analysis. Covers required fields, composition, formats, and validator behavior. Web entity markup belongs to [[z-schema-org]].
- **[z-lean-fix](./skills/engineering/z-lean-fix/SKILL.md)** — Lean fixes for review findings, bug reports and broken builds — the smallest diff that removes the defect at its root, nothing more.
- **[z-lint](./skills/engineering/z-lint/SKILL.md)** — Check lint and formatting with installed project tools; default to report-only and include tracked and untracked files in scope.
- **[z-memory-hygiene](./skills/engineering/z-memory-hygiene/SKILL.md)** — Store and review durable memory through the active host's supported backend and scope; avoid duplicate and stale entries.
- **[z-merge-conflicts](./skills/engineering/z-merge-conflicts/SKILL.md)** — Resolve merge, rebase, or cherry-pick conflicts by intent; preserve unrelated work, stage intended resolutions, and verify the authorized operation.
- **[z-no-ai-style-code](./skills/engineering/z-no-ai-style-code/SKILL.md)** — Write like a senior maintainer of this project, not a tutorial — natural short names, concise error context, structure matching the surrounding code's idiom.
- **[z-no-over-engineering](./skills/engineering/z-no-over-engineering/SKILL.md)** — YAGNI for new types, abstractions, and PR scope review. Use for "interface for testing", "just in case", "future flexibility", or "extensible". Reject speculative interfaces, DTOs, splits, and configuration layers. Established architecture belongs to [[z-go-clean-arch-di]] and [[z-go-interfaces]].
- **[z-npm-publish](./skills/engineering/z-npm-publish/SKILL.md)** — Publish a Node/TypeScript package to npm via GitHub Actions with OIDC trusted publishing and provenance.
- **[z-obsidian-cli](./skills/engineering/z-obsidian-cli/SKILL.md)** — Capture, read, and search Obsidian notes through the installed official CLI or a verified filesystem fallback; resolve vault identity first.
- **[z-open-graph](./skills/engineering/z-open-graph/SKILL.md)** — Open Graph metadata for shared-link previews. Use for og tags, preview images, crawler access, stale previews, or duplicate metadata. Covers protocol fields and platform verification. Entity markup belongs to [[z-schema-org]].
- **[z-schema-org](./skills/engineering/z-schema-org/SKILL.md)** — Schema.org structured data for web content. Use for JSON-LD, Microdata, RDFa, rich results, or structured-data validation. Covers entity types, stable identifiers, truthful markup, and consumer requirements. JSON payload validation belongs to [[z-json-schema]].
- **[z-security-hardening](./skills/engineering/z-security-hardening/SKILL.md)** — Security hardening for untrusted input, authorization, secrets, LLM agents, retrieval, and tool execution.
- **[z-session-handoff](./skills/engineering/z-session-handoff/SKILL.md)** — Compact the current conversation into a handoff document a fresh agent can resume from — goal, current state, decisions with their why, next steps, gotchas, suggested skills — referencing artifacts by path, secrets redacted.
- **[z-skill-mastery](./skills/engineering/z-skill-mastery/SKILL.md)** — Author, refactor, and review agent skills in this repo's house style.
- **[z-systematic-debugging](./skills/engineering/z-systematic-debugging/SKILL.md)** — Root-cause-first debugging loop — no fixes before a feedback loop exists and the cause is understood. Build a tight red-capable repro, minimize it, rank falsifiable hypotheses…
- **[z-tdd](./skills/engineering/z-tdd/SKILL.md)** — Red-green loop discipline that produces tests worth keeping — tests at pre-agreed seams through public interfaces, expected values from an independent source of truth, one vertical slice per cycle.
- **[z-testing-strategy](./skills/engineering/z-testing-strategy/SKILL.md)** — Use E2E acceptance as the primary gate; select new lower-layer tests for named residual risks and preserve existing guarantees.
- **[z-verify-before-done](./skills/engineering/z-verify-before-done/SKILL.md)** — Evidence before completion claims, commits, PRs, or reliance on subagent reports. Use for "done", "fixed", "should work now", "tests pass", or "looks correct". Require fresh verification output and bug reproduction. Test depth belongs to [[z-testing-strategy]]. Debugging belongs to [[z-systematic-debugging]].
- **[z-worktrunk](./skills/engineering/z-worktrunk/SKILL.md)** — Manage Git worktrees with the Worktrunk `wt` CLI — switch, create, list, merge, remove, hooks, config, and the worktree-path template; one worktree per parallel agent.
- **[z-zero-comments](./skills/engineering/z-zero-comments/SKILL.md)** — Comment discipline — a comment explaining WHAT code does means the name is wrong; rename or restructure instead.

### Flutter

Flutter mobile client development — Dart 3 essentials, state management, and project structure.

- **[z-flutter-core](./skills/flutter/z-flutter-core/SKILL.md)** — Flutter mobile clients from one Dart codebase for iOS and Android, API-driven — Dart 3 essentials (null safety, records, sealed classes), Riverpod as state default, feature-first layout, typed API clients.

### Go

Go engineering discipline: architecture, testing, database, observability, security, performance, and tooling.

- **[z-go-api-design](./skills/go/z-go-api-design/SKILL.md)** — REST API contract design for OpenAPI-first Go, before ogen generates the transport — path versioning, keyset/cursor pagination, Idempotency-Key, RFC 9457 problem+json errors, PATCH-merge-patch…
- **[z-go-bdd](./skills/go/z-go-bdd/SKILL.md)** — Wire existing Ginkgo/Gomega or godog harnesses to shared readable acceptance contracts.
- **[z-go-bench-ab](./skills/go/z-go-bench-ab/SKILL.md)** — A/B microbenchmark validity in Go — `-count` never interleaves b.Run arms; repeat inside the parent, equalize arm plumbing, keep a control cell; plus contention-profile attribution.
- **[z-go-caching](./skills/go/z-go-caching/SKILL.md)** — Redis caching and rate limiting for Go — cache-aside (read-through, delete-on-write invalidation, TTL jitter), singleflight before a distributed lock, fail-open on outages, atomic INCR+EXPIRE or Lua token-bucket over racy GET-then-SET.
- **[z-go-ci](./skills/go/z-go-ci/SKILL.md)** — GitHub Actions CI/CD for Go projects — test matrix, race detection, golangci-lint, govulncheck, CodeQL, GoReleaser, Dependabot/Renovate, Docker image pipelines.
- **[z-go-clean-arch-di](./skills/go/z-go-clean-arch-di/SKILL.md)** — Clean architecture wiring, layer direction, and dependency injection for Go services.
- **[z-go-clickhouse](./skills/go/z-go-clickhouse/SKILL.md)** — ClickHouse analytics access from Go — append-only OLAP modeling, batch/async insert discipline, MergeTree engine selection.
- **[z-go-cobra-patterns](./skills/go/z-go-cobra-patterns/SKILL.md)** — Cobra command-tree patterns for Go CLIs — command shape, RunE vs Run, PersistentPreRunE hooks, args validators, flag binding, JSON/human output, and signal handling.
- **[z-go-codegen-patterns](./skills/go/z-go-codegen-patterns/SKILL.md)** — Use when authoring Go code generators, scaffold tools, AST manipulation, template-based codegen, golden-file tests, or YAML-driven generation pipelines. Also use when debugging generated output…
- **[z-go-concurrency](./skills/go/z-go-concurrency/SKILL.md)** — Goroutines, channels, sync primitives, worker pools, and pipeline patterns for production Go.
- **[z-go-context](./skills/go/z-go-context/SKILL.md)** — Idiomatic context.Context usage in Go — propagation, cancellation, timeouts, deadlines, WithoutCancel, request-scoped values.
- **[z-go-database](./skills/go/z-go-database/SKILL.md)** — Safe, explicit database access in Go — parameterized queries, NULLable columns, transactions, isolation levels, connection pool, migration tooling.
- **[z-go-dockerfile](./skills/go/z-go-dockerfile/SKILL.md)** — Multi-stage Dockerfile authoring for Go services — a deps layer cached separately from source, BuildKit cache mounts, CGO_ENABLED=0 static builds, and the scratch vs distroless vs alpine call.
- **[z-go-documentation](./skills/go/z-go-documentation/SKILL.md)** — Go documentation conventions — godoc comments, package comments, README structure, Example tests, API docs, and llms.txt.
- **[z-go-env-v11](./skills/go/z-go-env-v11/SKILL.md)** — Parse environment configuration in Go with caarlos0/env v11 — generics, env.Options, struct tags, custom parsers, and injecting a custom env source for hermetic tests.
- **[z-go-entrypoint](./skills/go/z-go-entrypoint/SKILL.md)** — Thin `main` plus testable `run` — injected args and streams, `flag.ContinueOnError` bound to stderr, `signal.NotifyContext`, explicit construction, no `os.Exit` below `main`.
- **[z-go-errors](./skills/go/z-go-errors/SKILL.md)** — Idiomatic Go error handling, wrapping, inspection, and hygiene — the single handling rule, sentinel vs typed errors, panic discipline.
- **[z-go-feature-flags](./skills/go/z-go-feature-flags/SKILL.md)** — Feature flag lifecycle in a Go service — typed flag constants, a layered Evaluator (env kill-switch → remote provider → default), fail-open/fail-closed semantics, a fake evaluator for tests.
- **[z-go-goose](./skills/go/z-go-goose/SKILL.md)** — Schema migrations for Go using goose (github.com/pressly/goose) — numbered SQL files, up/down blocks, PL/pgSQL wrapping with StatementBegin/End, embed.FS embedding, bare-text enum pattern…
- **[z-go-grpc](./skills/go/z-go-grpc/SKILL.md)** — gRPC and protobuf service design in Go — field evolution, deadline propagation, the status-code/errdetails error model, interceptor ordering, streaming vs unary, and buf as the schema toolchain.
- **[z-go-http-client](./skills/go/z-go-http-client/SKILL.md)** — Outbound HTTP client hardening for Go calling external APIs — timeouts, transport tuning, body draining, retry with backoff/jitter, and circuit breakers.
- **[z-go-idioms](./skills/go/z-go-idioms/SKILL.md)** — Go design idioms from the official canon — Effective Go, Go Proverbs, Code Review Comments, Google's style guide — as decision rules: accept interfaces return structs, zero value useful, errors are values, don't panic.
- **[z-go-interfaces](./skills/go/z-go-interfaces/SKILL.md)** — Interface design, struct embedding, type assertions, compile-time checks, receiver rules, generics vs interfaces in Go.
- **[z-go-interp-perf](./skills/go/z-go-interp-perf/SKILL.md)** — Interpreter/scripting VM performance in Go — batched cancellation polls, preboxing, versioned-cell site caches, operand-only fusion, freeze-then-share startup templates, striped compile caches.
- **[z-go-lint](./skills/go/z-go-lint/SKILL.md)** — Configure and run golangci-lint, suppress warnings correctly, fix common lint findings, and integrate linting into CI/pre-commit hooks — legacy-codebase adoption and code-review pre-checks included.
- **[z-go-llm-streaming](./skills/go/z-go-llm-streaming/SKILL.md)** — Wire an LLM chat feature end-to-end in Go — decorate an SDK's chat-model interface (or a hand-rolled ChatCompleter), a resilience decorator, callback instrumentation, and Server-Sent Events streaming.
- **[z-go-makefile](./skills/go/z-go-makefile/SKILL.md)** — Author a clean Makefile for a Go project's inner loop — DRY build recipes, build-dir handling (inline mkdir or order-only prereq), self-documenting help, version stamping, go tool codegen…
- **[z-go-mcp-server](./skills/go/z-go-mcp-server/SKILL.md)** — MCP (Model Context Protocol) server authoring in Go — SDK choice, transport selection, stdio discipline, tool design, and testing.
- **[z-go-messaging](./skills/go/z-go-messaging/SKILL.md)** — At-least-once messaging for Go on Kafka, RabbitMQ, or NATS — idempotent-consumer dedup, the transactional outbox, consumer-group rebalancing, and dead-letter queues.
- **[z-go-modernize](./skills/go/z-go-modernize/SKILL.md)** — Modernize Go code and tooling to current idioms (Go 1.21–1.27) — deprecated package replacements, language feature adoption, stdlib upgrades, and test/bench patterns.
- **[z-go-naming](./skills/go/z-go-naming/SKILL.md)** — Go naming conventions — MixedCaps, package stuttering, constructors, booleans, acronyms, enums, error strings, receivers, getters, functional options.
- **[z-go-observability](./skills/go/z-go-observability/SKILL.md)** — Production observability for Go services — structured logging with log/slog, Prometheus metrics, OpenTelemetry tracing, pprof profiling, signal correlation.
- **[z-go-ogen](./skills/go/z-go-ogen/SKILL.md)** — OpenAPI-first HTTP transport in Go using ogen (github.com/ogen-go/ogen).
- **[z-go-perf-gate](./skills/go/z-go-perf-gate/SKILL.md)** — CI benchmark non-regression gate — repo-owned gold-set corpus, tiered thresholds, paired interleaved hosted runs, burden-of-proof reruns, stored baselines; latency is decidable only on the quiet fixed runner.
- **[z-go-performance](./skills/go/z-go-performance/SKILL.md)** — Go performance optimization — allocation reduction, CPU efficiency, memory layout, GC tuning, pooling, caching, hot-path patterns.
- **[z-go-pgvector](./skills/go/z-go-pgvector/SKILL.md)** — pgvector-backed similarity search in Go — declaring vector(N) columns, encoding []float32 via pgvector.NewVector, L2/cosine/inner-product distance operators, ORDER BY / LIMIT k queries, and choosing exact scan vs ivfflat vs hnsw…
- **[z-go-pkg](./skills/go/z-go-pkg/SKILL.md)** — Query the official pkg.go.dev API (v1beta) for Go module and package metadata — package info, module versions, symbols, imported-by, search, and vulnerabilities.
- **[z-go-safety](./skills/go/z-go-safety/SKILL.md)** — Defensive Go against panics and silent data corruption — nil panics, append aliasing, map concurrent-write panics, float comparison, numeric overflow, defer-in-loop leaks. Also hardens exported API…
- **[z-go-security](./skills/go/z-go-security/SKILL.md)** — Go security hardening — injection prevention, crypto, path traversal, secrets, timing safety, and race-free concurrency.
- **[z-go-service-bootstrap](./skills/go/z-go-service-bootstrap/SKILL.md)** — Day-0 checklist for a new Go web service — ordered artifact list mapping lint config, env mirror, Makefile stamping, entrypoint, Dockerfile+compose, metrics port, healthz/readyz, timeouts/drain, and CI scan to their owner skills.
- **[z-go-sqlc](./skills/go/z-go-sqlc/SKILL.md)** — Use when writing or reviewing Go database access that should be type-safe — generating Go from SQL with sqlc, authoring sqlc.yaml, structuring queries/schema, and wiring sqlc output…
- **[z-go-stdlib](./skills/go/z-go-stdlib/SKILL.md)** — Stdlib-first discovery — verify the Go standard library or golang.org/x already has it (`go doc`, task→package map) before writing any helper or adding a dependency.
- **[z-go-style](./skills/go/z-go-style/SKILL.md)** — Go code style — declarations, control flow, function design, and file organization.
- **[z-go-taskfile](./skills/go/z-go-taskfile/SKILL.md)** — Author a Taskfile.yml (go-task) for orchestration around a Go project — docker, databases, pipelines, CLI shortcuts, E2E — while delegating the inner loop to the Makefile.
- **[z-go-telegram-bot](./skills/go/z-go-telegram-bot/SKILL.md)** — Hand-rolled Telegram Bot API client in Go for MarkdownV2/Mini-App/Stars-level control — the minimal Bot struct over net/http, common methods (sendMessage, sendPhoto), MarkdownV2 escaping…
- **[z-go-testing](./skills/go/z-go-testing/SKILL.md)** — Go testing patterns — table-driven tests, testify assert/require/mock/suite, parallelism, goleak, fuzzing, TDD baby steps.
- **[z-go-troubleshooting](./skills/go/z-go-troubleshooting/SKILL.md)** — Systematic Go debugging — reproduce, instrument, find root cause, verify fix.

### Infra

Deployment discipline across Kubernetes, Terraform/OpenTofu, self-hosted VPS targets, and the GitHub Actions pipelines that ship to them.

- **[z-container-metadata](./skills/infra/z-container-metadata/SKILL.md)** — Container image metadata with OCI annotations and legacy Label Schema migration. Use for Dockerfile labels, org.label-schema keys, org.opencontainers.image keys, or missing registry metadata. Covers placement, provenance values, and compatibility. Build pipelines belong to [[z-deploy-pipeline]].
- **[z-k8s-deploy](./skills/infra/z-k8s-deploy/SKILL.md)** — Production Kubernetes deploys with Helm — securityContext, resource limits, probe design with preStop/terminationGracePeriodSeconds shutdown, PDB/HPA/NetworkPolicy, chart/rollout/debug flow.
- **[z-terraform](./skills/infra/z-terraform/SKILL.md)** — Infrastructure-as-code discipline for Terraform/OpenTofu — remote state locking, thin-env modules with pinned versions, plan-before-apply review, drift detection, workspaces-vs-directory trade-off.
- **[z-selfhost-deploy](./skills/infra/z-selfhost-deploy/SKILL.md)** — Startup-cheap self-hosted deploys on a VPS — Docker Compose production patterns, systemd units, Caddy/Traefik reverse proxy with automatic TLS, backup-and-restore discipline, and base hardening (SSH keys, firewall…
- **[z-deploy-pipeline](./skills/infra/z-deploy-pipeline/SKILL.md)** — GitHub Actions delivery pipelines — environments with protection rules, OIDC over long-lived secrets, buildx build/push with layer cache, deploy patterns (helm --atomic --wait, ssh+compose pull/up), concurrency, rollback.
- **[z-dokploy-cli](./skills/infra/z-dokploy-cli/SKILL.md)** — Manage a self-hosted Dokploy server from the terminal — auth, projects and environments, app and Compose deploys, logs, databases, domains, backups.

### Lisp

Embeddable Scheme-flavored Lisp VM and compiler design for host applications.

- **[z-lisp-core](./skills/lisp/z-lisp-core/SKILL.md)** — Embeddable Scheme-flavored Lisp interpreters/compilers embedded in a host app — lexical closures, proper tail calls as a requirement, hygienic macros by default, call/cc only if needed, tagged-value VM/host boundary.

### Lua

Lua embedded as a sandboxed scripting layer inside Go and Rust hosts.

- **[z-lua-core](./skills/lua/z-lua-core/SKILL.md)** — Lua embedded as sandboxed scripting in Go or Rust hosts — mlua for Rust, gopher-lua for Go (Lua 5.1 VM, not 5.4/5.5). 1-based indexing, nil-hazard table length, metatable-only extension, allowlisted stdlib.

### Network

Network fundamentals and debugging discipline — subnetting, routing, DNS, tunnels, and router config.

- **[z-net-core](./skills/network/z-net-core/SKILL.md)** — Network fundamentals and debugging discipline — subnetting/CIDR judgment, routing-table reads, DNS resolution chain, MTU/fragmentation hazards, mtr/tcpdump/ss/dig triage.

### PHP

PHP core conventions with Symfony, Laravel, and Yii2 framework depth.

- **[z-php-core](./skills/php/z-php-core/SKILL.md)** — Modern PHP baseline — strict_types, typed properties/returns, enums, readonly, match, first-class callables; composer discipline, PSR-12, PHPStan, Pest/PHPUnit.

### Product

Idea-to-implementation pipeline: grill an idea into shared understanding, brief and hand off its UI to a cloud design tool, then land it as a PRD and OpenSpec changes.

- **[z-market-research](./skills/product/z-market-research/SKILL.md)** — Competitor and market research method — discovery, pricing teardown, positioning read, demand signals, then an ICP hypothesis validated per source.
- **[z-grill-me](./skills/product/z-grill-me/SKILL.md)** — Grills a request before it is built: sharpens a weak prompt into a brief, checks that brief against the code and the project's records, then interviews one question per turn until nothing stays vague.
- **[z-grill-with-docs](./skills/product/z-grill-with-docs/SKILL.md)** — Run the z-grill-me interview while updating authoritative glossary and decision records; prefer existing OpenSpec records, with CONTEXT/ADR as fallback.
- **[z-design-brief](./skills/product/z-design-brief/SKILL.md)** — Turns a grilled idea into a design brief by walking through each screen one at a time — what it shows, what a user can act on, how screens connect — then writes docs/design/{slug}-brief.md.
- **[z-design-handoff](./skills/product/z-design-handoff/SKILL.md)** — Design handoff from [[z-design-brief]] to Figma Make, Google Stitch, v0, or Lovable. Use for "design system", "handoff package", or "generate this in Figma/Stitch/v0". Produce tokens, components, states, and per-screen prompts. Does not operate tools. Prototype-to-PRD work belongs to [[z-to-prd]].
- **[z-to-prd](./skills/product/z-to-prd/SKILL.md)** — Synthesizes the grilled idea, design brief, and any returned prototype into a PRD — problem statement, solution, user stories, implementation/testing decisions, out of scope — written to docs/prd/{slug}.md.
- **[z-prd-to-openspec](./skills/product/z-prd-to-openspec/SKILL.md)** — Decomposes a PRD into OpenSpec change proposals using vertical slices — each cuts through every layer end-to-end and is independently verifiable — then writes proposal.md, design.md, tasks.md…

### Python

Python tooling baseline and framework routing for FastAPI, Django, Flask, and data/LLM work.

- **[z-py-core](./skills/python/z-py-core/SKILL.md)** — Python tooling and idiom baseline — uv for env/deps, ruff lint+format, mypy strict-leaning, pytest, pydantic v2 at the boundary. Routes to references for FastAPI, Django, Flask, or data (polars/pandas) work.

### QA

QA planning and autonomous API, browser, performance, and failure-triage workflows.

- **[z-bdd](./skills/qa/z-bdd/SKILL.md)** — Readable BDD contracts and repeatable acceptance evidence across UI, API, and CLI products.
- **[z-qa-analyst](./skills/qa/z-qa-analyst/SKILL.md)** — Plan tests by behavior and risk; map requirements to assertions and execution evidence, distinguishing coverage from proof.
- **[z-qa-api](./skills/qa/z-qa-api/SKILL.md)** — Run API acceptance through the service boundary; use focused Go handler and integration tests for named residual risks.
- **[z-qa-browser](./skills/qa/z-qa-browser/SKILL.md)** — Test browser flows through available host tools and the project's Playwright runner; verify current page state, meaningful assertions, and bounded execution.
- **[z-qa-debugger](./skills/qa/z-qa-debugger/SKILL.md)** — Test execution without fail-fast, failure classification, flaky detection, and QA report authoring. Auto-activates for: test failure triage, flaky tests, QA report, race conditions, test run…
- **[z-qa-orchestrator](./skills/qa/z-qa-orchestrator/SKILL.md)** — Run changed acceptance and critical smoke, then broader acceptance and existing required checks through project runners.
- **[z-qa-performance](./skills/qa/z-qa-performance/SKILL.md)** — Test load and throughput with user-count or arrival-rate workloads; gate business checks, latency, and errors while bounding generated traffic.
- **[z-qa-spec-writer](./skills/qa/z-qa-spec-writer/SKILL.md)** — Discover existing frameworks and generate explicitly requested compilable scaffolding; skipped stubs remain acceptance gaps.

### Rust

Rust core, web, and GTK/libadwaita desktop guidance.

- **[z-rust-core](./skills/rust/z-rust-core/SKILL.md)** — Rust development with ownership, lifetimes, error handling, async, traits, and idiomatic patterns.
- **[z-rust-gtk4](./skills/rust/z-rust-gtk4/SKILL.md)** — Build GTK4 desktop apps in Rust with relm4 and libadwaita — the Elm-style component loop, libadwaita widget hierarchy, preferences dialogs, system tray, message-driven UI patterns.
- **[z-rust-web](./skills/rust/z-rust-web/SKILL.md)** — Rust web stack discovery and boundaries — inspect the target service before choosing its framework, adapters, middleware, and logging conventions.

### TypeScript

TypeScript house conventions, React/Next.js App Router patterns, and Telegram Mini App client development.

- **[z-accessibility](./skills/typescript/z-accessibility/SKILL.md)** — Web accessibility audit and remediation against WCAG 2.2 AA — conformance levels, screen reader and keyboard support, and manual verification.
- **[z-interface-kit](./skills/typescript/z-interface-kit/SKILL.md)** — UI implementation with project design tokens, typography, layout, components, and motion; routes accessibility audits and React architecture to their own skills.
- **[z-react-core](./skills/typescript/z-react-core/SKILL.md)** — React and Next.js conventions beyond TypeScript tooling — App Router, server components by default ('use client' only at interaction leaves), server data fetching, URL/server state before client stores, server actions…
- **[z-ts-core](./skills/typescript/z-ts-core/SKILL.md)** — Strict-mode TypeScript house conventions for a Go-first engineer — tsconfig baseline, zod boundary validation, Error-subclass handling, and Biome/vitest/pnpm defaults.
- **[z-ts-telegram-mini-app](./skills/typescript/z-ts-telegram-mini-app/SKILL.md)** — Telegram Mini App client development in TypeScript — SDK choice (@tma.js/sdk vs raw WebApp), lifecycle/viewport/theme handling, BackButton/MainButton wiring, and Stars payments. initData is untrusted…
- **[z-web-performance](./skills/typescript/z-web-performance/SKILL.md)** — Page-rendering performance and Core Web Vitals — LCP/INP/CLS thresholds, the field/RUM/lab evidence hierarchy, and deployment-boundary regression attribution.

### Writing

Documentation, prose de-slopping, and Russian technical register — skills for concise, human text.

- **[z-concise-human-docs](./skills/writing/z-concise-human-docs/SKILL.md)** — Write and edit documentation, comments, guides, runbooks, specs, and explanatory prose in a concise human style.
- **[z-fuck-slop](./skills/writing/z-fuck-slop/SKILL.md)** — De-slop pass for any text — detects and erases AI-writing fingerprints (negative parallelism, em-dash abuse, rule-of-three, false ranges, puffery, uniform cadence) and rewrites into its target…
- **[z-ru-tech-register](./skills/writing/z-ru-tech-register/SKILL.md)** — Russian tech prose in the native senior-engineer register — Latin-vs-Cyrillic term choice, serious-register structure, erasing machine-written tells.
