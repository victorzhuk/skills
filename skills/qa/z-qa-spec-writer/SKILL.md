---
name: z-qa-spec-writer
description: Test framework auto-detection (Go testify/ginkgo/stdlib, JS/TS vitest/playwright, Python pytest) and compilable stub generation matched to the repo's real import and assert style. Auto-activates for: test stub generation, test scaffolding, spec-first testing, framework detection, "add a skipped test for". Does not cover Gherkin/BDD scenarios or ginkgo priority Label tagging; see [[z-go-bdd]]. Does not cover writing the test plan itself; see [[z-qa-analyst]].
---

# Spec Writer QA Skill

## Philosophy

**Detect the framework, then speak its dialect** — read existing tests to learn the assertion
library, import style, and naming before emitting a single stub. Rule: a stub that doesn't compile
wastes more time than no stub — match the project's exact imports, never invent a framework it
doesn't use.

## Install

```bash
# No installs required — the skill reads the project's existing toolchain
# and reuses whatever the repo already declares:
#   Go:     testing / testify / ginkgo   (go.mod)
#   JS/TS:  vitest / playwright           (package.json)
#   Python: pytest                        (pyproject.toml / conftest.py)
```

## Framework Detection — Auto-detect

```bash
# Go: testify vs ginkgo vs stdlib
rg -l 'testify/(assert|require|suite)' --type go && echo "-> testify"
rg -l 'onsi/ginkgo' --type go && echo "-> ginkgo"

# JS/TS: read the manifest — vitest is the default assumption, playwright is
# first-party for e2e (not a fallback), jest has no real footprint — don't detect for it
jaq -r '.devDependencies // {} | keys[]' package.json 2>/dev/null | rg 'vitest|playwright'
fd '^(vitest|playwright)\.config\.'

# Python: pytest config + fixtures
fd '^(pyproject\.toml|conftest\.py)$' && rg -l 'pytest' pyproject.toml conftest.py 2>/dev/null
```
Always read 1–3 existing test files of the detected framework **before** generating — copy their
import block and assertion style verbatim.

## Go testify — Stub Pattern
```go
// widget_test.go — stub for RejectExpiredJWT
package widget

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRejectExpiredJWT(t *testing.T) {
	tests := []struct {
		name    string
		token   string
		wantErr bool
	}{
		{name: "expired token rejected", token: ""}, // TODO: real fixture
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Skip("stub: not implemented")
			require.NotNil(t, tt)
		})
	}
}
```
Ginkgo variant (when `onsi/ginkgo` is detected): `var _ = Describe("...", func(){ It("...", func(){ Skip("stub") }) })`.
Priority tagging via `Label("p0"/"p1"/"p2")` is a real ginkgo convention — see [[z-go-bdd]]; don't
invent your own ID scheme on top of it.

## Vitest — Stub Pattern
```ts
// auth.test.ts — match ESM/CJS + import style from the detected config
import { describe, it } from "vitest";

describe("auth", () => {
  it.todo("rejects an expired JWT");
  it.todo("issues a token on valid login");
});
```

## Playwright — Stub Pattern
```ts
// checkout.spec.ts
import { test } from "@playwright/test";

test.describe("checkout", () => {
  test.skip("completes a guest purchase", async ({ page }) => {
    // TODO: navigate -> add to cart -> pay -> assert confirmation
  });
});
```
Playwright is genuinely first-party for e2e (real `playwright.config` + specs wired into CI), not
a fallback tool — detect and stub it whenever a `playwright.config.*` exists, even in a
vitest-primary repo.

## pytest — Stub Pattern
```python
# test_auth.py — reuse fixtures discovered in conftest.py
import pytest


@pytest.mark.skip(reason="not implemented")
def test_reject_expired_jwt(client):  # client fixture from conftest.py
    ...
```

## Agent Patterns

### Stubs from TEST_PLAN.md
```
1. Read TEST_PLAN.md -> collect rows for the target priority tier(s).
2. Detect framework (above); read 1-3 existing tests for style.
3. Emit one stub file per source file, mirroring TEST_PLAN.md's Source file -> Test file mapping.
4. Report every file written.
```
Name tests descriptively from the row's behavior, not a synthetic ID — no real repo tags
`t.Skip`/`it.todo`/`@pytest.mark.skip` with a `P0-1`-style marker; mirror the Source file -> Test
file mapping instead.

## Do not

- Generating stubs without reading existing tests first — detect the framework and copy the real import/assert style
- Emitting runnable (failing) tests — every stub stays `Skip`/`todo` so CI stays green until implemented
- Inventing a framework the repo doesn't declare — never add testify to a stdlib-only project, never assume jest over vitest
- Tagging stubs with synthetic `P0-1`/`P1-3` markers — mirror TEST_PLAN.md's Source file -> Test file mapping and a descriptive name instead
- One giant test file — one stub file per source file, mirroring the source layout

## Verify

- Stub compiles/typechecks without running: `go build ./...`, `tsc --noEmit`, or `python -m py_compile <file>`.
- Every stub is skipped, not failing: run the suite and confirm the new file reports skip/todo, not fail.
- Stub file path mirrors the source file it covers, per TEST_PLAN.md's mapping.

Consumes `TEST_PLAN.md` from [[z-qa-analyst]]; [[z-qa-debugger]] runs and triages the generated
stubs. BDD/Gherkin scenarios and ginkgo priority `Label` tagging belong to [[z-go-bdd]]. Coordinated
by [[z-qa-orchestrator]].
