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

- **[z-cpp-core](./skills/cpp/z-cpp-core/SKILL.md)** — Manage resources and ABI boundaries in C++.

### Data

Analytics data pipeline discipline — batch ingestion, append-only modeling, and scheduling judgment.

- **[z-data-pipeline](./skills/data/z-data-pipeline/SKILL.md)** — Design and verify analytics batch loads.
- **[z-postgres-table-design](./skills/data/z-postgres-table-design/SKILL.md)** — Design PostgreSQL tables, constraints, indexes, partitions, and row security.

### .NET

C#/ASP.NET Core web API conventions for inherited and green services.

- **[z-dotnet-core](./skills/dotnet/z-dotnet-core/SKILL.md)** — Build ASP.NET Core APIs with dependency injection, EF Core, cancellation, and nullable references.

### Engineering

General engineering process, changelog, architecture, repository tooling, skill authoring, and cross-language code-quality doctrine.

- **[z-algo-core](./skills/engineering/z-algo-core/SKILL.md)** — Choose a data structure for lookup, ordering, top-k queries, or graph traversal.
- **[z-changelog](./skills/engineering/z-changelog/SKILL.md)** — Maintain CHANGELOG.md, add a changeset, or prepare release notes.
- **[z-clean-output](./skills/engineering/z-clean-output/SKILL.md)** — Remove irrelevant authorship or process commentary from code, docs, configuration, and commits.
- **[z-cloudevents](./skills/engineering/z-cloudevents/SKILL.md)** — Encode and validate CloudEvents envelopes, required attributes, and transport bindings.
- **[z-codegraph](./skills/engineering/z-codegraph/SKILL.md)** — Query an existing CodeGraph index for callers, affected tests, routes, or change impact.
- **[z-creating-flow-doc](./skills/engineering/z-creating-flow-doc/SKILL.md)** — Document one operation, RPC, scheduled job, or query.
- **[z-deep-modules](./skills/engineering/z-deep-modules/SKILL.md)** — Design or review module interfaces, seams, and adapters.
- **[z-domain-modeling](./skills/engineering/z-domain-modeling/SKILL.md)** — Define domain terms, bounded contexts, aggregate boundaries, and invariants.
- **[z-git-guardrails](./skills/engineering/z-git-guardrails/SKILL.md)** — Install and test a Claude Code hook that filters literal destructive Git commands.
- **[z-json-schema](./skills/engineering/z-json-schema/SKILL.md)** — Write JSON Schema contracts and check dialect support, composition, and compatibility.
- **[z-just](./skills/engineering/z-just/SKILL.md)** — List, inspect, run, and write justfile recipes with dependencies and shell-safe arguments.
- **[z-lean-fix](./skills/engineering/z-lean-fix/SKILL.md)** — Fix a confirmed defect or review finding at its cause.
- **[z-lint](./skills/engineering/z-lint/SKILL.md)** — Check lint and formatting for the requested files, including untracked files.
- **[z-memory-hygiene](./skills/engineering/z-memory-hygiene/SKILL.md)** — Store and update durable preferences, corrections, and project decisions in the active memory backend.
- **[z-merge-conflicts](./skills/engineering/z-merge-conflicts/SKILL.md)** — Resolve Git merge, rebase, or cherry-pick conflicts.
- **[z-no-ai-style-code](./skills/engineering/z-no-ai-style-code/SKILL.md)** — Review naming, error context, and code structure against nearby project code.
- **[z-no-over-engineering](./skills/engineering/z-no-over-engineering/SKILL.md)** — Apply YAGNI when choosing dependencies, interfaces, configuration, or PR scope.
- **[z-npm-publish](./skills/engineering/z-npm-publish/SKILL.md)** — Publish npm packages through GitHub Actions with trusted publishing and OIDC.
- **[z-obsidian-cli](./skills/engineering/z-obsidian-cli/SKILL.md)** — Resolve the vault before reading, searching, or writing Obsidian notes.
- **[z-open-graph](./skills/engineering/z-open-graph/SKILL.md)** — Implement Open Graph metadata for shared-link previews.
- **[z-schema-org](./skills/engineering/z-schema-org/SKILL.md)** — Describe web entities with Schema.org and check eligibility for the target consumer.
- **[z-security-hardening](./skills/engineering/z-security-hardening/SKILL.md)** — Review authorization, secrets, retrieval, and tool execution at trust boundaries.
- **[z-session-handoff](./skills/engineering/z-session-handoff/SKILL.md)** — Prepare a session handoff with the goal, verified state, decisions, evidence, and next action.
- **[z-skill-mastery](./skills/engineering/z-skill-mastery/SKILL.md)** — Author, refactor, or review SKILL.md files.
- **[z-systematic-debugging](./skills/engineering/z-systematic-debugging/SKILL.md)** — Reproduce the failure, isolate the cause, and test the fix against the original symptom.
- **[z-tdd](./skills/engineering/z-tdd/SKILL.md)** — Use red-green-refactor to implement behavior through a public interface.
- **[z-testing-strategy](./skills/engineering/z-testing-strategy/SKILL.md)** — Select acceptance tests and regression checks from the change's risks.
- **[z-verify-before-done](./skills/engineering/z-verify-before-done/SKILL.md)** — Verify claims about a fix, build, test, or completed requirement.
- **[z-worktrunk](./skills/engineering/z-worktrunk/SKILL.md)** — Create, switch, merge, and remove Git worktrees with the Worktrunk CLI.
- **[z-zero-comments](./skills/engineering/z-zero-comments/SKILL.md)** — Review comments that repeat the code.

