---
name: z-to-prd
description: "Write a product requirements document from agreed decisions, a design brief, and available prototype results. Use [[z-prd-to-openspec]] for decomposition."
---

# Write a product requirements document

## Gather the decisions

Read the approved conversation, project glossary, decisions, and affected code. Record unresolved domain questions in Further notes.
For a UI feature, read its [[z-design-brief]] and any prototype results from [[z-design-handoff]].
Keep agreed test boundaries and the approved test sequence. Resolve missing test decisions with [[z-testing-strategy]].

## Write the PRD

Use [the PRD template](assets/prd.template.md) at `docs/prd/<slug>.md`, or return the document in chat when requested.

| Section | Content |
|---|---|
| Problem statement | Who experiences the problem and what they cannot do. |
| Solution | The user-visible change. |
| User stories | Numbered stories with actor, action, and benefit. |
| Implementation decisions | Agreed modules, interfaces, schema changes, and API contracts. Include prototype details only when they establish a decision. |
| Testing decisions | Agreed test sequence, boundaries, expected behavior, and applicable existing tests. |
| Out of scope | Explicit exclusions. |
| Further notes | Open questions and observations that affect the decision. |

## Verify

Trace each primary action to a user story. Compare terminology and decisions with authoritative records.
Leave unsupported decisions open. Report the output location and unresolved gaps.
Use [[z-prd-to-openspec]] when the user asks to decompose the PRD.
