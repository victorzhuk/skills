---
name: z-no-over-engineering
description: YAGNI for new types, abstractions, and PR scope review. Use for "interface for testing", "just in case", "future flexibility", or "extensible". Reject speculative interfaces, DTOs, splits, and configuration layers. Established architecture belongs to [[z-go-clean-arch-di]] and [[z-go-interfaces]].
---

# No over-engineering

Build the smallest thing that solves the problem in front of you. Add the next layer of abstraction when a second concrete case demands it, not before.

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

## Verify

Ask what current behavior, substitution, ownership, or established architectural contract the abstraction serves. Remove it when the only reason is hypothetical future flexibility; do not erase a valid boundary merely because it has one caller.
