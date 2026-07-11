# Changelog

## 0.5.1

### Patch Changes

- Remove angle brackets from skill descriptions — the Claude app rejects them as XML tags on upload. Placeholder tokens (`<slug>`) become `{slug}`, the merge-conflicts trigger drops the literal `<<<<<<< HEAD` marker, and the pgvector description spells out its distance operators instead of using `<->`/`<=>`/`<#>`. `npm run check` now flags any `<`/`>` in a description so the regression can't return.

## 0.5.0

### Minor Changes

- Compress skill descriptions to fit harness context budgets. Harnesses load every skill description into context and skip skills once the total passes ~50 KB; the catalog sat at 49k chars. Rewrite the 45 largest descriptions to the house shape (what → when → at most 5–6 trigger phrases → at most 2 boundary clauses), sync the root and per-domain READMEs to the new wording, and add a `check-skills.mjs` gate that fails past 600 chars per description or 40,000 chars catalog-wide.

## 0.4.3

### Patch Changes

- Force actual `ask` tool invocation for option-case questions in interview skills. The previous patch told the model to "present" cases through the native `ask` tool, but the model kept emitting the options as prose. Replace "present" with imperative "call the native `ask` tool" and add an explicit "Do not emit the options as prose in the response" rule in `z-grill-with-docs` and `z-design-brief`.

## 0.4.2

### Patch Changes

- Mandate the native `ask` tool for option-case questions in interview skills: drop the "when it has one" / "if one exists" prose fallback from `z-grill-with-docs` and `z-design-brief`, so 2–4 option questions always render through the harness's structured question tool instead of falling back to free-form user input. `z-design-brief` keeps its multi-select caveat for screen inventory, since multi-select is not universally supported.

