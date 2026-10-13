# Investigation techniques

Choose the smallest technique that separates the remaining causes.

| Situation | Technique | Constraint |
|---|---|---|
| Long request path | Probe at an intermediate boundary, then narrow | Compare equivalent requests |
| Complex setup | Remove one input or dependency at a time | Preserve the original symptom |
| Known working version | Differential comparison | Control data and environment |
| Unknown breaking commit | Git bisect in an isolated checkout | Preserve user work; restore the bisect state afterward |
| Intermittent state issue | Trace ordering and ownership | Record attempts and timing |
| Performance regression | Representative baseline and profiler | Keep workload and measurement conditions comparable |

Prefer debugger inspection or temporary structured instrumentation at hypothesis boundaries. Do not log credentials, sensitive payloads, or unrelated traffic. Remove temporary probes after verification.

Commenting out code can change several invariants at once. Use a throwaway reproduction when reducing a function, and verify that each removal preserves the same failure.

Do not assume a vanished error proves success: a removed code path may simply stop exercising the behavior. Assert the requested result.
