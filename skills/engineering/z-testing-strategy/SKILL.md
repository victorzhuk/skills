---
name: z-testing-strategy
description: Choose test depth by type of work, not a fixed coverage target — MVP/greenfield TDD vs existing-service regression protection, and when behavior needs a Gherkin/BDD contract. Use before writing code with observable behavior. Triggers on "what should I test", "TDD", "regression test", "is this MVP or production". Owns the resource-limit floor for dev test runs (timeouts, worker caps). Language syntax/mocking — [[z-go-testing]], [[z-go-bdd]].
---

# Testing strategy

Choose test depth by risk and existing guarantees. Default to test-first for observable behavior.

## Preserve the agreed contract

Use the caller's approved testing mode, flow, seams, and verification scope. An approved tests-after flow remains valid. Do not reopen those decisions because a skill loaded. Under zapply, the dispatch supplies this contract; report missing decisions to the driver.

Without an agreed flow, propose test-first and the lowest interface that proves the behavior. Confirm genuinely unresolved seam decisions before expanding scope.

## Classify the work

Observable behavior includes API/CLI responses, business rules, permissions, money, retries, state transitions, persistence, external effects, and user-visible errors.

Mechanical edits, generated code, trivial mappings, and internal refactors may need existing checks rather than new tests. Read existing coverage before adding a test.

| Work | Default depth |
|---|---|
| MVP or greenfield | Core behavior tests plus smoke checks at real boundaries |
| Feature in an existing service | New behavior and regression coverage around the touched contract |
| Bug fix | Reproduction test that fails without the fix |
| Refactor | Passing characterization coverage before moving behavior |
| Auth, money, permissions, data loss | Existing-service depth even in an MVP |

### MVP

- Test the main behavior, its principal rejection, and relevant auth/money/data-loss rules.
- Prefer domain/use-case tests when they prove the outcome.
- Exercise each touched real boundary that can fail independently.
- Skip getters, DTOs, framework boilerplate, and logic-free mappers.
- Name deferred risks; do not imply untested boundaries are verified.

### Existing service

- Read existing tests and identify guarantees callers already depend on.
- Default to a failing behavior test before a feature or fix. Characterization tests for an unchanged refactor should pass first.
- Cover touched validation, permissions, transactions, state, retries, error mapping, compatibility, and migrations.
- Follow an already-approved tests-after flow when supplied. Still prove a regression test fails without the fix.
- Run the targeted check and the relevant repository suite. Under zapply, run only the dispatched checks; the caller owns the merge floor.

## Choose the layer

| Risk | Lowest useful layer |
|---|---|
| Business rule or algorithm | Domain/use-case test |
| Storage contract | Repository integration test |
| Request/response behavior | Handler/API test |
| External dependency behavior | Adapter contract test |
| Critical journey across layers | E2E test |

Move up when a lower layer hides the actual failure. Several implementation files may share one tested interface; one test file per source file is not a goal.

Use BDD/Gherkin when a business-readable contract has an audience: workflows, permissions, billing, or release evidence. Use ordinary tests for internal algorithms and small rules. Without a BDD harness, use the existing framework; adding a dependency is a separate decision.

## Resource limits

Distinguish three controls:

- A **process deadline** bounds setup, builds, execution, and shutdown.
- A **test timeout** identifies an individual hung test or test binary.
- **Parallel limits** bound packages, workers, tests, and build jobs where applicable.

Inspect repository wrappers and effective settings first. Use existing limits. For ordinary runs lacking them, apply temporary invocation bounds; persistent runner edits are a separate tooling change.

| Runner | Test control | Parallel control |
|---|---|---|
| Go | `-timeout 2m` unit or `10m` integration, per binary; fuzzing also needs `-fuzztime` | `-p` for packages/build jobs; `-parallel` for parallel tests/fuzz workers |
| Cargo | External process deadline; no built-in test timeout | `--jobs` for builds; `-- --test-threads` for tests |
| Vitest | Installed-version `testTimeout` and hook timeouts | `maxWorkers`, for example `50%` |
| Playwright | Test/hook timeouts and `globalTimeout` for the run | `workers`, for example `2` |
| pytest | `--timeout` only with pytest-timeout installed | Bound xdist `-n` if enabled; ordinary pytest is serial |

Use a host deadline or an available `timeout` wrapper for the whole invocation. Allow enough time for expected setup and cleanup. Per-test timeouts do not bound dependency downloads or compilation. Choose explicit worker values appropriate to the machine and record the effective limits.

**Kernel-emitted commands are contracts.** Execute literal commands through the driver's prescribed lifecycle. Do not add flags, deadlines, or workers silently. Report a required but missing limit to the workflow owner.

## Do not

- Chase coverage percentages through boilerplate tests.
- Mock the unit under test or recompute expected values with its implementation.
- Treat MVP scope as permission to omit high-risk rules.
- Leave flaky/skipped tests without a reason and owner.
- Rewrite a dispatched command to satisfy a generic example.

## Verify

Report testing mode, approved flow and seams, command, effective limits, observed result, and deferred risks. A timeout means incomplete verification. If no new behavior test was warranted, explain why.

see [[z-tdd]], [[z-go-testing]], [[z-go-bdd]], [[z-verify-before-done]]
