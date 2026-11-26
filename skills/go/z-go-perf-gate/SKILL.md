---
name: z-go-perf-gate
description: "Design a Go benchmark gate for CI. Use for release baselines, latency noise, allocation limits, or inconclusive comparisons. See [[z-go-bench-ab]] for the measurement method."
---

# CI performance gate

Define the workload, decision rules, and recovery limits before measuring a release candidate.

## Calibrate the workload

1. Keep representative inputs and expected results with the project. Derive expected results from the behavior contract.
2. Collect repeated paired measurements for each new case. Use a calibration run or pull-request workflow.
3. Record hardware, toolchain, concurrency, timing, and control results.
4. Assign the case a threshold before enabling enforcement. Report unclassified cases explicitly.

## Evaluate measurements

- Measure the runner's noise floor. Compare matched workloads and interleave baseline and candidate runs.
- Evaluate latency, allocations, and bytes separately. An inconclusive latency result must not suppress an allocation regression.
- Use one-sided regression limits with the correct direction for each metric. Reserve two-sided limits for expected equivalence.
- Apply a required improvement to the initial adoption decision. Subsequent releases use the agreed regression limit.
- Limit absolute exceptions to the metric they cover. Record the evidence for each allowance.
- Treat `benchstat` output of `~` as inconclusive for a difference. It does not establish equality.
- Specify when to rerun, the maximum attempts, and how the gate reports unresolved results.
- Keep allocations and bytes as measured averages. Check their variation before requiring exact equality.

## Publish a baseline

Store the accepted release's own output after the gate succeeds.
Distinguish an absent baseline from a failed download. Report a download error before selecting a comparison mode.
If stable releases own the baseline, exclude prereleases. Check the release event and release identity.
For a preflight run, compare the selected remote revision with the intended commit. A branch reference selects remote content.

## Verification

- Exercise an improvement, a regression, noisy latency, and an allocation regression during noisy latency.
- Exercise the unclassified case and the missing-baseline case separately from a retrieval failure.
- Compare the evaluator's verdict against known inputs. A snapshot alone may miss a changed decision branch.
- Download the published baseline and compare its digest with the accepted release artifact.

Use [[z-go-bench-ab]] for local comparisons and [[z-go-ci]] for CI configuration.
