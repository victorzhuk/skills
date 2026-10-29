---
name: z-no-over-engineering
description: YAGNI and reuse-first implementation for coding tasks, dependency choices, and PR scope review. Use for "ponytail", "simplest solution", "interface for testing", "just in case", "future flexibility", or "extensible". Prefer existing code, standard libraries, platform features, and installed dependencies. Established architecture belongs to [[z-go-clean-arch-di]] and [[z-go-interfaces]].
---

# No over-engineering

Build the smallest complete, readable solution to the current problem.

## Reuse ladder

Take the first rung that solves the whole requested task:

1. Establish the complete requested outcome and every affected caller before choosing an implementation.
2. Omit features, options, and flexibility nobody requested. Omit nothing the request requires.
3. Reuse code that already exists in this repository, the way the surrounding code uses it.
4. Use the standard library or a native platform feature when no house abstraction already owns the behavior.
5. Use an installed dependency when it fits the task.
6. Otherwise write the smallest readable implementation that works.

Work the ladder after you understand the change, never instead of understanding it.
A one-liner a reader must decode is not the smallest change.
Do not add a dependency for a few straightforward lines.
Do not delete established architecture to shrink the diff. Correctness, readability, and complete scope take precedence over line count.

## Core rules

- Add an abstraction for a current ownership, invariant, dependency, representation, lifecycle, or substitution need.
- A real boundary can justify an interface or DTO on first use. Caller and implementation counts alone decide nothing.
- Keep each decision or invariant in one authoritative owner. Share behavior that must change together, not merely similar text.
- Fix a shared defect at its owning boundary, then update every affected caller and contract.
- Do not add a config knob, feature flag, or plugin point for a variation nobody needs yet.
- "We might need this later" is not a requirement. Identify the current caller, contract, or observed failure.

## Do not

- Add a test seam without identifying the behavior that requires substitution.
- Introduce repository, service, or factory layers that add no current policy, boundary, or lifecycle behavior.
- Generalize a function with a callback or strategy for hypothetical callers.
- Add a "for future flexibility" parameter that nothing currently sets.
- Justify complexity with pattern names or "SOLID" alone.

## Safety boundaries

The ladder never shortens these:

- Validation at trust boundaries, error handling that prevents data loss, security, and accessibility.
- The callers, fixtures, and tests the change touches.

Test selection and verification depth belong to [[z-testing-strategy]] and [[z-verify-before-done]].
Delegation, approval, and completion authority stay with the caller.

## Verify

Check each addition against a current requirement. Remove introduced unused helpers, options, files, dependencies, and scaffolding. Preserve necessary boundaries and the complete requested behavior.

Reuse guidance adapted from [Ponytail](https://github.com/DietrichGebert/ponytail/blob/742e0abae1501e12d1254a81d05f16bba10d08c1/skills/ponytail/SKILL.md). See [MIT notice](LICENSE.ponytail).
