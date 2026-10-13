---
name: z-to-prd
description: Synthesizes the grilled idea, design brief, and any returned prototype into a PRD — problem statement, solution, user stories, implementation/testing decisions, out of scope — written to docs/prd/{slug}.md. Use after [[z-grill-with-docs]], plus [[z-design-brief]] or [[z-design-handoff]] on UI ideas, once decisions are resolved, or when the user asks for a PRD. Synthesis only, not a reason to re-interview. Does not decompose the PRD into changes; see [[z-prd-to-openspec]].
---

# To PRD

Synthesize what is already decided — grilled idea, glossary, ADRs, design brief, prototype results — into a PRD at `docs/prd/<slug>.md`. Synthesis, not interview: the decisions exist; this skill writes them down.

## Gather what is on record

- The authoritative glossary and decisions — use existing OpenSpec specs/design when present, otherwise the project's glossary/ADR convention. Do not create a second record.
- `docs/design/<slug>-brief.md` and the handoff doc's Results — screens, actions, prototype deviations ([[z-design-brief]], [[z-design-handoff]]).
- The conversation — decisions resolved during grilling ([[z-grill-with-docs]]).
- The codebase — current state of the modules the feature touches.
- Testing seams — preserve already-approved seams. Otherwise choose the lowest interface that proves the behavior without hiding integration risk, per [[z-testing-strategy]].
- Testing flow — preserve the caller-approved TDD or tests-after choice. Without a prior choice, propose test-first per [[z-testing-strategy]].

Resolve only missing testing decisions; existing approval is sufficient. Present candidate seams and the proposed flow with their trade-offs. Do not reopen a settled choice or re-interview unrelated requirements.

## Write the PRD

`docs/prd/<slug>.md` from [assets/prd.template.md](assets/prd.template.md). Print the PRD in the conversation instead when the user asks — but decomposition reads the file, so offer to write it before [[z-prd-to-openspec]]. Seven sections:

1. **Problem statement** — user-centric; the pain, not the feature.
2. **Solution** — user-centric description of the resolution.
3. **User stories** — extensive numbered list, "As a {actor}, I want {feature}, so that {benefit}".
4. **Implementation decisions** — module and interface changes, schema updates, API contracts, architectural calls, specific interactions. No file paths or code unless a prototype pinned them — then inline only the decision-rich part.
5. **Testing decisions** — the confirmed flow (TDD or tests-after), what good tests look like, which modules and seams, prior art in the repo.
6. **Out of scope** — explicit exclusions.
7. **Further notes** — everything that didn't fit, including flagged gaps.

## Flag gaps

A section the record can't fill is a gap — list it as an open question in Further notes and point the user back to [[z-grill-with-docs]]. Never fill a gap by inventing a decision.

## Closing

Done when the PRD is written and gaps are flagged. Report the path and the open gaps, then stop. Ask whether to decompose into changes ([[z-prd-to-openspec]]) — implementation starts later still, from applied changes, never straight from the PRD.

## Do not

- Re-interview settled decisions; resolve only missing seam and testing-flow choices.
- Publish anywhere; the PRD is a file, and decomposition is [[z-prd-to-openspec]]'s job.
- Include speculative file paths or code no prototype validated.
- Copy the brief wholesale — the PRD records decisions, not screen walkthroughs.
- Start implementing from the PRD — code flows from applied change proposals, not from this document.

## Verify

    fd -e md . docs/prd/    # PRD exists

- All seven sections present; unfillable ones flagged as gaps, not padded.
- Vocabulary and decisions match the authoritative project records.
- User stories cover every primary-path action in the brief.

see [[z-grill-with-docs]], [[z-design-brief]], [[z-testing-strategy]], [[z-tdd]], [[z-prd-to-openspec]]
