---
name: z-go-perf-gate
description: CI benchmark non-regression gate — repo-owned gold-set corpus, tiered thresholds, paired interleaved hosted runs, burden-of-proof reruns, stored baselines; latency is decidable only on the quiet fixed runner.
---

# CI performance gate

Gate releases on a repo-owned benchmark corpus compared in one paired run, with thresholds designed so a faster release can never fail. Every rule below was paid for by a live gate defect.

## Corpus

- Own the gold set in-repo, modeled on the consumer's real workload shapes (dispatch, closures, error paths, lookups, folds, load). Self-contained: no consumer checkout, no cross-repo secret, no revision pin. Expected results are hand-derived from the contract, never captured from the engine under test.
- Every timed cell carries a committed tier/threshold classification; the gate fails untiered cells. Adding a cell is therefore a forced two-run sequence: land the benchmark untiered → dispatch a run that **must fail** (upload artifacts with `if: always()` — that failing run's output *is* the classification profile) → commit tier + profile + any pinned digests together → second run shows the cell judged green.

## The two axes behave differently

- **Bytes and allocation counts are exact per-op counts**, deterministic per tree *and toolchain* — locally authoritative. A locally predicted +1 B/op reproduced exactly on CI under a different Go version (different absolute values, identical delta). A sub-point margin does not survive a toolchain move.
- **Latency is a sampled statistic.** A developer box's noise floor exceeds a 5% tolerance and emits false FAILs that never reproduce on the same cell twice; an A/A run exiting "inconclusive" does not exonerate it. Decide latency only on the quiet fixed-concurrency hosted runner (fixed GOMAXPROCS, fixed benchtime, n≥10, benchstat).
- Record local latency verdicts as **deferred to the release runner** — not passed, not failed. A local near-miss on the latency axis is landable on that basis when bytes/allocs are clean; write the policy into the change before measuring.
- Hosted runner CPU differs run to run (different processor families on consecutive runs). License a tier or threshold from **one** profile; never from agreement between runs.

## Thresholds

- Improvement thresholds (e.g. ≥15% latency, ≥20% bytes) apply **once**, at first authorization. Afterwards compare the candidate against the previous release's stored baseline as non-regression — a standing improvement gate punishes making the comparison path faster.
- Non-regression bounds are one-sided. A two-sided ±5% band fails a release for beating the baseline too hard. Keep two-sided only where both runs measure the same cost by construction (mode-invariant cells) or the metric is throughput with the sign convention stated.
- Mind the dead zone: with an improvement tier at ≥15% and a tolerance tier at ±5%, a cell whose delta lands between 5% and 15% has no honest tier. Estimate a candidate cell's delta before committing to add it.
- Absolute-overhead escapes (e.g. ≤1 ms / ≤256 KiB for startup cells, so sub-millisecond one-time work can't fail on percentage) excuse the **latency percentage only** — never the allocation bounds, or the cell passes unconditionally.
- For a proven fixed per-call cost, a per-cell **absolute** byte allowance beats a percentage: size it under the smallest allocator size class (8 B) so it cannot conceal even one added allocation, and record the evidence next to the entry.

## Verdict-logic traps

- Evaluate exact-count axes (bytes, allocs) **before** any latency-significance gate. If "latency not significant → INCONCLUSIVE → PASS" short-circuits the bytes check, a deterministic bytes regression is judged only on runs where latency happens to reach significance — a coin flip per run that will fail a release at random later.
- benchstat prints a non-significant delta as `~`; a parser that maps it to 0 makes real-but-non-significant regressions invisible to non-increasing bounds. Document the blind spot even if you don't close it.
- Burden of proof for inconclusive cells: one rerun at doubled benchtime, re-judge everything from the rerun; still inconclusive → improvement claims FAIL, non-regression claims PASS. Check the trigger condition: a rerun gated on "exit code == inconclusive" never fires when some other cell failed outright, and the failing run's files then carry the *original* benchtime — check the step log before trusting a profile's stated benchtime.
- A pinned-profile snapshot test cannot discriminate a gate-logic fix — fixed and unfixed evaluators often produce byte-identical verdicts over an old profile. Gate logic needs direct unit tests on the evaluator functions; verify a fix by running the gate binary against the committed profile and diffing the verdict text.

## Baseline lifecycle

- The passing release run's own artifact becomes the stored baseline. Never hand-upload an artifact from a run the gate rejected — it pins every future release to numbers the gate refused.
- Store-on-success semantics mean a failed verdict stores nothing; the fix is fix-then-cut-the-next-release, not backfilling.
- Distinguish "no baseline exists" from "fetching the baseline errored". Treating a transient API failure as absence silently flips the gate into first-authorization mode and fails a healthy release under the wrong thresholds.
- Trigger on the release event that fires once per real release (`released`, not `published` — pre-releases fire `published`, and the first stored baseline is a one-shot slot an rc would consume).
- Pre-flight before cutting: push, confirm `git ls-remote origin` matches the local sha, run the workflow via `workflow_dispatch` at that exact tree, and only then tag. `gh workflow run --ref <branch>` resolves against the **remote** ref — an unpushed tree gets silently measured at the stale remote sha. The pre-flight buys the verdict only; steps interpolating release identity still run for real the first time.

## Do not

- Gate latency on a developer workstation, or "fix" code a phantom local FAIL accused.
- Compare hosted figures across runs.
- Hand-upload a baseline.
- Close or archive a gate-activation change whose measurement tasks never actually ran.

## Verify

- New cell: two hosted runs (fail-to-measure, then green) with tier + profile committed between them.
- Gate-logic change: unit tests on the evaluator + a verdict diff against the committed profile — a green pinned-profile snapshot proves nothing.
- Release cut: pre-flight dispatch PASS at the pushed sha, then tag; confirm the baseline asset downloads back byte-identical after the cut.

Local measurement method is [[z-go-bench-ab]]; workflow wiring [[z-go-ci]].
