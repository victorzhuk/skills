---
name: z-testing-strategy
description: "Select acceptance and regression tests from the change's risks. Use for E2E scope, lower-level tests, runner limits, and evidence. Use [[z-bdd]] for readable scenarios."
---

# Select tests for a change

## Preserve the agreed scope

Read requirements, existing tests, and the caller's verification contract. Preserve agreed interfaces, test order, and required evidence.
When the test flow is open, propose contract-first acceptance through the product's public interface.
Use [[z-bdd]] for readable scenarios. An existing runner can execute them without a new framework.

## Choose the depth

| Change | Proof |
|---|---|
| MVP or new product | Exercise the main journey and principal rejection through the public boundary. Record deferred risks. |
| Existing service | Cover changed behavior and preserve established regression guarantees. Include relevant compatibility, state, retry, and migration cases. |
| Bug fix | Reproduce the original failure. Repeat the same input through the same interface after the fix. |
| Internal refactor | Establish passing characterization coverage before changing structure. |
| Money, permissions, or possible data loss | Apply existing-service depth, including in an MVP. |
| Mechanical or generated edit | Identify which existing tests or tools cover the change before adding tests. |

For a UI, exercise the browser. For a service, use its running protocol. For a CLI, use the executable.
Preserve required build, lint, type, race, and security gates. Use the project's targeted and merge gates within the caller's scope.

## Select additional tests

Add a lower-level test when you can name a residual risk that E2E cannot prove reliably or economically.

| Residual risk | Candidate test |
|---|---|
| Numerous pricing or algorithm edge cases | Table or property test with independent expected results |
| Isolation, migrations, or persistent integrity | Integration test against the actual store |
| Cancellation or rare ordering | Deterministic concurrency test |
| Provider failure unavailable through E2E | Adapter contract test |
| Security boundary outside the exercised journey | Focused permission or validation test |

Use the smallest interface that exposes the risk. Preserve existing tests. File counts and coverage percentages cannot establish missing behavior.

## Bound execution

Inspect project wrappers first. Bound the entire process, including setup, build, execution, and shutdown.
Use a per-test or per-binary timeout where supported. Cap worker and build concurrency separately.

| Runner | Timeout or duration | Concurrency |
|---|---|---|
| Go | `-timeout` per binary, plus `-fuzztime` for fuzzing | `-p` for packages and builds, `-parallel` for parallel tests and fuzz workers |
| Cargo | Use an outer process deadline | `--jobs` for builds, `-- --test-threads` for standard tests |
| Vitest | Installed version's test and hook timeouts | `maxWorkers` |
| Playwright | Test and hook timeouts, plus suite `globalTimeout` | `workers` |
| pytest | `--timeout` requires pytest-timeout | Cap xdist workers when enabled. Ordinary pytest runs serially. |

Use temporary bounds for an ordinary invocation when wrappers lack them. Record the effective values.
For an exact dispatched command, apply the caller's prescribed lifecycle. Report missing required limits without silently rewriting the command.

## Recover and report

Set recovery limits before running tests. Investigate failures and apply fixes within the agreed scope.
Escalate an exhausted limit or a necessary change in scope, authority, or contract.
Preserve assertions and record every retry. A retry pass remains flaky.
Report the selected depth, test flow, boundary, command, limits, result, and residual risks. If existing tests suffice, state which risks they cover.
A required failure, skip, pending step, missing result, flake, or timeout prevents acceptance.

See [[z-tdd]], [[z-go-testing]], [[z-go-bdd]], and [[z-verify-before-done]].
