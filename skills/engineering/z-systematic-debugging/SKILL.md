---
name: z-systematic-debugging
description: "Investigate an unexpected result or regression. Reproduce the symptom, test competing explanations, and verify the fix. Use [[z-qa-debugger]] for test-suite triage."
---

# Systematic debugging

Gather evidence before fixing. Preserve the caller's scope, authorization, and verification contract.

## Establish the feedback loop

Start with the exact symptom, expected result, and recent changes. Prefer a failing test, CLI fixture, HTTP probe, browser flow, trace replay, or differential comparison.

Make the probe narrow and repeatable. Control time, randomness, dependencies, and input where practical. For intermittent failures, record attempts and failure rate rather than promising determinism.

If local reproduction is unavailable, use a bounded observational loop over existing logs, traces, or incident artifacts. State which explanations it can distinguish and what remains uncertain. Request only access or evidence that blocks a useful next probe.

## Investigate

1. Run the probe. Compare its observed failure with the reported symptom.
2. Minimize inputs and setup while preserving that symptom.
3. Rank plausible explanations using the evidence. Consider alternatives only when the cause remains uncertain.
4. State a distinguishing prediction for each hypothesis. Prefer a debugger or narrowly scoped instrumentation.
5. Change one variable per experiment and record the outcome. Correlation alone does not establish cause.

Performance regressions need a baseline and representative workload before instrumentation or tuning. Compare working and failing versions when available.

## Fix within the contract

Default to a regression test before the fix, at the agreed seam. Preserve an approved tests-after flow. Under zapply, sealed tests change only through the caller's test-amendment channel.

Apply the smallest fix at the demonstrated cause. Repeat the original scenario as well as the minimized example.

When two fixes depend on one assumption and both fail the same test, test that assumption first. For state defects, identify every writer, its ownership, and the shared invariant.

After three unsuccessful fixes, reassess the evidence. Investigate architectural assumptions alongside other plausible causes.

Escalate a required scope or contract change to its owner. Loading a diagnostic reference does not create a new approval gate or convert authorized implementation into read-only work.

## Close

- Repeat the original scenario and required regression tests.
- Remove temporary instrumentation. Retain the requested evidence artifacts.
- Report the cause, change, proof, and remaining uncertainty.
- When the caller authorizes a commit, describe the demonstrated cause in the message.
- Make architectural recommendations only when the evidence warrants them.

## Deeper investigation

Use [the diagnosis protocol](references/deep-analysis-protocol.md) when the first loop stalls. Load only the needed technique:

- [Debugging mindset and bias](references/debugging-mindset.md).
- [Investigation techniques](references/investigation-techniques.md).
- [Hypothesis testing](references/hypothesis-testing.md).
- [Verification patterns](references/verification-patterns.md).
- [Research strategy](references/when-to-research.md).

## Do not

- Treat an untested explanation as the cause.
- Apply several speculative fixes together.
- Widen instrumentation beyond dispatched paths.
- Run unbounded stress loops or copy production data into development without an authorized data-handling plan.
- Close terminals, reset work, or change task lifecycle merely because a reference suggests it.
- Claim fixed without evidence for the original symptom.

## Verify

Report the probe, original failure or incident evidence, demonstrated cause, and regression result. Name missing evidence. Use [[z-testing-strategy]] for limits.

see [[z-go-troubleshooting]], [[z-tdd]], [[z-verify-before-done]]
