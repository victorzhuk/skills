# QA family gap table — skills vs real practice

Working audit doc, not for public release. 8 `skills/qa/z-qa-*/SKILL.md` skills
audited against 19 real repos (`gdebenz-buddy-bot`, `homyak`, `go-ent`,
`fastogen`, `ytrack`, `bggwtf`, `realty-planner`, `popoller`, `olymathus`,
`hz-openapi-gen`, `mcp-hub`, `go-lispico`, `impresario`, `anylend`, `spego`,
`singularity-cli`, `v2ray-rs`, `mrack`, `carcust`), each with an independent
verify pass. Verify-stage corrections are folded in below — where the second
pass found the first pass wrong or overstated, the corrected finding is what's
recorded.

## Headline finding — read this before the per-skill rows

This family is qualitatively different from the Go family audit. That audit
found specific drift in an otherwise largely-accurate 32-skill set. This one
finds that **most of this family's named tooling has zero footprint anywhere**
across 19 repos spanning Go, Rust, and TypeScript — not "drifted from an
earlier convention," closer to "generic catalog content never grounded in
real use." `z-qa-debugger`'s own genesis document turned up in the search: a
planning note dated 2026-06-20 (12 days before this audit) showing the skill's
entire taxonomy, `QA_REPORT.md` template, 3-run flaky rule, and
hurl/docker-compose/SQLSTATE tooling were invented when the skill was authored,
verified only by a frontmatter lint and one dry run — never exercised against
a real test failure in any project.

**No dedicated "QA cycle" layer exists in 17-18 of 19 repos.** Testing is
native per language — `go test`, `cargo test`, `vitest`, occasionally `pytest`
— wired directly into Makefile/Taskfile/package.json/CI, with no separate
test-plan-authoring or QA-report step.

**One real, mature exception: `olymathus/proj/api`.** A bespoke `docs/qa/`
tree (`test-plan.md`, `strategy.md`, `regression.md`, `running-tests.md`,
`writing-tests.md`), dated `live-regression-2026-06-{17,19,25}.md` reports, a
project-local `olymathus-regression` Claude skill, and a `/qa:run
smoke|regression|full` command. Structurally close to what the z-qa-* family
gestures at (a tiered, code-path-traceable test plan; phased execution) but
built entirely from native tooling run **sequentially, stop-on-first-failure**
— not the family's parallel multi-agent delegation model. This is the closest
thing to a real exemplar in the whole corpus.

**`go-ent/docs/BDD_TEST_PLAN.md`** is a real P0/P1/P2 plan, but for Ginkgo BDD
— belongs to `z-go-bdd` territory, predates this skill family by ~2 months.

**`impresario`** has real k6 load suites (2 subprojects), real Playwright E2E,
real pytest suites (`scrawlr`, `olymathus`'s scraper tool — corrects an
earlier "zero Python" finding), Locust for queue-based load, adversarial/
golden-file/LLM-as-judge eval suites, and one-off `VALIDATION_REPORT.md` files
tied to specific OpenSpec changes — real testing discipline, richer than
anything this skill family documents, but not shaped like this family at all.

