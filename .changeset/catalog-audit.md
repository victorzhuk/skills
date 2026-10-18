---
"victorzhuk-skills": minor
---

Add `z-web-performance` for page-rendering performance - Core Web Vitals thresholds, the
field/lab/RUM evidence split, and regression attribution by deploy boundary.

Correct acceptance and data defects the audit found: the godog harness template now sets
`Strict` so undefined and pending scenarios fail CI, `argMax` is documented with the
invariants that make it equivalent to `FINAL`, the env mirror uses the library's field
params instead of a `grep`/`comm` pair, the RabbitMQ consumer owns its cancellation, and
the image build passes `VERSION`, `GIT_COMMIT`, and `BUILD_DATE`.

Resolve contradictory cross-skill rules for lean fixes, verification, TDD, lint repair,
and troubleshooting, and correct the Rust, Flutter, and frontend guidance.

Harden the shipped tooling: the Git guard blocks backslash-escaped commands, the baseline
matcher escapes regex metacharacters, the sanitization check catches prefixed paths, and
every workflow action is pinned to a commit SHA.
