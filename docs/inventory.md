# z-* Skill Inventory

Copied 51 `z-*` skills from `~/.agents/skills` into this repo. A further 5
cross-cutting doctrine skills were authored directly (not copied from a
pre-existing skill) to close the gap between what the technical skills teach
and the taste/restraint that governed writing them — see "Doctrine skills"
below. A later batch of 10 skills was authored straight into this repo with
no private-skills staging step at all — see "Phase 2 — authored directly"
below.

## Copied skills

| Skill | Category | Source | Destination |
|---|---|---|---|
| `z-changelog` | `engineering` | `~/.agents/skills/z-changelog` | [`skills/engineering/z-changelog/SKILL.md`](../skills/engineering/z-changelog/SKILL.md) |
| `z-codegraph` | `engineering` | `~/.agents/skills/z-codegraph` | [`skills/engineering/z-codegraph/SKILL.md`](../skills/engineering/z-codegraph/SKILL.md) |
| `z-creating-flow-doc` | `engineering` | `~/.agents/skills/z-creating-flow-doc` | [`skills/engineering/z-creating-flow-doc/SKILL.md`](../skills/engineering/z-creating-flow-doc/SKILL.md) |
| `z-domain-modeling` | `engineering` | `~/.agents/skills/z-domain-modeling` | [`skills/engineering/z-domain-modeling/SKILL.md`](../skills/engineering/z-domain-modeling/SKILL.md) |
| `z-memory-hygiene` | `engineering` | `~/.agents/skills/z-memory-hygiene` | [`skills/engineering/z-memory-hygiene/SKILL.md`](../skills/engineering/z-memory-hygiene/SKILL.md) |
| `z-npm-publish` | `engineering` | `~/.agents/skills/z-npm-publish` | [`skills/engineering/z-npm-publish/SKILL.md`](../skills/engineering/z-npm-publish/SKILL.md) |
| `z-skill-mastery` | `engineering` | `~/.agents/skills/z-skill-mastery` | [`skills/engineering/z-skill-mastery/SKILL.md`](../skills/engineering/z-skill-mastery/SKILL.md) |
| `z-go-bdd` | `go` | `~/.agents/skills/z-go-bdd` | [`skills/go/z-go-bdd/SKILL.md`](../skills/go/z-go-bdd/SKILL.md) |
| `z-go-ci` | `go` | `~/.agents/skills/z-go-ci` | [`skills/go/z-go-ci/SKILL.md`](../skills/go/z-go-ci/SKILL.md) |
| `z-go-clean-arch-di` | `go` | `~/.agents/skills/z-go-clean-arch-di` | [`skills/go/z-go-clean-arch-di/SKILL.md`](../skills/go/z-go-clean-arch-di/SKILL.md) |
| `z-go-cobra-patterns` | `go` | `~/.agents/skills/z-go-cobra-patterns` | [`skills/go/z-go-cobra-patterns/SKILL.md`](../skills/go/z-go-cobra-patterns/SKILL.md) |
| `z-go-codegen-patterns` | `go` | `~/.agents/skills/z-go-codegen-patterns` | [`skills/go/z-go-codegen-patterns/SKILL.md`](../skills/go/z-go-codegen-patterns/SKILL.md) |
| `z-go-concurrency` | `go` | `~/.agents/skills/z-go-concurrency` | [`skills/go/z-go-concurrency/SKILL.md`](../skills/go/z-go-concurrency/SKILL.md) |
| `z-go-context` | `go` | `~/.agents/skills/z-go-context` | [`skills/go/z-go-context/SKILL.md`](../skills/go/z-go-context/SKILL.md) |
| `z-go-database` | `go` | `~/.agents/skills/z-go-database` | [`skills/go/z-go-database/SKILL.md`](../skills/go/z-go-database/SKILL.md) |
| `z-go-documentation` | `go` | `~/.agents/skills/z-go-documentation` | [`skills/go/z-go-documentation/SKILL.md`](../skills/go/z-go-documentation/SKILL.md) |
| `z-go-env-v11` | `go` | `~/.agents/skills/z-go-env-v11` | [`skills/go/z-go-env-v11/SKILL.md`](../skills/go/z-go-env-v11/SKILL.md) |
| `z-go-errors` | `go` | `~/.agents/skills/z-go-errors` | [`skills/go/z-go-errors/SKILL.md`](../skills/go/z-go-errors/SKILL.md) |
| `z-go-feature-flags` | `go` | `~/.agents/skills/z-go-feature-flags` | [`skills/go/z-go-feature-flags/SKILL.md`](../skills/go/z-go-feature-flags/SKILL.md) |
| `z-go-goose` | `go` | `~/.agents/skills/z-go-goose` | [`skills/go/z-go-goose/SKILL.md`](../skills/go/z-go-goose/SKILL.md) |
| `z-go-interfaces` | `go` | `~/.agents/skills/z-go-interfaces` | [`skills/go/z-go-interfaces/SKILL.md`](../skills/go/z-go-interfaces/SKILL.md) |
| `z-go-lint` | `go` | `~/.agents/skills/z-go-lint` | [`skills/go/z-go-lint/SKILL.md`](../skills/go/z-go-lint/SKILL.md) |
| `z-go-llm-streaming` | `go` | `~/.agents/skills/z-go-llm-streaming` | [`skills/go/z-go-llm-streaming/SKILL.md`](../skills/go/z-go-llm-streaming/SKILL.md) |
| `z-go-makefile` | `go` | `~/.agents/skills/z-go-makefile` | [`skills/go/z-go-makefile/SKILL.md`](../skills/go/z-go-makefile/SKILL.md) |
| `z-go-modernize` | `go` | `~/.agents/skills/z-go-modernize` | [`skills/go/z-go-modernize/SKILL.md`](../skills/go/z-go-modernize/SKILL.md) |
| `z-go-naming` | `go` | `~/.agents/skills/z-go-naming` | [`skills/go/z-go-naming/SKILL.md`](../skills/go/z-go-naming/SKILL.md) |
| `z-go-observability` | `go` | `~/.agents/skills/z-go-observability` | [`skills/go/z-go-observability/SKILL.md`](../skills/go/z-go-observability/SKILL.md) |
| `z-go-ogen` | `go` | `~/.agents/skills/z-go-ogen` | [`skills/go/z-go-ogen/SKILL.md`](../skills/go/z-go-ogen/SKILL.md) |
| `z-go-performance` | `go` | `~/.agents/skills/z-go-performance` | [`skills/go/z-go-performance/SKILL.md`](../skills/go/z-go-performance/SKILL.md) |
| `z-go-pgvector` | `go` | `~/.agents/skills/z-go-pgvector` | [`skills/go/z-go-pgvector/SKILL.md`](../skills/go/z-go-pgvector/SKILL.md) |
| `z-go-pkg` | `go` | `~/.agents/skills/z-go-pkg` | [`skills/go/z-go-pkg/SKILL.md`](../skills/go/z-go-pkg/SKILL.md) |
| `z-go-safety` | `go` | `~/.agents/skills/z-go-safety` | [`skills/go/z-go-safety/SKILL.md`](../skills/go/z-go-safety/SKILL.md) |
| `z-go-security` | `go` | `~/.agents/skills/z-go-security` | [`skills/go/z-go-security/SKILL.md`](../skills/go/z-go-security/SKILL.md) |
| `z-go-sqlc` | `go` | `~/.agents/skills/z-go-sqlc` | [`skills/go/z-go-sqlc/SKILL.md`](../skills/go/z-go-sqlc/SKILL.md) |
| `z-go-style` | `go` | `~/.agents/skills/z-go-style` | [`skills/go/z-go-style/SKILL.md`](../skills/go/z-go-style/SKILL.md) |
| `z-go-taskfile` | `go` | `~/.agents/skills/z-go-taskfile` | [`skills/go/z-go-taskfile/SKILL.md`](../skills/go/z-go-taskfile/SKILL.md) |
| `z-go-telegram-bot` | `go` | `~/.agents/skills/z-go-telegram-bot` | [`skills/go/z-go-telegram-bot/SKILL.md`](../skills/go/z-go-telegram-bot/SKILL.md) |
| `z-go-testing` | `go` | `~/.agents/skills/z-go-testing` | [`skills/go/z-go-testing/SKILL.md`](../skills/go/z-go-testing/SKILL.md) |
| `z-go-troubleshooting` | `go` | `~/.agents/skills/z-go-troubleshooting` | [`skills/go/z-go-troubleshooting/SKILL.md`](../skills/go/z-go-troubleshooting/SKILL.md) |
| `z-qa-analyst` | `qa` | `~/.agents/skills/z-qa-analyst` | [`skills/qa/z-qa-analyst/SKILL.md`](../skills/qa/z-qa-analyst/SKILL.md) |
| `z-qa-api` | `qa` | `~/.agents/skills/z-qa-api` | [`skills/qa/z-qa-api/SKILL.md`](../skills/qa/z-qa-api/SKILL.md) |
| `z-qa-browser` | `qa` | `~/.agents/skills/z-qa-browser` | [`skills/qa/z-qa-browser/SKILL.md`](../skills/qa/z-qa-browser/SKILL.md) |
| `z-qa-debugger` | `qa` | `~/.agents/skills/z-qa-debugger` | [`skills/qa/z-qa-debugger/SKILL.md`](../skills/qa/z-qa-debugger/SKILL.md) |
| `z-qa-orchestrator` | `qa` | `~/.agents/skills/z-qa-orchestrator` | [`skills/qa/z-qa-orchestrator/SKILL.md`](../skills/qa/z-qa-orchestrator/SKILL.md) |
| `z-qa-performance` | `qa` | `~/.agents/skills/z-qa-performance` | [`skills/qa/z-qa-performance/SKILL.md`](../skills/qa/z-qa-performance/SKILL.md) |
| `z-qa-spec-writer` | `qa` | `~/.agents/skills/z-qa-spec-writer` | [`skills/qa/z-qa-spec-writer/SKILL.md`](../skills/qa/z-qa-spec-writer/SKILL.md) |
| `z-rust-core` | `rust` | `~/.agents/skills/z-rust-core` | [`skills/rust/z-rust-core/SKILL.md`](../skills/rust/z-rust-core/SKILL.md) |
| `z-rust-gtk4` | `rust` | `~/.agents/skills/z-rust-gtk4` | [`skills/rust/z-rust-gtk4/SKILL.md`](../skills/rust/z-rust-gtk4/SKILL.md) |
| `z-rust-web` | `rust` | `~/.agents/skills/z-rust-web` | [`skills/rust/z-rust-web/SKILL.md`](../skills/rust/z-rust-web/SKILL.md) |
| `z-concise-human-docs` | `writing` | `~/.agents/skills/z-concise-human-docs` | [`skills/writing/z-concise-human-docs/SKILL.md`](../skills/writing/z-concise-human-docs/SKILL.md) |
| `z-fuck-slop` | `writing` | `~/.agents/skills/z-fuck-slop` | [`skills/writing/z-fuck-slop/SKILL.md`](../skills/writing/z-fuck-slop/SKILL.md) |

