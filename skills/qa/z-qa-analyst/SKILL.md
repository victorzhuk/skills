---
name: z-qa-analyst
description: "Codebase research and prioritized test-plan authoring — build a requirements-traceability matrix mapping source files to test files, tier risk into P0/P1/P2, and record honest coverage status from the project's own coverage tool. Auto-activates for: test planning, QA analysis, coverage mapping, test priority classification, acceptance traceability, writing or updating a test plan. Does not cover test stub generation; see [[z-qa-spec-writer]]. Does not cover running or triaging tests; see [[z-qa-debugger]]."
---

# Test Plan Analyst

Map every source file under scope to its test file(s), tier by risk, and record honest coverage status in one living, dated test plan.

## Method

1. Read existing tests before proposing new ones — locate them with `fd`, skim with `bat`. Know what already passes before adding rows.
2. Map each source file to its test file(s) by name/directory convention.
3. Tier every row P0/P1/P2 by real risk — crash/auth/data-loss outranks a core invariant, which outranks an integration edge case.
4. Get status from the project's own coverage tool. Don't infer coverage from a file merely existing.
5. Update the project's existing test-plan doc in place. Don't regenerate a fresh file every cycle — treat it as living, dated, versioned like any other doc.

## Install

`rg`, `fd`, `bat`, `jaq` are general-purpose CLI preferences for this work, not steps in one fixed pipeline:

```bash
cargo install ripgrep    # or: brew install ripgrep | apt install ripgrep
cargo install fd-find    # or: brew install fd
cargo install bat
cargo install jaq        # jq alternative, only needed when parsing an OpenAPI/JSON spec
```

## Locate tests and map to source

```bash
fd -e go '_test\.go$' internal/
fd '\.(test|spec)\.(ts|js)$' src/
fd '^test_.*\.py$'
```

Match by convention: `foo.go` -> `foo_test.go`, `Foo.tsx` -> `Foo.test.tsx`, `foo.py` -> `test_foo.py`. A source file with no matching test file is a `gap` row, not something to skip.

## Coverage status — trust the tool, not file presence

```bash
go test -cover ./internal/...
go test -coverprofile=/tmp/cover.out ./... && go tool cover -func=/tmp/cover.out | rg -v '100.0%'
npx vitest run --coverage
pytest --cov=src --cov-report=term-missing
```

A same-named `_test.go` file existing says nothing about which branches it exercises — read the coverage percentage per function, not just presence or absence of the file.

## Route / auth surface (when the change touches it)

```bash
rg -n '\.(Get|Post|Put|Patch|Delete)\(|HandleFunc' internal/ src/
rg -ni 'authoriz|authenticat|permission|role|jwt|bearer|session' internal/ src/
```

If the service exposes OpenAPI (ogen-based Go services — see [[z-go-ogen]]), dumping the spec is faster than grepping registrations:

```bash
xh GET localhost:8080/openapi.json | jaq '.paths | keys[]'
```

Treat this as one optional input, not a required first step.

## Test plan structure

Keep one dated, living plan per project. Update it in place as coverage changes rather than regenerating a new file each cycle.

```markdown
# Test Plan — {{project}} — updated {{date}}

## P0 — Must Never Break
Crashes, auth bypass, data loss, permission or money violations.

| Source file | Test file(s) | Scenario | Acceptance ID | Status |
|---|---|---|---|---|
| internal/auth/jwt.go | internal/auth/jwt_test.go | reject expired JWT | AT3 | covered |

## P1 — Core Product Invariants
Behavior every normal user journey depends on.

| Source file | Test file(s) | Scenario | Acceptance ID | Status |
|---|---|---|---|---|

## P2 — Integration Journey
Cross-component flows, external adapters, edge cases.

| Source file | Test file(s) | Scenario | Acceptance ID | Status |
|---|---|---|---|---|

## Known Coverage Gaps
- {{area}}: {{what's missing, why it matters}} — status: partial | gap
```

Acceptance ID links a row to a numbered criterion in the project's own requirements doc (`AT3` -> `../product/prd.md#AT3`) when one exists. Drop the column entirely on projects with no such doc — never invent an ID.

Status is honest, not aspirational: `covered` (the coverage tool confirms it), `partial` (some branches, not all), `gap` (nothing tests it). Every `partial`/`gap` row also gets a line under Known Coverage Gaps so nobody has to scan every table to find them.

## Do not

- Grep for TODO/FIXME/HACK/XXX/BUG/NOCOMMIT as a first step — real codebases carry almost none of these; it burns the first pass without surfacing real risk.
- Reach for `tokei` or any LOC-counting tool — line counts don't tell you what's tested.
- Use `comm -23` on sorted file-name lists to "detect" untested files — a same-named `_test.go` existing says nothing about branch coverage; run the language's own coverage tool instead.
- Spawn parallel backend/frontend/integrations sub-analysts for a monorepo — no real project needs this split; read the affected subtree directly.
- Mark everything P0 — reserve it for crash/auth/data-loss; forcing every row through the top tier defeats the tiering.
- Regenerate a fresh plan file every cycle — update the existing dated plan in place.
- Invent an acceptance ID or PRD link that doesn't exist in the project.

## Verify

- Every P0/P1/P2 row has a source file and at least one test file, or an honest `gap` status if none exists.
- Every `partial`/`gap` status also appears under Known Coverage Gaps.
- Coverage status matches actual coverage-tool output, not a guess.
- The plan is dated and lives in the project's docs tree, not regenerated as a disposable one-off.

Hand the plan to [[z-qa-spec-writer]] to generate stubs for the gaps; [[z-qa-debugger]] runs and triages the results; [[z-qa-orchestrator]] coordinates the full cycle. For Go test syntax see [[z-go-testing]]; for behavior contracts see [[z-go-bdd]]. Surface-specific execution: [[z-qa-browser]], [[z-qa-api]], [[z-qa-performance]].
