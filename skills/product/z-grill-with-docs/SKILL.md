---
name: z-grill-with-docs
description: "The [[z-grill-me]] interview that writes as it runs: a resolved term lands in CONTEXT.md at once, a hard-to-reverse trade-off gets an ADR. Triggers on 'grill with docs', record decisions while grilling. Not bounded contexts ([[z-domain-modeling]]), not the PRD ([[z-to-prd]])."
---

# Grill with docs

The interview is [[z-grill-me]] — sharpen the ask, grill the brief against the code, grill
it against the records, grill the user, close. Run it as written. This skill adds one
thing: the records are updated *during* the interview, not from memory afterwards.

## Write as you go

- Update `CONTEXT.md` the moment a term is resolved — never batch it for the end. File
  format: [references/context-format.md](references/context-format.md). It stays a
  glossary: no implementation detail, no spec text, no scratch notes.
- When a term is vague or overloaded, propose one canonical term and record the rejected
  synonyms as *avoid* entries — that list is what stops the next session relitigating it.
- When a term conflicts with the recorded glossary, call it out in the turn it appears
  ("CONTEXT.md defines *cancellation* as X; you seem to mean Y — which is it?").
- Offer an ADR only when the decision is hard to reverse, surprising without context, and
  the result of a real trade-off — all three, or it is not an ADR. File format:
  [references/adr-format.md](references/adr-format.md).
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

    fd -d 2 CONTEXT.md          # glossary exists if any term was resolved
    fd -e md . docs/adr/        # ADR numbering sequential, no gaps

- Every resolved term is in CONTEXT.md with its avoid-list; every qualifying decision has an ADR.
- Nothing was recorded that the interview did not settle.

see [[z-grill-me]], [[z-domain-modeling]], [[z-design-brief]], [[z-to-prd]]