## Doctrine skills

Five skills distill the cross-cutting engineering discipline that previously
lived only as private rules/references (no-over-engineering, zero-comments,
no-AI-style-code, clean-output, testing-depth judgment). Authored fresh in
`~/.agents/skills/`, then copied here — same flow as the rest of the catalog,
generalized so they read as house doctrine rather than personal rules.

| Skill | Category | Source | Destination |
|---|---|---|---|
| `z-no-over-engineering` | `engineering` | `~/.agents/skills/z-no-over-engineering` | [`skills/engineering/z-no-over-engineering/SKILL.md`](../skills/engineering/z-no-over-engineering/SKILL.md) |
| `z-zero-comments` | `engineering` | `~/.agents/skills/z-zero-comments` | [`skills/engineering/z-zero-comments/SKILL.md`](../skills/engineering/z-zero-comments/SKILL.md) |
| `z-no-ai-style-code` | `engineering` | `~/.agents/skills/z-no-ai-style-code` | [`skills/engineering/z-no-ai-style-code/SKILL.md`](../skills/engineering/z-no-ai-style-code/SKILL.md) |
| `z-clean-output` | `engineering` | `~/.agents/skills/z-clean-output` | [`skills/engineering/z-clean-output/SKILL.md`](../skills/engineering/z-clean-output/SKILL.md) |
| `z-testing-strategy` | `engineering` | `~/.agents/skills/z-testing-strategy` | [`skills/engineering/z-testing-strategy/SKILL.md`](../skills/engineering/z-testing-strategy/SKILL.md) |

