---
name: z-systematic-debugging
description: Root-cause-first debugging loop — no fixes before a feedback loop exists and the cause is understood. Build a tight red-capable repro, minimize it, rank falsifiable hypotheses, instrument one variable at a time, fix at the source. Use for any bug, test failure, or unexpected behavior. Triggers on "debug this", "diagnose", "why is this failing". Go tooling (pprof, dlv, race detector) — [[z-go-troubleshooting]].
---

# Systematic debugging

Gather evidence before fixing. Preserve the caller's scope, authorization, and verification contract.

## Establish the feedback loop

Start with the exact symptom, expected result, and recent changes. Prefer a failing test, CLI fixture, HTTP probe, browser flow, trace replay, or differential comparison.

Make the probe narrow and repeatable. Control time, randomness, dependencies, and input where practical. For intermittent failures, record attempts and failure rate rather than promising determinism.

If local reproduction is unavailable, use a bounded observational loop over existing logs, traces, or incident artifacts. State which explanations it can distinguish and what remains uncertain. Request only access or evidence that blocks a useful next probe.

## Investigate

1. Run the probe and read its complete result. Confirm it exercises the reported symptom.
2. Minimize inputs and setup while preserving that symptom.
3. Rank plausible explanations from the evidence. Consider alternatives when uncertain; do not invent hypotheses for a proven typo.
4. State a distinguishing prediction for each hypothesis. Prefer a debugger or narrowly scoped instrumentation.
5. Change one variable per experiment and record the outcome. Correlation alone does not establish cause.

Performance regressions need a baseline and representative workload before instrumentation or tuning. Compare working and failing versions when available.

## Fix within the contract

Default to a regression test before the fix, at the agreed seam. Preserve an approved tests-after flow. Under zapply, sealed tests change only through the caller's test-amendment channel.

Apply the smallest fix at the confirmed cause. Re-run the original scenario, not only the minimized example.

When two fixes share a premise and fail the same check, state that premise and test it before another patch. For state failures, identify every writer, the state each owns, and the invariant their updates must preserve. Check for competing owners or update paths with different assumptions.

If three fixes fail, reassess the evidence; architecture is one possible cause, not a conclusion.

Escalate a required scope or contract change to its owner. Loading a diagnostic reference does not create a new approval gate or convert authorized implementation into read-only work.

## Close

- Verify the original symptom and caller-scoped regression checks.
- Remove temporary instrumentation; retain only requested evidence artifacts.
- Report the cause, change, proof, and remaining uncertainty.
- If a commit was authorized, describe the confirmed cause in its message.
- Make architectural recommendations only when the evidence warrants them.

## Deeper investigation

Use [the diagnosis protocol](references/deep-analysis-protocol.md) when the first loop stalls. Load only the needed technique:

- [Mindset and bias checks](references/debugging-mindset.md).
- [Investigation techniques](references/investigation-techniques.md).
- [Hypothesis testing](references/hypothesis-testing.md).
- [Verification patterns](references/verification-patterns.md).
- [Research strategy](references/when-to-research.md).

## Do not

- Treat a provisional explanation as a confirmed cause.
- Apply several speculative fixes together.
- Widen instrumentation beyond dispatched paths.
- Run unbounded stress loops or copy production data into development without an authorized data-handling plan.
- Close terminals, reset work, or change task lifecycle merely because a reference suggests it.
- Claim fixed without evidence for the original symptom.

## Verify

Report the probe, observed failure or incident evidence, confirming result, and relevant regression command. Distinguish unavailable validation from passing checks. Use [[z-testing-strategy]] for limits.

see [[z-go-troubleshooting]], [[z-tdd]], [[z-verify-before-done]]
