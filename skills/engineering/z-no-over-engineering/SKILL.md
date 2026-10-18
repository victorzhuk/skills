---
name: z-no-over-engineering
description: YAGNI and reuse-first implementation for coding tasks, dependency choices, and PR scope review. Use for "ponytail", "simplest solution", "interface for testing", "just in case", "future flexibility", or "extensible". Prefer existing code, standard libraries, platform features, and installed dependencies. Established architecture belongs to [[z-go-clean-arch-di]] and [[z-go-interfaces]].
---

# No over-engineering

Build the smallest thing that solves the problem in front of you. Add the next layer of abstraction when a second concrete case demands it, not before.

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
Do not delete established architecture to shrink the diff. The shortest working diff wins only once you know everything it must touch.

## Core rules

- Order of work: make it work → make it right → make it fast. Don't skip ahead to "make it extensible."
- One concrete implementation doesn't need an interface. Extract the interface when a second real implementation (or a test double you actually need) shows up.
- A domain struct that already carries the right fields doesn't need a DTO wrapping it "for the API layer" — add the DTO when the API shape actually diverges from the domain shape.
- Split a package for a current ownership, invariant, dependency, or caller need. Caller count alone does not establish whether the boundary is useful.
- Don't add a config knob, feature flag, or plugin point for a variation nobody has asked for yet.
- "We might need this later" is not a requirement. A requirement is a ticket, a caller, or a failing test.

## Do not

- Add an interface whose only implementation is the concrete type, justified by "makes it testable" — the concrete type is already testable.
- Introduce a repository/service/factory layer around a single struct with three fields.
- Generalize a function to take a callback or strategy object for a single call site.
- Add a "for future flexibility" parameter that nothing currently sets.
- Justify complexity with "clean architecture" or "SOLID" without a concrete second case driving it.

## Safety boundaries

The ladder never shortens these:

- Validation at trust boundaries, error handling that prevents data loss, security, and accessibility.
- The callers, fixtures, and tests the change touches.

Test selection and verification depth belong to [[z-testing-strategy]] and [[z-verify-before-done]].
Delegation, approval, and completion authority stay with the caller.

## Verify

Ask what current behavior, substitution, ownership, or established architectural contract the abstraction serves. Remove it when the only reason is hypothetical future flexibility; do not erase a valid boundary merely because it has one caller.

Reuse guidance adapted from [Ponytail](https://github.com/DietrichGebert/ponytail/blob/742e0abae1501e12d1254a81d05f16bba10d08c1/skills/ponytail/SKILL.md). See [MIT notice](LICENSE.ponytail).