### Flutter

Flutter mobile client development — Dart 3 essentials, state management, and project structure.

- **[z-flutter-core](./skills/flutter/z-flutter-core/SKILL.md)** — Build Flutter clients with Dart, typed API models, and widget state.

### Go

Go engineering discipline: architecture, testing, database, observability, security, performance, and tooling.

- **[z-go-api-design](./skills/go/z-go-api-design/SKILL.md)** — Design Go REST contracts before generating OpenAPI transport code.
- **[z-go-bdd](./skills/go/z-go-bdd/SKILL.md)** — Run Go behavior scenarios with an existing Ginkgo/Gomega or godog harness.
- **[z-go-bench-ab](./skills/go/z-go-bench-ab/SKILL.md)** — Compare Go benchmark implementations using interleaved samples, controls, and matching work.
- **[z-go-caching](./skills/go/z-go-caching/SKILL.md)** — Design cache-aside reads, invalidation, stampede protection, and atomic rate limits with Redis.
- **[z-go-ci](./skills/go/z-go-ci/SKILL.md)** — Configure GitHub Actions for Go tests, lint, vulnerability checks, release tags, and image publication.
- **[z-go-clean-arch-di](./skills/go/z-go-clean-arch-di/SKILL.md)** — Wire Go service dependencies through constructors and a composition root.
- **[z-go-clickhouse](./skills/go/z-go-clickhouse/SKILL.md)** — Query ClickHouse from Go and handle batches, asynchronous inserts, and retries.
- **[z-go-cobra-patterns](./skills/go/z-go-cobra-patterns/SKILL.md)** — Build Go CLI command trees with Cobra.
- **[z-go-codegen-patterns](./skills/go/z-go-codegen-patterns/SKILL.md)** — Write Go generators and scaffolding tools.
- **[z-go-concurrency](./skills/go/z-go-concurrency/SKILL.md)** — Coordinate goroutines, channels, ownership, and cancellation.
- **[z-go-context](./skills/go/z-go-context/SKILL.md)** — Propagate `context.Context` through Go calls and release resources on cancellation.
- **[z-go-database](./skills/go/z-go-database/SKILL.md)** — Use pgx, sqlx, or database/sql for Go queries, transactions, pool limits, and migrations.
- **[z-go-dockerfile](./skills/go/z-go-dockerfile/SKILL.md)** — Build container images for Go services.
- **[z-go-documentation](./skills/go/z-go-documentation/SKILL.md)** — Write Go package and symbol comments, executable examples, README files, and API documentation.
- **[z-go-env-v11](./skills/go/z-go-env-v11/SKILL.md)** — Parse and validate environment configuration with `caarlos0/env` v11.
- **[z-go-entrypoint](./skills/go/z-go-entrypoint/SKILL.md)** — Design a testable Go main function.
- **[z-go-errors](./skills/go/z-go-errors/SKILL.md)** — Handle Go errors at package boundaries.
- **[z-go-feature-flags](./skills/go/z-go-feature-flags/SKILL.md)** — Evaluate feature flags in Go services.
- **[z-go-goose](./skills/go/z-go-goose/SKILL.md)** — Manage SQL and Go database migrations with goose.
- **[z-go-grpc](./skills/go/z-go-grpc/SKILL.md)** — Design Go gRPC services and protobuf contracts.
- **[z-go-http-client](./skills/go/z-go-http-client/SKILL.md)** — Build outbound HTTP clients in Go.
- **[z-go-idioms](./skills/go/z-go-idioms/SKILL.md)** — Select Go idioms for ownership, error returns, interfaces, zero values, concurrency, and formatting.
- **[z-go-interfaces](./skills/go/z-go-interfaces/SKILL.md)** — Design Go interfaces, type constraints, receiver methods, and embedding.
- **[z-go-interp-perf](./skills/go/z-go-interp-perf/SKILL.md)** — Profile Go interpreters and scripting VMs.
- **[z-go-lint](./skills/go/z-go-lint/SKILL.md)** — Configure golangci-lint or investigate Go lint findings.
- **[z-go-llm-streaming](./skills/go/z-go-llm-streaming/SKILL.md)** — Implement Go chat streaming with an SDK or HTTP client.
- **[z-go-makefile](./skills/go/z-go-makefile/SKILL.md)** — Write or maintain Make targets for Go builds, generators, tests, lint, and version metadata.
- **[z-go-mcp-server](./skills/go/z-go-mcp-server/SKILL.md)** — Build a Go Model Context Protocol server.
- **[z-go-messaging](./skills/go/z-go-messaging/SKILL.md)** — Implement idempotent Go consumers, transactional outboxes, and redelivery handling for Kafka, RabbitMQ, or JetStream.
- **[z-go-modernize](./skills/go/z-go-modernize/SKILL.md)** — Modernize Go syntax, standard-library calls, or tools for a project's supported version.
- **[z-go-naming](./skills/go/z-go-naming/SKILL.md)** — Choose Go package, type, receiver, constructor, enum, and error names.
- **[z-go-observability](./skills/go/z-go-observability/SKILL.md)** — Instrument Go services with slog, Prometheus, OpenTelemetry, or pprof.
- **[z-go-ogen](./skills/go/z-go-ogen/SKILL.md)** — Generate a Go HTTP transport from OpenAPI using ogen.
- **[z-go-perf-gate](./skills/go/z-go-perf-gate/SKILL.md)** — Compare Go CI benchmarks against calibrated thresholds and report inconclusive results.
- **[z-go-performance](./skills/go/z-go-performance/SKILL.md)** — Measure and optimize Go allocation, memory retention, CPU cost, and contention after locating the bottleneck.
- **[z-go-pgvector](./skills/go/z-go-pgvector/SKILL.md)** — Store embeddings and query pgvector from Go.
- **[z-go-pkg](./skills/go/z-go-pkg/SKILL.md)** — Query the pkg.go.dev API for modules, packages, symbols, importers, and vulnerability records.
- **[z-go-safety](./skills/go/z-go-safety/SKILL.md)** — Prevent Go panics, aliasing, numeric overflow, and shared-state corruption.
- **[z-go-security](./skills/go/z-go-security/SKILL.md)** — Review Go-specific controls for commands, SQL, filesystem access, TLS, passwords, and HTTP limits.
- **[z-go-service-bootstrap](./skills/go/z-go-service-bootstrap/SKILL.md)** — Bootstrap a new Go HTTP service.
- **[z-go-sqlc](./skills/go/z-go-sqlc/SKILL.md)** — Generate Go database methods from SQL and schema files with sqlc.
- **[z-go-stdlib](./skills/go/z-go-stdlib/SKILL.md)** — Find standard-library APIs for Go tasks.
- **[z-go-style](./skills/go/z-go-style/SKILL.md)** — Review Go declarations, control flow, function signatures, and package layout.
- **[z-go-taskfile](./skills/go/z-go-taskfile/SKILL.md)** — Write Go project tasks in Taskfile.yml.
- **[z-go-telegram-bot](./skills/go/z-go-telegram-bot/SKILL.md)** — Implement Telegram Bot API calls in Go.
- **[z-go-testing](./skills/go/z-go-testing/SKILL.md)** — Write Go tests with table cases, testify, parallel subtests, fuzzing, or synctest.
- **[z-go-troubleshooting](./skills/go/z-go-troubleshooting/SKILL.md)** — Debug Go crashes, hangs, races, leaks, and latency.