All notable changes to this skills repo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Changesets](https://github.com/changesets/changesets) for release notes.

## 0.4.1

### Patch Changes

- [`931766c`](https://github.com/victorzhuk/skills/commit/931766ce36673ed886f1c45bfc852e02285af754) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Interview skills now ask option-case questions with a marked recommendation instead of prose-only questions: when an answer folds into 2–4 concrete options, present them as cases — recommended option first, marked "(Recommended)", one-line trade-off per option — through the harness's structured question tool when one exists (AskUserQuestion or equivalent), falling back to the same structure in prose. `z-grill-with-docs` carries the rule (plus a new "Do not" against bare yes/no option questions); `z-design-brief` inherits it and confirms the screen inventory as a multi-select; `z-to-prd` asks its two allowed questions (test seam, TDD vs tests-after) as option cases; `z-design-handoff` asks unpinned brand/token choices the same way.

- [`9da79dd`](https://github.com/victorzhuk/skills/commit/9da79dd8126e48a3523ac1366a54b36a9c66d361) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Branch-name examples now reference `master` as the default branch instead of `main`: `z-go-grpc` `buf breaking --against` commands, `z-go-ci` branch-protection guidance, `z-go-makefile` `lint-new` target, and the `z-git-guardrails` verify fixture. Repo docs also fix the CI trigger description — `check.yml` runs on pushes to `master`.

## 0.4.0

### Minor Changes

- [`13f06f4`](https://github.com/victorzhuk/skills/commit/13f06f4b161f3dcf6bffaa5e7eca57c22f033755) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add two writing skills: `z-ru-tech-register` — Russian tech prose in the native senior-engineer register, owning the Latin-vs-Cyrillic terminology glossary by theme cluster (Go/backend, DPI-bypass, self-hosted infra, AI coding agents, RF regulatory), serious-register structure, RU neuro-slop tells, and legal framing for circumvention/compliance content — and `z-tg-post` — the author's Telegram post format and voice (user-Markdown formatting, post structure, bilingual register), which defers glossary and register rules to `z-ru-tech-register`.

### Patch Changes

- [`5ad1cc8`](https://github.com/victorzhuk/skills/commit/5ad1cc815f11dcb778ba9b8f94637c1ec2abdec3) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Make the spec pipeline confirm the testing flow — TDD (test-first) or tests-after — before generating anything: `z-to-prd` now asks it as its second allowed interview question (alongside seam confirmation) and records the answer in the PRD's Testing decisions (the PRD template gained a `Flow:` line); `z-prd-to-openspec` reads the flow from the PRD, asks only when the PRD doesn't record one, and orders each slice's `tasks.md` accordingly (TDD puts the failing test before implementation tasks, tests-after puts test tasks last).

## 0.3.1

### Patch Changes

- [`30e0c33`](https://github.com/victorzhuk/skills/commit/30e0c331e2d699435a56941f9f48f8b7236980c6) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add final implementation guards to the five product-pipeline skills (`z-grill-with-docs`, `z-design-brief`, `z-design-handoff`, `z-to-prd`, `z-prd-to-openspec`): each now ends by storing its artifact (or printing it in the conversation on request), asking the user before any implementation starts, and routing implementation through the project's apply workflow — the `openspec` CLI's apply step or the project's own apply command — instead of editing source straight from a spec.

## 0.3.0

### Minor Changes

- [`cc7fc12`](https://github.com/victorzhuk/skills/commit/cc7fc12e3473cd3b260126f832685a7086298714) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add eight engineering-method skills adapted from mattpocock/skills, obra/superpowers, and addyosmani/agent-skills (all MIT): `z-deep-modules`, `z-tdd`, `z-systematic-debugging`, `z-verify-before-done`, `z-merge-conflicts`, `z-session-handoff`, `z-git-guardrails` (hook script allows worktree cleanup), and `z-security-hardening`.

- [`645b869`](https://github.com/victorzhuk/skills/commit/645b86913df5aea6c9201149151860995a1b30dc) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add the `product/` domain — an idea-to-OpenSpec pipeline of five chained skills: `z-grill-with-docs` (ported from Matt Pocock's skill, MIT), `z-design-brief`, `z-design-handoff`, `z-to-prd`, and `z-prd-to-openspec`.

## 0.2.0

### Minor Changes

- [`81bb339`](https://github.com/victorzhuk/skills/commit/81bb33936f38f0d1ed5a8b71f6bf37c2b45c4e43) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Align all 32 Go skills with what the real codebase actually does, based on an evidence audit against real repos. Notable fixes: `z-go-database` examples rewritten from sqlx to pgx/pgxpool idiom; `z-go-clean-arch-di` states manual constructor DI as the default regardless of scale; `z-go-lint` example updated to the golangci-lint v2 config shape; `z-go-llm-streaming` rewritten around decorating a provider SDK's own interface instead of a custom abstraction; `z-go-pgvector` now leads with the `pgvector-go` client library; `z-go-bdd` documents both ginkgo/gomega and Gherkin/godog as valid patterns; `z-go-testing` demotes testify's `mock.Mock`/`suite.Suite` in favor of hand-rolled fakes, the house default. Several smaller corrections across `z-go-ci`, `z-go-cobra-patterns`, `z-go-codegen-patterns`, `z-go-goose`, `z-go-makefile`, `z-go-modernize`, `z-go-naming`, `z-go-observability`, `z-go-ogen`, `z-go-safety`, `z-go-security`, `z-go-sqlc`, `z-go-style`, `z-go-taskfile`, and `z-go-telegram-bot`.

- [`81bb339`](https://github.com/victorzhuk/skills/commit/81bb33936f38f0d1ed5a8b71f6bf37c2b45c4e43) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Rewrite all 8 QA skills around what real projects actually do for testing, based on an evidence audit against 19 real repos. Most of the family's original tooling (hurl, tokei, `comm -23`, shot-scraper, axe-core CLI, ImageMagick, oha, vegeta, hey, hyperfine, Lighthouse, a fictional `playwright-cli` command surface, Playwright MCP/Agents, Gherkin `*.spec.md`) had zero real adoption; several skills are rebuilt around the one real, mature QA-cycle example found in the audit. Notable changes: `z-qa-analyst` and `z-qa-orchestrator` now document a source-to-test traceability matrix and sequential smoke/regression/full phases instead of an invented parallel multi-agent pipeline; `z-qa-api` leads with `net/http/httptest` + `testcontainers-go` instead of `.hurl` files; `z-qa-browser` documents the real ref-based `playwright-cli` command surface instead of a fictional CSS-selector/`assert-*` API; `z-qa-performance` keeps k6 and adds Locust for worker-queue load, dropping unused tools; `z-qa-spec-writer` corrects its JS/TS and Python framework-detection claims and points Gherkin/BDD work at `z-go-bdd`'s real ginkgo pattern instead; `z-qa-debugger` grounds dependency and flaky-test triage in `testcontainers-go` and Playwright's built-in retries; `z-qa-visual` is trimmed to a short pointer at Playwright's `toHaveScreenshot()`, since visual regression has no real adoption anywhere in the sample.

- [`81bb339`](https://github.com/victorzhuk/skills/commit/81bb33936f38f0d1ed5a8b71f6bf37c2b45c4e43) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Align the Rust family and 6 remaining engineering skills with real practice, based on an evidence audit against real repos, plus a correction to `z-memory-hygiene` against how this harness's memory system actually works. `z-rust-web` is trimmed to a short stub — no Rust web service exists anywhere in the sample (both real Rust projects are desktop GUI apps), so detailed Axum/SQLx/tower guidance had zero anchor. `z-rust-core` drops `anyhow`, `Cow`, `clippy::pedantic`, and a web-backend-shaped project layout that didn't fit either real project, and corrects the async-trait guidance (object-safety, not MSRV, is the real trigger). `z-rust-gtk4` fixes several details that had drifted from the real relm4/libadwaita app it's grounded in, including one pattern that wouldn't have compiled as documented. `z-memory-hygiene`'s entire entry schema is rewritten to match the real memory mechanics (type enum, `MEMORY.md` index, `[[cross-links]]`) instead of an invented one. `z-changelog` fixes a backwards "if cliff.toml exists, never hand-edit the file" heuristic and adds Changesets as a third real project style. `z-domain-modeling` adds an OpenSpec cross-reference and softens its glossary/ADR sections to match how lightly those patterns are actually followed. `z-creating-flow-doc` drops a "non-negotiable" diagram-pairing rule that one real project's own convention doc explicitly overrides, and fixes its gap-doc variant to match the real shape.

- [`81bb339`](https://github.com/victorzhuk/skills/commit/81bb33936f38f0d1ed5a8b71f6bf37c2b45c4e43) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add five engineering doctrine skills: `z-no-over-engineering`, `z-zero-comments`, `z-no-ai-style-code`, `z-clean-output`, and `z-testing-strategy`. These distill cross-cutting code-quality discipline (YAGNI, comment hygiene, natural naming, clean output, and test-depth judgment) that previously lived only in internal guidance, not in the public catalog.

- [`dee1bbb`](https://github.com/victorzhuk/skills/commit/dee1bbbac7ded7fcfb7473a1d263862d1b86f1ac) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Add ten skills, eight filling gaps in the Go family and two opening a new `typescript/` domain. `z-go-messaging` covers at-least-once delivery for Kafka/RabbitMQ/NATS: idempotent-consumer dedup, the transactional outbox, consumer-group rebalancing, and DLQ routing. `z-go-grpc` covers protobuf service design, deadline propagation, the status-code/errdetails error model, interceptor ordering, and buf as the schema toolchain. `z-go-http-client` covers outbound HTTP hardening: timeouts, transport tuning, retry with backoff and jitter, and circuit breakers. `z-go-dockerfile` covers multi-stage builds, BuildKit cache mounts, and the scratch vs distroless vs alpine call. `z-go-mcp-server` covers MCP server authoring in Go, including the SDK choice between the official `modelcontextprotocol/go-sdk` and `mark3labs/mcp-go`. `z-go-api-design` covers REST contract semantics — versioning, cursor pagination, Idempotency-Key, problem+json errors, PUT vs PATCH — frozen into the OpenAPI spec before codegen. `z-go-caching` covers Redis cache-aside, stampede protection, and rate limiting. `z-go-clickhouse` covers OLAP modeling, batch/async inserts, and MergeTree engine selection. `z-ts-core` and `z-ts-telegram-mini-app` open the `typescript/` domain: strict-mode TypeScript house conventions plus Telegram Mini App client development (SDK choice, lifecycle, viewport/theme, Stars payments).

### Patch Changes

- [`9515a76`](https://github.com/victorzhuk/skills/commit/9515a7697b5978b915e06849aeb058d7d72a470b) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Fix a batch of factual drift found across the Go, QA, and Rust skills during a correctness pass. `z-go-goose` corrects `goose.NewProvider`'s minimum version to v3.16+ (was v3.18+). `z-go-modernize` fixes two wrong "Since" versions: `crypto/elliptic`→`crypto/ecdh` and `httputil.ReverseProxy.Director`→`.Rewrite` both landed in Go 1.20, not 1.21/1.26. `z-go-performance` fixes a misspelled `GODEBUG` key (`gccheckmark=1`, not `gcchkmark=1`). `z-go-concurrency` drops a dead loop-variable-capture line that's unnecessary on Go 1.22+. `z-go-style` switches its iota examples back to the plain 0-based default, keeping `iota+1` only as the documented conditional case. `z-go-bdd` now notes plainly that BDD adoption in this corpus is opt-in/aspirational rather than the norm. `z-go-cobra-patterns` corrects its env-config boundary claim: `z-go-env-v11` covers `caarlos0/env`, not Viper. `z-go-safety` and `z-go-telegram-bot` trim duplicated example code down to focused snippets. Several skills gained missing `[[cross-links]]` to the skill that actually owns the adjacent topic (test-depth strategy, domain modeling, safety pitfalls, error hygiene).

- [`9515a76`](https://github.com/victorzhuk/skills/commit/9515a7697b5978b915e06849aeb058d7d72a470b) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Fix two skill descriptions (`z-clean-output`, `z-testing-strategy`) that broke strict YAML parsers: an unquoted apostrophe inside a plain scalar. Both are now quoted correctly. `npm run check` and `npm run list` gained matching hardening: quoted descriptions are unwrapped correctly (no more doubled `''` in printed output), and `npm run check` now rejects any unquoted description containing `": "` since that's invalid under strict YAML. `z-qa-visual` is folded into `z-qa-browser` as a "Visual regression (rare)" section — it had no standalone adoption anywhere in the corpus.

- [`9515a76`](https://github.com/victorzhuk/skills/commit/9515a7697b5978b915e06849aeb058d7d72a470b) Thanks [@victorzhuk](https://github.com/victorzhuk)! - Genericize the last employer-specific worked example in `z-creating-flow-doc` onto a neutral orders-service domain, and generalize a stray model-generation reference in `z-skill-mastery`'s reasoning-patterns reference into a model-agnostic note about stating reasoning depth explicitly. Resync the top-level `README.md`, `skills/README.md`, and the engineering/Go/QA README indexes against current skill frontmatter — several one-liners had drifted from their skills' real content, one skill (`z-zero-comments`) was missing from its catalog entries entirely, and all skill-count mentions now read 56 after folding `z-qa-visual` into `z-qa-browser`.

## 0.1.0

### Minor Changes

- Initial public `z-*` skill collection copied from the local agent skills directory.
