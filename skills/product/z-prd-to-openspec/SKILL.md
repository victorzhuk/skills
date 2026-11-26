---
name: z-prd-to-openspec
description: "Split a PRD into independently verifiable OpenSpec changes. Map stories, dependencies, and acceptance scenarios. Use [[z-to-prd]] to write the PRD and [[z-testing-strategy]] to choose test scope."
---

# Convert a PRD to OpenSpec changes

## Establish the project convention

Read the PRD, authoritative glossary, and existing changes. Inspect the installed CLI's help and project wrapper.
If the project has no OpenSpec configuration, establish the intended location and setup authority before writing files.

## Agree on the slices

1. Group stories by outcomes that can be demonstrated independently. Include only the layers each outcome needs.
2. Separate preparatory work when a later slice genuinely depends on it.
3. Present each slice's title, covered stories, dependencies, and acceptance scenario.
4. Reuse an approved breakdown. Resolve any missing decisions about scope, order, or testing before writing.
5. Preserve the agreed test sequence. Use [[z-bdd]] for acceptance and [[z-testing-strategy]] for named residual risks.

## Write the changes

Write each approved slice under the project's change directory. Follow the active schema.
For the standard layout, describe the change in `proposal.md` and record applicable design decisions in `design.md`.
Order `tasks.md` according to the agreed test flow. Include acceptance criteria in its checklist.
Put capability deltas under `specs/`. Link each delta to its authoritative acceptance scenarios.
Include code or file paths only when they record an established design decision.

Check that each story maps to a slice and each dependency names an existing change.
Run the project's OpenSpec validator on each change. Report change IDs and unresolved validation errors.
Start implementation through the project's apply workflow when the user authorizes it.
