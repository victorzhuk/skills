---
name: z-grill-with-docs
description: "Use [[z-grill-me]] while updating the project's glossary and decision records. Use when the user wants decisions recorded during an interview. See [[z-domain-modeling]] for terms and boundaries."
---

# Record decisions during an interview

Follow the interview in [[z-grill-me]]. Update the authoritative record as each decision becomes final.

## Write the decision

1. Locate the existing glossary, OpenSpec requirement, design record, or ADR convention.
2. For an ambiguous term, agree on its meaning and record rejected synonyms. Check an edge case with [[z-domain-modeling]].
3. If new input contradicts a settled term, identify the conflict before changing the entry.
4. Record a consequential trade-off with its rationale. Create a separate ADR only when the project convention warrants one.
5. Keep implementation details out of the glossary. For fallback formats, use the [glossary](references/context-format.md) or [ADR](references/adr-format.md) example.

## Close

List the terms and decisions recorded, their locations, and the unresolved items.
Check that each entry reflects an actual agreement. Keep one authoritative copy of each decision.
Use [[z-design-brief]] or [[z-to-prd]] for a requested follow-up.
