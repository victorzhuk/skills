---
name: z-qa-debugger
description: "Test execution without fail-fast, failure classification, flaky detection, and QA report authoring. Auto-activates for: test failure triage, flaky tests, QA report, race conditions, test run analysis, QA_REPORT.md, root cause."
---

# Test failure triage

Classify failures from evidence before changing code. Reuse current run output when it already covers the requested scope.

## Run the intended scope

Discover the repository runner, configuration, dependencies, and caller's verification contract. Start with the failing scope. Widen only when a complete failure census is requested or the evidence requires it.

Within a census, disable early exit where supported:

| Runner | Relevant behavior |
|---|---|
| Go | Omit `-failfast`; `-x` prints build commands and is unrelated |
| Cargo | Use `--no-fail-fast` to continue other test binaries |
| pytest | Omit `-x`, `--exitfirst`, and restrictive `--maxfail` |
| Vitest / Playwright | Inspect bail/max-failure settings in the installed version |

A QA orchestrator may stop between phases after failure while collecting every failure within the attempted phase. Do not expand a dispatched targeted command into a full suite.

Use [[z-testing-strategy]] for process deadlines, test timeouts, and worker caps. Capture the runner's exit status as well as output; a pipe to a filter or `tee` must not replace it.

## Classify the evidence

| Class | Evidence | Investigation |
|---|---|---|
| ASSERTION | Expected/actual mismatch | Read assertion and implementation contract |
| PANIC | Panic, crash, invalid memory access | Trace the stack and triggering state |
| TIMEOUT | Deadline or hang | Check progress, locks, cancellation, and dependency health |
| DEPENDENCY | Connection/startup/protocol failure | Inspect actual dependency setup and client configuration |
| FLAKY | Different outcomes with unchanged code and controlled inputs | Compare timing, ordering, isolation, and environment |
| UNKNOWN | Evidence cannot yet distinguish causes | State the next discriminating probe |

A symptom class is not a root cause. A dependency failure can originate in application code. Add secondary labels when a flaky test times out or panics.

## Inspect the actual dependency mechanism

Read test setup before choosing Docker, testcontainers, compose, or Kubernetes commands. Inspect only resources belonging to this run.

Ryuk normally cleans testcontainers resources. If disabled, identify the replacement cleanup mechanism and stale-resource risk. Do not disable it as a generic CI workaround.

Capture specific SQLSTATE or protocol codes from the failure. Interpret them with the dependency's versioned documentation.

## Flaky handling

Playwright distinguishes:

- **passed**: passed on the first attempt;
- **flaky**: failed initially, then passed on retry;
- **failed**: failed initially and on every retry.

Retries expose instability; they do not repair it. Preserve existing retry policy and report retry-pass outcomes separately. Without built-in retries, run a bounded set of targeted repeats and record every result.

Do not quarantine automatically. Follow the repository's owner, issue, expiry, and release-risk policy before skipping a test. No observed failure in a short repeat run does not establish stability.

## Report

Use the project's existing QA report convention or report inline. Include:

- command, scope, revision, effective limits, duration, and exit status;
- passed, failed, skipped, flaky, and incomplete counts when available;
- failure signature, relevant code path, confirmed cause or uncertainty;
- next probe or smallest recommended repair;
- unavailable checks and any approved quarantine.

Do not invent a root cause or source line to fill a template. Unexpected crashes remain unresolved failures until explained or fixed.

## Verify

Every reported outcome is supported by captured runner evidence. A targeted reproduction checks each repaired failure. Adjacent checks follow the caller's floor.

[Playwright retry outcomes](https://playwright.dev/docs/test-retries).
See [[z-systematic-debugging]], [[z-qa-analyst]], [[z-qa-orchestrator]].
