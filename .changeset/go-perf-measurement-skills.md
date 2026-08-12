---
"victorzhuk-skills": minor
---

Three new Go performance skills distilled from an embedded-interpreter perf program: `z-go-bench-ab` (A/B microbenchmark validity — interleaving inside the parent, arm symmetry, control cells, contention-profile attribution), `z-go-perf-gate` (CI benchmark non-regression gate — tiered thresholds, paired runs, burden-of-proof reruns, baseline lifecycle), and `z-go-interp-perf` (interpreter/VM optimization playbook — poll batching, preboxing, site caches, fusion, startup templates, striped caches, lean call boundary). `z-go-performance` gains a "Verify the premise first" section (escape analysis, boxing facts, struct layout, exact-rate profiling) and cross-links the measurement skills.