## z-qa-analyst

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Prioritized (P0/P1/P2) test plan citing file:line/requirement per row | Real, in 2 projects, differs from the exact template. `olymathus/docs/qa/test-plan.md`: P0/P1/P2 tiers, source-file→test-file mapping, PRD acceptance-ID traceability (AT1-AT12), honest covered/partial status, "Known Coverage Gaps" section. `go-ent/docs/BDD_TEST_PLAN.md`: same tiers via Ginkgo `Label("P0")`. Neither named `TEST_PLAN.md`, neither has an "API Surface" or "Outstanding markers" table | exceeds_skill | keep the P0/P1/P2 traceable-plan core, rebuild the template on source→test mapping + optional PRD/acceptance-ID column + honest coverage-status column |
| `rg TODO/FIXME/HACK/XXX/BUG/NOCOMMIT` grep as "the cheapest risk signal," first triage step | Zero real usage as a triage step across 19 repos (2 incidental false-positive string matches only). Underlying premise also fails — TODO/FIXME/HACK markers are nearly absent from the codebases themselves | drift | drop or downgrade; doesn't match the low-marker style |
| `TEST_PLAN.md` with "API Surface" table + "Outstanding markers" table | No file named `TEST_PLAN.md` exists anywhere in 19 repos; neither real test-plan doc has either table | drift | remove these sections, replace with what real docs track (traceability + known-gaps) |
| Install `tokei` for coverage baseline; `jaq` for OpenAPI-surface parsing | `tokei`: zero hits anywhere (verify pass found the claimed self-referential mirror doesn't even exist). `jaq`: real, but only as a general CLI preference, never tied to OpenAPI-surface mapping | drift | drop `tokei` entirely; keep `jaq`/`rg`/`fd`/`bat` only as the general preferences they are |
| Test-gap detection via `comm -23` diffing source vs `_test.go` | Zero hits anywhere | drift | replace with `go test -cover` output |
| Parallel sub-analyst pattern (backend/frontend/integrations agents) for monorepos | Zero hits in any of 3 real monorepos checked (impresario, olymathus, anylend) | drift | remove; no precedent, validate on one real monorepo before keeping |

Worth noting: `olymathus` deliberately calls this discipline "testing"/"regression" and reserves "QA" for an unrelated domain concept (`qa_reviewer` role, `qa_corrections` table) — the family's naming doesn't match how Victor talks about this work in his own docs.

## z-qa-api

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| hurl (`.hurl` files, `[Asserts]`, `--test`, `--report-json/html/tap`) as the primary declarative API-testing tool | Zero `.hurl` files, zero hurl mentions anywhere in 19 repos except the skill's own vendored mirror inside `go-ent/pkg/skills/qa/qa-api/`. Real API/HTTP testing is Go's `httptest` (dozens of files across olymathus, impresario, gdebenz-buddy-bot, etc.) + `testcontainers` for real-boundary integration | **drift (decisive)** | reframe around `httptest` + `testcontainers`, not `.hurl` files |
| `xh` for one-off calls piped into `jaq` | Zero real usage, but matches Victor's own stated global CLI-tooling preference (not a repo artifact either way). The one committed ad-hoc HTTP script (`mcp-hub/test_sse_integration.sh` — verify pass corrected: these files are untracked in git, not committed, but the pattern is real in the working tree) uses `curl \| jq`, not `xh`/`jaq` | ambiguous | keep xh/jaq as the recommended default (matches Victor's stated preference), note the one real script reaches for curl+jq instead |
| Anti-pattern: "curl \| grep for assertions — use hurl" | `mcp-hub`'s scripts do exactly this (curl piped to `jq`, no assertions) as their real verification mechanism — and more pervasively than first found (3 sibling scripts, not 1) | drift | drop or soften; this is the real practice in this corpus, not a violation |
| Load/perf out of scope, see `z-qa-performance` | k6 confirmed real and CI-wired in impresario | no_disagreement | none needed |

## z-qa-browser

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| `playwright-cli` command surface: CSS-selector `click`/`type`, `assert-visible/-url/-text/-count`, `--session=`, `save-storage`/`load-storage`, `mock-route` | A real playwright-cli skill IS actively used in one project (`olymathus/.claude/skills/playwright-cli/`, confirmed by real runtime state dirs) — but its actual surface is completely different: ref-based targets from `snapshot` output (`click e5`), `-s=name`, `state-save`/`state-load`, `route`/`unroute`, `list`/`close-all`/`kill-all` — and **no `assert-*` commands at all** (assertions hand-written into generated specs) | **drift (decisive)** | rewrite the Core Commands section against the actual observed surface from olymathus's real skill |
| Philosophy: avoids snapshot dumps for token efficiency; "snapshot in a loop" is an anti-pattern | Inverted — the real tool auto-prints a Snapshot after every command by default; token efficiency comes from a `--raw` flag, not snapshot avoidance | **drift (decisive, backwards)** | correct the philosophy: `--raw` is the real lever, not structural snapshot-avoidance |
| Playwright MCP server (`@playwright/mcp`), Playwright Agents (`init-agents`, planner/generator/healer) | Zero real hits anywhere except the skill's own file and a vendored copy | drift | drop or mark clearly unverified/optional |
| `npx playwright test --reporter`, `--shard` execution pattern | Matches real usage (impresario, olymathus) | no_disagreement | none needed |
| text=/role=/data-testid= selector preference | Matches real usage | no_disagreement | none needed |
| General premise: dedicated QA-cycle layer | `olymathus` has a real bespoke one (see headline finding) — but not produced by this skill's tooling or pipeline | ambiguous | state the real QA-cycle layer exists but is project-bespoke, not this catalog's pipeline |