## Phase 2 — authored directly

Ten skills written straight into this repo, not staged first in a private
skills directory — eight fill Go gaps (messaging, gRPC, outbound HTTP,
Dockerfiles, MCP servers, API contract design, caching, ClickHouse); two open
the `typescript/` domain for TypeScript house conventions and Telegram Mini
App client work.

| Skill | Category | Origin | Destination |
|---|---|---|---|
| `z-go-api-design` | `go` | authored directly in this repo | [`skills/go/z-go-api-design/SKILL.md`](../skills/go/z-go-api-design/SKILL.md) |
| `z-go-caching` | `go` | authored directly in this repo | [`skills/go/z-go-caching/SKILL.md`](../skills/go/z-go-caching/SKILL.md) |
| `z-go-clickhouse` | `go` | authored directly in this repo | [`skills/go/z-go-clickhouse/SKILL.md`](../skills/go/z-go-clickhouse/SKILL.md) |
| `z-go-dockerfile` | `go` | authored directly in this repo | [`skills/go/z-go-dockerfile/SKILL.md`](../skills/go/z-go-dockerfile/SKILL.md) |
| `z-go-grpc` | `go` | authored directly in this repo | [`skills/go/z-go-grpc/SKILL.md`](../skills/go/z-go-grpc/SKILL.md) |
| `z-go-http-client` | `go` | authored directly in this repo | [`skills/go/z-go-http-client/SKILL.md`](../skills/go/z-go-http-client/SKILL.md) |
| `z-go-mcp-server` | `go` | authored directly in this repo | [`skills/go/z-go-mcp-server/SKILL.md`](../skills/go/z-go-mcp-server/SKILL.md) |
| `z-go-messaging` | `go` | authored directly in this repo | [`skills/go/z-go-messaging/SKILL.md`](../skills/go/z-go-messaging/SKILL.md) |
| `z-ts-core` | `typescript` | authored directly in this repo | [`skills/typescript/z-ts-core/SKILL.md`](../skills/typescript/z-ts-core/SKILL.md) |
| `z-ts-telegram-mini-app` | `typescript` | authored directly in this repo | [`skills/typescript/z-ts-telegram-mini-app/SKILL.md`](../skills/typescript/z-ts-telegram-mini-app/SKILL.md) |

