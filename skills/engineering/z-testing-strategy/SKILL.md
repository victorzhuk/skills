---
name: z-testing-strategy
description: "Choose acceptance scope and residual-risk tests before changing observable behavior. Default to readable BDD contracts and repeatable E2E acceptance. Use for test strategy, regression scope, or unit/integration exceptions. Owns test resource limits. Scenario contracts belong to [[z-bdd]], test mechanics to language skills."
---

# Testing strategy

Use readable behavior contracts and repeatable E2E acceptance as the primary quality gate. Add lower-layer tests for named residual risks.

## Preserve the agreed contract

Use the caller's approved testing mode, flow, seams, and verification scope. An approved tests-after flow remains valid. Do not reopen those decisions because a skill loaded. Under zapply, the dispatch supplies this contract; report missing decisions to the driver.

Without an agreed flow, propose contract-first acceptance through the public product boundary. Confirm genuinely unresolved behavior or boundary decisions.

## Classify the work

Observable behavior includes API/CLI responses, business rules, permissions, money, retries, state transitions, persistence, external effects, and user-visible errors.

Mechanical edits, generated code, trivial mappings, and internal refactors may need existing checks rather than new tests. Read existing coverage before adding a test.

| Work | Default depth |
|---|---|
| MVP or greenfield | Main journey and principal rejection through the product boundary |
| Feature in an existing service | Changed acceptance scenarios plus existing regression guarantees |
| Bug fix | Reproduction test that fails without the fix |
| Refactor | Passing characterization coverage before moving behavior |
| Auth, money, permissions, data loss | Existing-service depth even in an MVP |

### MVP

- Test the main behavior, its principal rejection, and relevant auth/money/data-loss rules.
- Exercise the running product through its public boundary: browser, service protocol, or CLI executable.
- Add unit or integration tests only for named risks that acceptance cannot prove reliably or economically.
- Skip getters, DTOs, framework boilerplate, and logic-free mappers.
- Name deferred risks; do not imply untested boundaries are verified.

### Existing service

- Read existing tests and identify guarantees callers already depend on.
- Default to a failing behavior test before a feature or fix. Characterization tests for an unchanged refactor should pass first.
- Preserve existing tests and required checks. This policy changes new test selection, not established guarantees.
- Map touched validation, permissions, transactions, state, retries, compatibility, and migrations to acceptance or named residual-risk checks.
- Follow an already-approved tests-after flow when supplied. Still prove a regression test fails without the fix.
- Run the targeted check and the relevant repository suite. Under zapply, run only the dispatched checks; the caller owns the merge floor.

## Select additional tests

Use [[z-bdd]] for the readable contract, public boundary, repeatable execution, and acceptance evidence.
E2E does not require a browser for API or CLI products. Exercise the product's actual public interface.
Keep required build, lint, type, and security checks alongside acceptance.

Before adding a unit or integration test, name the risk and why E2E cannot prove it reliably or economically.
Then choose the smallest useful interface for that risk. Typical exceptions include:

| Residual risk | Candidate check |
|---|---|
| Many algorithm or pricing edge cases | Domain table or property test |
| Transaction isolation, migrations, or data integrity | Real storage integration test |
| Concurrency, cancellation, or rare fault ordering | Focused deterministic test |
| Provider failure or compatibility unavailable in E2E | Adapter contract or integration test |
| Security boundary not adequately exercised by acceptance | Focused permission or validation test |

Criticality calls for adequate proof, not automatic duplication at every layer. Do not add tests to meet a quota or file count.
Several implementation files may share one tested interface. Preserve existing regression coverage when changing the default for new work.

Without a BDD harness, use readable scenarios mapped to the existing runner. Adding a dependency remains a separate tooling decision.

## Recover within the approved scope

Record recovery limits with the verification plan. Use existing retry, time, and environment-repair limits when the project supplies them.
Continue recoverable investigation and repairs within the approved contract, authority, and recorded limits.
Ask when the contract or authority must change, or when recovery exhausts its recorded limits.
Do not weaken assertions or omit required scenarios to recover. A retry-pass remains flaky and cannot clear acceptance.

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

Report testing mode, approved flow, acceptance boundary, command, effective limits, observed result, and named residual risks.
A timeout means incomplete verification. Required missing, skipped, pending, blocked, or flaky scenarios cannot pass acceptance.
If no new behavior test was warranted, explain why.

see [[z-bdd]], [[z-tdd]], [[z-go-testing]], [[z-go-bdd]], [[z-verify-before-done]]
