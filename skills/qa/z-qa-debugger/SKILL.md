---
name: z-qa-debugger
description: "Test execution without fail-fast, failure classification, flaky detection, and QA report authoring. Auto-activates for: test failure triage, flaky tests, QA report, race conditions, test run analysis, QA_REPORT.md, root cause."
---

# Debugger QA Skill

## Philosophy

**Run without fail-fast, classify before fixing** — stopping at the first failure hides the
landscape. Run the whole suite, then sort every failure into exactly one of
`ASSERTION | PANIC | TIMEOUT | DEPENDENCY | FLAKY` before touching code. The deliverable is a
`QA_REPORT.md` with a root cause and fix per failure. Rule: a failure you can't classify is a
failure you can't reliably fix.

## Install

```bash
# Go race detector ships with the toolchain (needs cgo): go test -race
# Go integration deps: testcontainers-go self-provisions ephemeral containers (see below)
# Dependency inspection for services actually run via compose/k8s in production:
#   docker compose (logs/ps)  — service health
#   kubectl (logs/describe)   — K8s pods
# No extra installs for standard Go / Rust / JS / Python stacks.
```

## Test Execution — Stack Flags

Run the whole suite without fail-fast — no `-x`, no `--failfast`, no early bail. None of these
tools default to fail-fast, so real invocations stay plain:

```bash
# Go — race detector + coverage
go test -race -cover ./...

# Rust
cargo test --workspace --all-targets

# Python
pytest

# JS/TS
npm test                              # e.g. vitest run
```

## Failure Classification

| Class | Detection signature | First action |
|-------|---------------------|--------------|
| `ASSERTION` | `FAIL` + expected/got mismatch | read test + impl, diff the logic |
| `PANIC` | `panic:` / `SIGSEGV` / nil pointer | **blocking** — read goroutine dump, trace nil deref |
| `TIMEOUT` | `context deadline exceeded` / `i/o timeout` | check DEPENDENCY health *first* |
| `DEPENDENCY` | `connection refused` / `dial tcp` / container startup error | inspect testcontainers/compose/k8s; not a code bug |
| `FLAKY` | passes and fails across runs | prefer framework-level retry; else the 3-run rule |

## Stack-Specific Triage

```bash
# Go data race — read the DATA RACE block: two goroutines + the racing lines
go test -race -cover ./... 2>&1 | rg -A20 'DATA RACE'
```

### DEPENDENCY failures — Go integration tests

Go integration tests provision their own dependencies via testcontainers-go
(`github.com/testcontainers/testcontainers-go`, e.g. `modules/postgres`) — there's usually no
docker-compose or kubectl to inspect. Check this first:

```bash
# Ryuk (the reaper container) manages container lifecycle — startup failures show here
docker logs $(docker ps -aq --filter name=ryuk) 2>&1 | tail -50

# TESTCONTAINERS_RYUK_DISABLED=true means no reaper — containers can leak between runs
# and stale state can masquerade as a DEPENDENCY failure
env | rg TESTCONTAINERS

# the test run's own output carries the real startup error
go test -race -cover ./... 2>&1 | rg -i 'testcontainers|starting container|failed to start'
```

Fall back to `docker compose ps` / `kubectl describe pod` only when the failing dependency is a
service the project actually runs that way in deployment — most Go test suites don't; they
self-provision.

### SQLSTATE errors

Don't build a live grep-and-classify pipeline — document the specific SQLSTATE codes your
project actually hits in the deployment runbook by hand (e.g. `23xxx` unique/FK violation,
`40xxx` serialization/deadlock, `57xxx` admin shutdown) and match failures against that list.

## Agent Patterns

### Full run + classify
```
1. For Go integration failures, check testcontainers-go health first (Ryuk logs,
   TESTCONTAINERS_RYUK_DISABLED); for anything actually deployed via compose/k8s, check that.
2. Run the full suite WITHOUT fail-fast; capture all output.
3. Classify every failure (table above).
4. ASSERTION/PANIC: trace test -> implementation, find the divergence.
5. TIMEOUT/DEPENDENCY: inspect service logs, don't edit code blindly.
6. Write QA_REPORT.md.
```

### Flaky handling

The real mechanism is framework-level auto-retry, not manual re-run-then-quarantine.
Playwright's built-in `retries` config is the precedent — see [[z-qa-browser]] for wiring E2E
tests:

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

The framework re-runs a failed test itself and only reports it flaky once every attempt fails.
For stacks without a framework-level retry option (plain `go test`, `cargo test`, `pytest`),
fall back to the manual rule: re-run only the suspect test 3x, record pass/fail each time.

```bash
for i in 1 2 3; do go test -run '^TestSuspect$' ./pkg/...; echo "run $i: exit $?"; done
# Non-deterministic across the 3 runs -> classify FLAKY and quarantine:
#   t.Skip("FLAKY: tracking #N")
# A single failure is NOT flaky — it is a real failure until proven otherwise.
```

### Race detection pass (Go)
```bash
go test -race -cover ./... 2>&1 | tee race.log
rg -c 'DATA RACE' race.log    # > 0 means real concurrency bugs to trace
```

## QA_REPORT.md Template

```markdown
# QA Report — {{repo}} — {{date}}

## Run
Command: `{{cmd}}` | Env: {{env}}
| Total | Passed | Failed | Skipped | Flaky |
|-------|--------|--------|---------|-------|
| {{n}} | {{n}} | {{n}} | {{n}} | {{n}} |

## Failures
| ID | Test | Class | Root Cause | Code Path | Fix Recommendation |
|----|------|-------|------------|-----------|--------------------|
| F-1 | TestRejectExpiredJWT | ASSERTION | clock skew not handled | internal/auth/jwt.go:42 | compare exp with leeway |

## Flaky Quarantine (3-run evidence, when no framework retry applies)
| Test | run1 | run2 | run3 | Suspected cause | Tracking |
|------|------|------|------|-----------------|----------|

## Dependency Health
| Service | Status | Note |
|---------|--------|------|

## Recommended Actions
- Blocking (PANIC / data loss): ...
- This sprint: ...
- Backlog: ...
```

## Do not

- Run with `-x` / `-failfast` — hides the full failure landscape; run everything
- Classify FLAKY on a single failure — a framework's own `retries` config already absorbs
  transient failures; where none exists, require 3 runs of evidence first
- Diagnose TIMEOUT before checking dependency health — for Go, check testcontainers-go/Ryuk
  before blaming the code; a dead dependency looks like a code bug
- Merge with an open PANIC — `panic`/segfault is always blocking
- Report a failure without a root cause + code path — every row cites file:line and a fix

Runs the stubs from [[z-qa-spec-writer]] against the priorities in [[z-qa-analyst]]'s
`TEST_PLAN.md`; feeds the [[z-qa-orchestrator]] summary report.
