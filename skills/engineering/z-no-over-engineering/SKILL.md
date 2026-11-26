---
name: z-no-over-engineering
description: "Apply YAGNI when choosing dependencies, interfaces, configuration, or PR scope. Use for the simplest complete solution, speculative flexibility, or ponytail requests. Preserve required contracts."
---

# No over-engineering

Build the smallest complete, readable solution to the current problem.

## Reuse ladder

Take the first rung that solves the whole requested task:

1. Establish the complete requested outcome and every affected caller before choosing an implementation.
2. Include each required path. Omit unused extension points.
3. Reuse code that already exists in this repository, the way the surrounding code uses it.
4. Use the standard library or a native platform feature when no house abstraction already owns the behavior.
5. Use an installed dependency when it fits the task.
6. Otherwise write the smallest readable implementation that works.

Compare alternatives against the complete behavior. Preserve established boundaries when they carry a current responsibility.
Add a dependency only when its present benefit warrants its maintenance cost.

## Core rules

- Add an abstraction for a current ownership, invariant, dependency, representation, lifecycle, or substitution need.
- A real boundary can justify an interface or DTO on first use. Caller and implementation counts alone decide nothing.
- Keep each decision or invariant in one authoritative owner. Share behavior that must change together, not merely similar text.
- Fix a shared defect at its owning boundary, then update every affected caller and contract.
- Identify the caller, contract, or observed failure before introducing a flag, option, or plugin point.

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

Match each addition to a present requirement. Remove unused helpers, options, files, or dependencies introduced by the change. Preserve established boundaries and the full requested behavior.

Reuse guidance adapted from [Ponytail](https://github.com/DietrichGebert/ponytail/blob/742e0abae1501e12d1254a81d05f16bba10d08c1/skills/ponytail/SKILL.md). See [MIT notice](LICENSE.ponytail).