### Infra

Deployment discipline across Kubernetes, Terraform/OpenTofu, self-hosted VPS targets, and the GitHub Actions pipelines that ship to them.

- **[z-container-metadata](./skills/infra/z-container-metadata/SKILL.md)** — Set OCI image annotations and Dockerfile labels.
- **[z-k8s-deploy](./skills/infra/z-k8s-deploy/SKILL.md)** — Deploy Kubernetes workloads with Helm and verify rollout and recovery.
- **[z-terraform](./skills/infra/z-terraform/SKILL.md)** — Plan and review Terraform or OpenTofu changes.
- **[z-selfhost-deploy](./skills/infra/z-selfhost-deploy/SKILL.md)** — Deploy and recover services on a VPS with Compose, systemd, a TLS proxy, and offsite backups.
- **[z-deploy-pipeline](./skills/infra/z-deploy-pipeline/SKILL.md)** — Configure protected GitHub Actions deployments with OIDC, serialized rollouts, and version-specific rollback.
- **[z-dokploy-cli](./skills/infra/z-dokploy-cli/SKILL.md)** — Operate Dokploy applications and Compose stacks through the installed CLI.

### Lisp

Embeddable Scheme-flavored Lisp VM and compiler design for host applications.

- **[z-lisp-core](./skills/lisp/z-lisp-core/SKILL.md)** — Design an embedded Scheme-style interpreter.

