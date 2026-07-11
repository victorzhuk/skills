---
name: z-prd-to-openspec
description: Decomposes a PRD into OpenSpec change proposals using vertical slices — each cuts through every layer end-to-end and is independently verifiable — then writes proposal.md, design.md, tasks.md, and spec deltas per slice. Use after [[z-to-prd]] produces docs/prd/{slug}.md. Triggers on "open spec this", "break this into changes", "vertical slices". Does not implement tasks. Test depth per slice belongs to [[z-testing-strategy]].
---

# PRD to OpenSpec

Decompose a PRD into OpenSpec change proposals, one per vertical slice. Each slice is a tracer bullet: a thin path through every layer, independently verifiable when done.

## Confirm the OpenSpec surface

- `openspec/` must exist; if not, the user initializes it (`openspec init`).
- Discover the installed CLI's verbs via `openspec --help` or the project's task runner before writing — don't assume command names.
- Change layout: `openspec/changes/<change-id>/` holding `proposal.md`, `design.md`, `tasks.md`, and `specs/` deltas per touched capability.

## Slice the PRD

- Vertical, not horizontal: each slice cuts schema → API → UI → tests end-to-end. "All the endpoints" is a layer, not a slice.
- A finished slice is demoable or verifiable on its own.
- Prefactoring that makes later slices easy goes in its own first slice — make the change easy, then make the easy change.
- Use glossary vocabulary from `CONTEXT.md`; respect ADRs in the touched area.

## Quiz the user

Present the breakdown as a numbered list — per slice: title, blocked-by, user stories covered. Ask whether the granularity feels right, the dependencies are correct, and anything should merge or split. Iterate until approved; only then write.

Take the testing flow — TDD or tests-after — from the PRD's Testing decisions. When the PRD doesn't record one, ask before writing any change; never default silently.

## Write each change

Per approved slice, in dependency order so blocked-by references point at real change ids:

- `proposal.md` — why and what changes; end-to-end behavior, not layer-by-layer steps.
- `design.md` — technical approach, only where the slice needs one.
- `tasks.md` — implementation checklist with acceptance criteria, ordered by the testing flow: TDD puts each slice's failing test before its implementation tasks ([[z-tdd]]); tests-after puts test tasks last.
- `specs/` — requirement deltas for each capability the slice touches.

No file paths or code snippets unless a prototype pinned a decision — then trim to the decision-rich part.

## Closing

Done when every approved slice has a change directory that passes validation. Report the change ids and stop — changes are proposals, not work in progress. Ask whether to start implementation now; on yes, go through the project's apply workflow — the `openspec` CLI's apply step or the project's own apply command, discovered rather than assumed — one change at a time. Never edit source straight from the PRD or the spec deltas.

## Do not

- Slice horizontally by layer.
- Write changes before the user approves the breakdown.
- Invent requirements the PRD doesn't contain.
- Apply or implement anything unprompted — implementation starts only when the user says so, through the apply workflow.
- Hardcode CLI verbs from memory; discover them.

## Verify

    fd -t d -d 1 . openspec/changes/    # one directory per approved slice
    openspec --help                     # CLI surface confirmed, not assumed

- Every user story in the PRD maps to a slice; every slice names its stories.
- Blocked-by references point at real change ids.
- The project's own openspec validation passes, when the CLI provides it.

see [[z-to-prd]], [[z-testing-strategy]], [[z-tdd]]
