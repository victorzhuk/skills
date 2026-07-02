---
name: z-domain-modeling
description: Build and maintain a domain model — ubiquitous language, bounded contexts, aggregates and invariants, and deep vs shallow modules. Use when naming domain concepts, resolving where a term's meaning changes, deciding aggregate/module boundaries, spotting a shallow pass-through module, or recording a naming/boundary decision in a glossary, an ADR, or an OpenSpec spec. Triggers on "ubiquitous language", "bounded context", "domain model", "aggregate boundary", "glossary", "deep module", "seam". Does not cover Go layer wiring or DI; see [[z-go-clean-arch-di]]. Does not cover per-operation behavioural contracts; see [[z-creating-flow-doc]].
---

# Domain modeling

Name each concept once, the way the business names it, and keep that name identical in conversation, code, tests, and docs. The model is the shared language, not the database schema.

## OpenSpec first

If the project already has an `openspec/` directory, its `specs/<capability>/spec.md` (Requirement/Scenario blocks) and `changes/<name>/design.md` are the living-document mechanism this skill is after — check there before starting a separate glossary or ADR trail. Fold terms and boundary decisions into those files and keep them current; only reach for a standalone glossary/ADR when no `openspec/` exists.

## Ubiquitous language

- One term, one meaning. If the business says "booking", the domain type is `Booking` — not `Reservation`, `Order`, or `Trip`.
- If you keep a glossary — `GLOSSARY.md`, `docs/domain/glossary.md`, or an OpenSpec `specs/*/spec.md` — update it: term → definition, optionally an *avoid* list of near-synonyms that must not be used for this concept.
- When domain and code names diverge, fix the code name — the business vocabulary wins.
- A **Leading Word** is cheap leverage: reuse the exact domain term everywhere so one token carries the whole concept.

## Bounded contexts

- A term's meaning holds inside one context. "Account" in billing ≠ "Account" in auth. Don't force one struct to serve both.
- Draw the boundary where the language changes. Across a boundary, translate explicitly at a **seam** rather than sharing a type.
- Each context owns its model; integration happens through adapters, not shared mutable structs.

## Aggregates and invariants

- An aggregate is the consistency boundary: the set of objects that must stay valid together, mutated through one root.
- State each invariant explicitly ("a Booking's seats never exceed the Trip's capacity") and enforce it inside the aggregate, not in callers.
- Record non-obvious boundary and invariant decisions somewhere durable — a short ADR (`docs/adr/NNNN-*.md`) or a decision-table entry in a living architecture doc both work; use whichever the project already has. Capture the decision, the alternatives, and *why*, so the same question doesn't get re-litigated every quarter.

## Deep vs shallow modules

This is a design lens to apply, not vocabulary teams need to adopt in code or docs — judge a module by **depth** = how much functionality it hides behind how small an interface. Prefer deep modules; treat shallow ones as a smell.

| | Deep (good) | Shallow (smell) |
|--|--|--|
| Interface | small, stable | as wide as the implementation |
| Implementation | substantial, hidden | thin pass-through |
| Example | `Pricer.Quote(cart) (Money, error)` | a struct that only forwards calls / getters+setters |

Fixes for a shallow module: merge it into its caller, or deepen it by moving real behaviour behind the interface. A **seam** (interface at a boundary) earns its keep only when it hides substitutable behaviour — for tests, adapters, or a bounded-context edge — not as ceremony.

## Process

1. Check for an existing `openspec/` directory and use its conventions if present (see above).
2. Extract candidate terms from the conversation / spec.
3. Define each in the glossary or spec doc, optionally noting rejected synonyms to avoid.
4. Reconcile with code — rename types/functions to match.
5. Set aggregate boundaries and write the invariants down.
6. Record boundary and naming decisions somewhere durable — an ADR or a decision-table entry in a living doc.
7. Keep whatever record you chose current as the model moves.

## Go tie-in

- Domain-layer type and method names *are* the ubiquitous language; the domain has zero external deps and no struct tags (see [[z-go-clean-arch-di]]).
- Repositories and transport are seams: they translate external contracts (`sqlc` rows, `ogen` request types) into domain types. Column and field names never leak into domain names — see [[z-go-naming]].
- Document a specific operation's observable behaviour as a flow doc, not here — see [[z-creating-flow-doc]].

## Do not

- Invent a term the business doesn't use, or use two words for one concept.
- Let DB column or API field names become domain type names.
- Model two bounded contexts with one shared struct.
- Ship a shallow module (interface as wide as its implementation) — merge or deepen it.
- Add an interface/seam with no substitutable behaviour behind it.
- Treat the glossary as write-once.

## Verify

    rg -n '<domain-term>' internal/domain/   # term used with the glossary spelling
    fd -t d openspec                         # OpenSpec present? specs/*/spec.md is the glossary/ADR trail
    fd glossary docs/ && fd -e md . docs/adr/ # otherwise: standalone glossary + ADRs exist and are current

- Every glossary term (or OpenSpec spec term) appears in the domain code with the same name.
- Each aggregate boundary / non-obvious invariant has a record — an ADR, a decision-table entry, or an OpenSpec `design.md`.
- No domain type is named after a DB column or API field.

see [[z-go-clean-arch-di]], [[z-go-naming]], [[z-creating-flow-doc]]