## z-qa-performance

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| k6 as primary load-test tool, `options{stages,thresholds}`, `http_req_duration` percentiles | Real, close match — 2 impresario subprojects, wired into Makefile targets + one CI workflow. Gap: the skill's named-scenario-executor block is unused; real scripts use flat vus/duration | no_disagreement (mostly) | keep core k6 guidance; downgrade named-scenario-executor to optional |
| `oha` for quick HTTP benchmarks | Zero hits anywhere, including in the one project that does load-test | **drift (decisive)** | drop or mark clearly optional |
| `vegeta` for constant-rate load | Zero real usage — one archived, already-superseded task note mentions it, shipped implementation is k6 | drift | drop; k6 already covers this |
| `hey`, `hyperfine` in Install list | Zero hits anywhere; also orphaned — never referenced again in the skill body | drift | remove, install-noise for unused tools |
| Lighthouse CLI for Core Web Vitals | Zero hits in any TS/web-facing project | drift | drop or caveat as untested |
| `validate-slas.sh` (oha+jaq+bc) as the SLA-gating pattern | Zero hits; also redundant with k6's own native threshold-gating. Real SLA reporting (`impresario/.../generate_scorecard.py`) is a Python script parsing k6+Locust output, not a bash/jaq/bc wrapper | drift | drop; point at k6's built-in thresholds instead |
| Tool set presented as exhaustive (k6/oha/vegeta/Lighthouse) | `impresario/scrawlr` runs Locust (Python) for worker/queue load simulation — a real tool the skill never mentions | exceeds_skill | add a short Locust section for non-HTTP/queue-style load |

## z-qa-spec-writer

Verify-stage corrections matter here — two of the first pass's headline claims were wrong.

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Go framework auto-detection: testify vs ginkgo vs stdlib | Matches real, varied practice exactly (testify default across most repos; ginkgo as a real second BDD layer in go-ent; gdebenz-buddy-bot genuinely stdlib-only) | no_disagreement | keep as-is |
| JS/TS auto-detection: jest/vitest/playwright equally plausible | **Corrected by verify**: vitest is the heaviest hit, but Playwright IS real and first-party too (`olymathus/web/tg`, `impresario/web/pwa` — 23 spec files, real CI wiring). Only jest is genuinely absent (zero first-party hits). First pass's "only vitest shows up" was wrong | drift (narrower than first reported) | note vitest as heaviest, Playwright genuinely first-party too; jest is the one to drop |
| Python auto-detection via `pyproject.toml`/`conftest.py` → pytest | **Corrected by verify**: real, first-party pytest suites exist (`olymathus`'s scraper tool: pytest 8, `conftest.py`, 25 test files; `impresario/scrawlr`'s worker-runner: pytest + pytest-asyncio). First pass's "zero real Python test suites" was wrong | no_disagreement (corrected) | keep the pytest-detection assumption — it's accurate |
| Stub tests as `Skip`/`todo` placeholders tagged with a plan-row ID | Zero P0-/P1-/P2- markers in any real test file across 15 Go repos checked; every real `t.Skip` is environment/platform gating. Real vitest/Playwright suites found are fully-implemented, not stubs | drift | no repo uses Skip/todo as a stub-scaffolding convention tied to a plan ID — this is invented, not observed |
| Gherkin `*.spec.md` per P0 area | Zero `*.spec.md`, zero `*.feature` files, zero `Scenario:` anywhere. Real BDD is Ginkgo `Describe/It` (go-ent), and go-ent's own doc states this was a deliberate dialect choice over Gherkin | **drift (decisive)** | Gherkin is the wrong dialect for this corpus; point at the sibling BDD skill's Ginkgo pattern instead |
| Formal `TEST_CASES.md` table | Zero hits anywhere, and the upstream `TEST_PLAN.md` this claims to consume also doesn't exist | drift | drop; no adopter |

