---
name: z-verify-before-done
description: Evidence before completion claims — run the verification command fresh, read its full output, then state the result together with the evidence; "should work" is not a status. Use before claiming anything is done, fixed, or passing, before committing or opening a PR, and before trusting a subagent's success report. Triggers on "done", "fixed", "should work now", "tests pass" stated without output, "looks correct". Does not define what to verify or how deep; see [[z-testing-strategy]]. Bug-fix claims also need the original repro re-run; see [[z-systematic-debugging]].
---

# Verify before done

No completion claims without fresh verification evidence. A claim made from memory, confidence, or a previous run is a guess wearing a status report.

## The gate

Before claiming any status:

1. **Identify** the command that proves the claim.
2. **Run** it — fresh, complete, not a cached or partial variant.
3. **Read** the full output: exit code, failure counts, warnings.
4. **Compare** output to claim. Output contradicts it → state the actual status with the evidence. Output confirms it → state the claim *with* the evidence.

Skipping a step isn't efficiency; it's reporting fiction.

## What each claim requires

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | test command output, 0 failures | previous run, "should pass" |
| Lint clean | linter output, 0 errors | partial check |
| Build succeeds | build exit 0 | linter passing |
| Bug fixed | original symptom re-tested | code changed, assumed fixed |
| Regression test works | red-green verified (fails without fix, passes with) | test passed once |
| Subagent finished | diff inspected, changes verified | agent's own "success" report |
| Requirements met | line-by-line checklist against the plan | tests passing |

## Red flags

Stop and run the verification when you catch yourself:

- writing "should", "probably", "seems to";
- expressing satisfaction before the command ran ("Great!", "Done!");
- about to commit, push, or open a PR without a fresh run;
- trusting a subagent's success report without checking the diff;
- rationalizing — "just this once", "I'm confident", "the linter passed so the build is fine", "partial check is enough".

Every rationalization has the same answer: run the command.

## Do not

- Claim success in any wording — direct, paraphrased, or implied — without fresh evidence in the same turn.
- Substitute a weaker check for the real one (lint for build, one test for the suite, compile for behavior).
- Report a subagent's claim as verified fact.
- Let tiredness or a long session lower the bar.

## Verify

- Every status claim in the final report sits next to the command that proves it and its observed result.
- The verification ran *after* the last code change, not before it.

see [[z-testing-strategy]], [[z-systematic-debugging]], [[z-tdd]]
