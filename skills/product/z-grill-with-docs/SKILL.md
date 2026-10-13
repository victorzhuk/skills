---
name: z-grill-with-docs
description: "The [[z-grill-me]] interview with live updates to the project's authoritative glossary and decision records. Use for \"grill with docs\" or recording decisions while grilling. Prefer existing OpenSpec records; use CONTEXT/ADR conventions as fallback. Domain modeling belongs to [[z-domain-modeling]]; PRDs to [[z-to-prd]]."
---

# Grill with docs

The interview is [[z-grill-me]] — sharpen the ask, grill the brief against the code, grill
it against the records, grill the user, close. Run it as written. This skill adds one
thing: the records are updated *during* the interview, not from memory afterwards.

## Write as you go

- Resolve the authoritative record first. Use existing OpenSpec specs/design when present, otherwise the project's glossary/ADR convention. Update it as a term is resolved; do not create a second source of truth. For a CONTEXT.md fallback, use [references/context-format.md](references/context-format.md).
- When a term is vague or overloaded, propose one canonical term and record the rejected
  synonyms as *avoid* entries — that list is what stops the next session relitigating it.
- Surface a conflict with the authoritative glossary when it appears. Preserve settled decisions unless the user changes them.
- Record a consequential trade-off in the existing OpenSpec design or decision record. Use a separate ADR only when that is the project's convention and the decision warrants durable rationale; see [references/adr-format.md](references/adr-format.md).
- Stress-test domain relationships with concrete scenarios that probe edge cases; a term
  that survives no scenario is not resolved.

Term and boundary judgment — what deserves a glossary entry, where a context boundary runs
— is [[z-domain-modeling]]'s territory; this skill supplies the writing discipline and the
file formats.

## Closing

[[z-grill-me]]'s close, plus what was written: terms added, ADRs written, open items. Then
offer the next rung — [[z-design-brief]] if the idea has a UI surface, [[z-to-prd]] once the
decisions are thick enough to write down — and stop. Never start designing or implementing
off the back of the interview.

## Do not

- Batch doc updates for the end of the session.
- Write ADRs for reversible or obvious decisions.
- Let CONTEXT.md accumulate implementation detail — it is a glossary, not a spec or scratch pad.
- Record a decision the user has not actually made.

## Verify

- Every resolved term and consequential decision is in the authoritative project record, without a duplicate glossary or ADR trail.
- Nothing was recorded that the interview did not settle.

see [[z-grill-me]], [[z-domain-modeling]], [[z-design-brief]], [[z-to-prd]]