### Lua

Lua embedded as a sandboxed scripting layer inside Go and Rust hosts.

- **[z-lua-core](./skills/lua/z-lua-core/SKILL.md)** — Embed Lua with mlua or gopher-lua.

### Network

Network fundamentals and debugging discipline — subnetting, routing, DNS, tunnels, and router config.

- **[z-net-core](./skills/network/z-net-core/SKILL.md)** — Diagnose network routes, DNS, tunnel addressing, or path MTU.

### PHP

PHP core conventions with Symfony, Laravel, and Yii2 framework depth.

- **[z-php-core](./skills/php/z-php-core/SKILL.md)** — Maintain PHP services with scalar types, enums, Composer, PHPStan, and Pest or PHPUnit.

### Product

Idea-to-implementation pipeline: grill an idea into shared understanding, brief and hand off its UI to a cloud design tool, then land it as a PRD and OpenSpec changes.

- **[z-market-research](./skills/product/z-market-research/SKILL.md)** — Research competitors, pricing, positioning, and demand.
- **[z-grill-me](./skills/product/z-grill-me/SKILL.md)** — Clarify a request or sharpen a prompt before implementation.
- **[z-grill-with-docs](./skills/product/z-grill-with-docs/SKILL.md)** — Clarify requirements and record agreed terms and decisions in their existing project documents.
- **[z-design-brief](./skills/product/z-design-brief/SKILL.md)** — Define screens, states, visual constraints, and acceptance criteria for a UI.
- **[z-design-handoff](./skills/product/z-design-handoff/SKILL.md)** — Prepare a design handoff from a screen brief for Figma Make, Stitch, v0, or Lovable.
- **[z-to-prd](./skills/product/z-to-prd/SKILL.md)** — Write a product requirements document from agreed decisions, a design brief, and available prototype results.
- **[z-prd-to-openspec](./skills/product/z-prd-to-openspec/SKILL.md)** — Split a PRD into independently verifiable OpenSpec changes.