## z-qa-debugger

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| No-fail-fast baseline, realized via a specific flag inventory (`-count=1`, `--tb=short`, `--no-bail`, `hurl --continue-on-error`) | The no-fail-fast *principle* holds trivially (no tool's default is fail-fast). But the specific flag inventory is unused — real invocations are plain `go test -race -cover ./...`, `cargo test --workspace --all-targets`, `npm test` | drift (partial) | keep the principle, drop the invented flag inventory |
| ASSERTION\|PANIC\|TIMEOUT\|DEPENDENCY\|FLAKY failure taxonomy | Zero hits anywhere. **This skill's own genesis document was found** (a plannotator note dated 2026-06-20, 12 days before this audit) — proves the taxonomy was invented when authoring the skill, verified only by frontmatter lint + one dry run, never exercised on a real failure | **drift (decisive, self-admittedly untested)** | either dogfood on the next real CI failure before presenting this as established practice, or label it explicitly as new/proposed |
| `QA_REPORT.md` fixed template | Zero hits anywhere; genesis doc confirms it's new, not derived from existing practice | drift | same treatment as above |
| 3-run flaky rule, `t.Skip("FLAKY: ...")` | Zero hits. Real flaky-handling is Playwright's built-in `retries` config — a different mechanism (framework auto-retry, not manual re-run-then-quarantine) | drift | note the real precedent (framework retries) is different in kind |
| DEPENDENCY triage via `docker compose`/`kubectl` inspection | Verify pass found `kubectl describe pod` and `docker compose logs` DO appear extensively — but as production-incident runbooks (homyak, impresario), never wired to test-failure triage. Real Go integration tests self-provision via `testcontainers-go` | drift (evidence corrected) | add `testcontainers-go` log/Ryuk inspection as the real primary path; keep docker-compose/kubectl as secondary, for services actually run that way |
| SQLSTATE classification via regex pipeline | Only appears as manually-curated known-codes documentation in a deployment runbook, never a live grep pipeline | drift | drop the pipeline framing |

## z-qa-orchestrator

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Delegates to 7 named z-qa-* specialist skills as the standard mechanism | Zero real projects reference any z-qa-* skill name or a coordinator-delegates-to-specialists pattern. Where a phased cycle exists (olymathus), it's ONE project-local skill running every phase itself, no fan-out | **drift (decisive)** | drop the multi-agent delegation model; describe the real pattern (one project-local skill/command running phases sequentially) |
| Parallel execution strategy (Group A/B run concurrently) | Directly contradicted — olymathus's real regression skill explicitly runs phases in order, stop-on-first-failure | **drift (decisive, backwards)** | remove or mark as optional optimization; real default is sequential fail-fast |
| 3-tier Smoke/Regression/Full phase structure | Matches olymathus's real practice almost exactly (smoke ~3-5min, regression ~15-30min, full ~1-2h) | no_disagreement | keep the phase concept, rewrite phase contents around native tooling instead of the skill's hurl/k6/oha/vegeta/axe/lighthouse roster |
| `results/` directory + `SUMMARY.md` synthesis | Zero `results/` dirs, zero matching `SUMMARY.md` anywhere. Real reporting is either inline chat summary, a dated doc appended to a living `docs/qa/` tree, or a one-off `VALIDATION_REPORT.md` tied to an OpenSpec change | drift | replace with whichever pattern the target project already uses for its other artifacts |
| Root-level `TEST_PLAN.md`/`QA_REPORT.md` delegation artifacts | Zero hits at any repo root. Real analog lives inside a permanent, dated `docs/qa/` tree, not regenerated per cycle | drift | describe as a living, dated doc under `docs/qa/`, not an ephemeral root file |
| General premise: a QA-cycle layer is the normal way QA gets done | Spans a real spectrum — most projects have none; olymathus has a real bespoke one; impresario adds k6/Playwright/pytest/Locust/adversarial-eval discipline the skill never anticipates | exceeds_skill | rewrite the premise: a QA-cycle layer is optional/project-specific, built from project-native tooling, with real disciplines (adversarial/security, golden-file, LLM-as-judge, coverage floors) this skill never mentions |

## z-qa-visual

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| `pixelmatch`+`pngjs` custom Node diff script | Zero real usage anywhere (only the skill's own mirror and an unrelated vendored Playwright internal) | **drift (decisive)** | drop as a claimed default |
| `shot-scraper` for baseline capture | Zero hits anywhere | drift | remove |
| `axe-core` CLI as automated CI a11y regression | Only appears as a transitive lint dependency; the one real a11y work item is an unimplemented proposal whose only step is "run axe DevTools manually" | drift | state the automated-CI pipeline as aspirational; real a11y work found is manual spot-checks |
| ImageMagick `compare`/`convert` | Zero real usage | drift | remove |
| Playwright's `toHaveScreenshot()` as the visual-regression path | Playwright itself is real and heavily used for functional E2E — but `toHaveScreenshot` never appears in any real spec. One real design doc explicitly rejected visual regression: "Out of scope — API-only service, no UI layer" | **drift (decisive)** | keep Playwright E2E as real default tooling; don't present the visual-diff pattern as established |
| "Golden files" trigger phrase | Golden-file testing IS genuinely common (fastogen, hz-openapi-gen, homyak, impresario) — but for Go text/JSON codegen snapshots, unrelated to screenshots | ambiguous | clarify "golden files" means image baselines specifically here, to avoid colliding with the real, unrelated Go convention |
| General premise: QA-cycle layer | Same family-wide finding — no separate layer in 17-18 of 19 repos | drift | state plainly, testing is native per language, no QA-workflow layer observed |

## Overall recommendation for Phase 3 shape

Given the scale and character of these findings — this isn't per-line drift,
it's a family-wide credibility gap — the mechanical "align lead example,
demote alternative" approach used for the Go family doesn't fit cleanly here.
Several skills (`z-qa-api`, `z-qa-visual`, most of `z-qa-performance`'s tool
roster) have **no real anchor at all** to align toward; the honest fix is
closer to "state plainly this is unused/aspirational tooling" than "swap in
the real pattern." Two skills (`z-qa-browser`, `z-qa-debugger`) DO have a real
anchor to rewrite against (olymathus's actual `playwright-cli` surface;
`testcontainers-go` for dependency triage) — those can be mechanically fixed
like the Go family was. This needs your call before Phase 3 starts.
