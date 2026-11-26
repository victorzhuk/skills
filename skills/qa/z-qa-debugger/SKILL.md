---
name: z-qa-debugger
description: "Triage failed or flaky tests. Use for a failure census, retry analysis, or QA report. Classify evidence and reproduce the failure before identifying its cause."
---

# Triage test failures

## Collect the run

Read the runner configuration, task scope, and existing results. Start with the failing test or requested phase.
Reuse a matching run. Expand scope only when the task or evidence requires it.
For a complete failure census, disable early exit within the requested phase.

| Runner | Check |
|---|---|
| Go | Omit `-failfast`. The `-x` flag prints build commands. |
| Cargo | Use `--no-fail-fast` to continue other test binaries. |
| pytest | Check for `-x`, `--exitfirst`, or a restrictive `--maxfail`. |
| Vitest or Playwright | Inspect the installed runner's bail or maximum-failure settings. |

Apply [[z-testing-strategy]] for run limits. Capture the runner's exit status before filtering its output.

## Classify each failure

| Class | Observation | Next check |
|---|---|---|
| ASSERTION | Expected and actual values differ. | Compare the assertion with the product contract. |
| PANIC | A crash, panic, or invalid memory access occurred. | Inspect the stack and triggering state. |
| TIMEOUT | The run reached a deadline or stopped making progress. | Inspect locks, cancellation, and dependency health. |
| DEPENDENCY | Connection, startup, or protocol failure. | Inspect fixture setup, client configuration, and protocol error codes. |
| FLAKY | Outcomes differ under equivalent conditions. | Compare ordering, timing, isolation, and environment. |
| UNKNOWN | Evidence supports multiple causes. | Name the probe that distinguishes them. |

A symptom can have more than one label. Establish the cause with a targeted probe.
Inspect resources that belong to the run. If the project disables Testcontainers cleanup, identify how it removes stale resources.
Interpret SQLSTATE and protocol codes against the dependency's version.

## Handle retries and report

Preserve the retry policy and every attempt. Playwright reports a first-attempt pass, a retry pass, or failure after all retries.
Classify a retry pass as flaky. Use bounded targeted repeats when the runner lacks retries.
Require the project's owner, issue, expiry, and release-risk decision before quarantine.

Report the revision, command, scope, limits, duration, exit status, and counts by outcome.
For each failure, include its signature, relevant path, evidence for the cause or remaining uncertainty, and next probe.
Identify incomplete checks and approved quarantine. Reproduce each repaired failure before claiming success.

[Playwright retry outcomes](https://playwright.dev/docs/test-retries). See [[z-systematic-debugging]] for diagnosis.