### Python

Python tooling baseline and framework routing for FastAPI, Django, Flask, and data/LLM work.

- **[z-py-core](./skills/python/z-py-core/SKILL.md)** — Maintain Python packages with uv, Ruff, mypy, pytest, and Pydantic.

### QA

QA planning and autonomous API, browser, performance, and failure-triage workflows.

- **[z-bdd](./skills/qa/z-bdd/SKILL.md)** — Define BDD acceptance scenarios for a UI, API, or CLI.
- **[z-qa-analyst](./skills/qa/z-qa-analyst/SKILL.md)** — Map requirements to assertions, execution evidence, and gaps.
- **[z-qa-android](./skills/qa/z-qa-android/SKILL.md)** — Test Android apps with adb, a headless emulator, or a physical device.
- **[z-qa-api](./skills/qa/z-qa-api/SKILL.md)** — Test API journeys through a running service.
- **[z-qa-browser](./skills/qa/z-qa-browser/SKILL.md)** — Test browser journeys, accessible locators, Playwright assertions, or screenshot regressions.
- **[z-qa-debugger](./skills/qa/z-qa-debugger/SKILL.md)** — Triage failed or flaky tests.
- **[z-qa-orchestrator](./skills/qa/z-qa-orchestrator/SKILL.md)** — Run acceptance and required regression checks with the project runner.
- **[z-qa-performance](./skills/qa/z-qa-performance/SKILL.md)** — Define workload, pass thresholds, and stop conditions for a bounded load test.
- **[z-qa-spec-writer](./skills/qa/z-qa-spec-writer/SKILL.md)** — Create test scaffolding and verify test discovery in the project’s framework.

### Rust

Rust core, web, and GTK/libadwaita desktop guidance.

- **[z-rust-core](./skills/rust/z-rust-core/SKILL.md)** — Design Rust ownership, lifetimes, traits, error types, and async tasks.
- **[z-rust-gtk4](./skills/rust/z-rust-gtk4/SKILL.md)** — Build GTK4 desktop interfaces in Rust with relm4 and libadwaita.
- **[z-rust-web](./skills/rust/z-rust-web/SKILL.md)** — Review Rust HTTP routes, middleware, or adapters with the project's framework and runtime.

### TypeScript

TypeScript house conventions, React/Next.js App Router patterns, and Telegram Mini App client development.

- **[z-accessibility](./skills/typescript/z-accessibility/SKILL.md)** — Audit web accessibility against WCAG 2.2.
- **[z-interface-kit](./skills/typescript/z-interface-kit/SKILL.md)** — Build or refine an interface with design tokens, typography, layout, components, and motion.
- **[z-react-core](./skills/typescript/z-react-core/SKILL.md)** — Build React interfaces for the Next.js App Router, Pages Router, or a client-side SPA.
- **[z-ts-core](./skills/typescript/z-ts-core/SKILL.md)** — Configure strict TypeScript and validate data at runtime.
- **[z-ts-telegram-mini-app](./skills/typescript/z-ts-telegram-mini-app/SKILL.md)** — Build Telegram Mini App clients with TypeScript.
- **[z-web-performance](./skills/typescript/z-web-performance/SKILL.md)** — Measure LCP, INP, and CLS with field data and use lab traces to investigate slow interactions.

### Writing

Documentation, prose de-slopping, and Russian technical register — skills for concise, human text.

- **[z-concise-human-docs](./skills/writing/z-concise-human-docs/SKILL.md)** — Write or edit guides, specifications, runbooks, and code comments for clarity.
- **[z-fuck-slop](./skills/writing/z-fuck-slop/SKILL.md)** — Edit stock phrasing, unsupported claims, and repetitive cadence in public prose.
- **[z-ru-tech-register](./skills/writing/z-ru-tech-register/SKILL.md)** — Edit Russian technical prose for engineers.