## Phase 3 — product pipeline

Five skills opening the `product/` domain: an idea-to-implementation chain
(grill → design brief → cloud-design handoff → PRD → OpenSpec changes).
`z-grill-with-docs` is ported from Matt Pocock's skill of the same name (MIT);
the interview loop of the others and the PRD/slicing workflows are adapted
from his `grilling`, `to-prd`, and `to-issues` skills (MIT), retargeted from
an issue tracker to OpenSpec change directories.

| Skill | Category | Origin | Destination |
|---|---|---|---|
| `z-grill-with-docs` | `product` | ported from [mattpocock/skills grill-with-docs](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) (MIT) | [`skills/product/z-grill-with-docs/SKILL.md`](../skills/product/z-grill-with-docs/SKILL.md) |
| `z-design-brief` | `product` | authored directly in this repo | [`skills/product/z-design-brief/SKILL.md`](../skills/product/z-design-brief/SKILL.md) |
| `z-design-handoff` | `product` | authored directly in this repo | [`skills/product/z-design-handoff/SKILL.md`](../skills/product/z-design-handoff/SKILL.md) |
| `z-to-prd` | `product` | authored directly in this repo (workflow adapted from mattpocock/skills to-prd, MIT) | [`skills/product/z-to-prd/SKILL.md`](../skills/product/z-to-prd/SKILL.md) |
| `z-prd-to-openspec` | `product` | authored directly in this repo (slicing adapted from mattpocock/skills to-issues, MIT) | [`skills/product/z-prd-to-openspec/SKILL.md`](../skills/product/z-prd-to-openspec/SKILL.md) |

## Public cleanup applied

- Replaced the personal npm scope example in `z-npm-publish` with `@scope/*`.
- Replaced absolute local QA delegation paths with local skill references.
- Replaced a local layer-rules reference in `z-go-sqlc` with generic repository-layer guidance.
- Removed missing commit-rules references from changelog/npm publishing descriptions.
- Folded `z-qa-visual` into `z-qa-browser` as a "Visual regression (rare)" section; it had no real project adoption on its own.
- Replaced employer-specific worked-example terms in `z-creating-flow-doc` with a neutral orders-service domain.
- Removed project codenames from `z-qa-browser`.
- Genericized repo names in `z-rust-web`.
- Stripped `license`/`metadata` frontmatter fields from the `z-grill-with-docs` port; MIT attribution moved to a credit line in its two `references/` format files and the provenance row above.

## Not copied

This import focused on `z-*` skills only. Non-`z-*` skills from the global skill directory were left out.
