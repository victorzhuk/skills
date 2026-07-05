---
name: z-design-brief
description: Turns a grilled idea into a design brief by walking through each screen one at a time — what it shows, what a user can click or act on, what state each element can be in, and how screens connect — then writes docs/design/<slug>-brief.md. Use when an idea from [[z-grill-with-docs]] has a UI surface, when the user wants to plan screens or user flows before design tooling, or mentions "design brief", "what should this look like", or "walk through the screens". Skip for backend-only or CLI-only ideas. Does not build the design system or prototype; see [[z-design-handoff]]. Does not decide visual craft such as typography, spacing, or motion.
---

# Design brief

Walk the idea's UI one screen at a time — what it shows, what the user can click or act on, what states each element has, how screens connect — then write the brief to `docs/design/<slug>-brief.md`. Same interview discipline as [[z-grill-with-docs]]: one question per turn, option cases with a marked recommended answer through the native `ask` tool.

## Screen inventory

List every screen the idea implies — including the auth, empty, error, and settings screens briefs usually forget. Confirm the inventory with the user before descending into any single screen — as a multi-select when the question tool supports it, so screens can be struck or added in one pass.

## Per screen

Resolve in order, one screen at a time; finish a screen before opening the next.

- **Purpose** — the one job this screen does; if it has two, it may be two screens.
- **Shows** — data and content, where it comes from, what empty and loading look like.
- **Actions** — every clickable or actionable element; for each: label, effect, destination, failure behavior.
- **States** — per element: default, disabled, loading, error; hover/focus where it matters.
- **Transitions** — what leads here, where each action leads, what back does.

## Flow and navigation

- Entry points (navigation, deep links, notifications) and the default landing screen.
- The primary path through the screens — name it. Secondary paths after.
- Global error/empty/offline handling that individual screens inherit.

## Write the brief

Write `docs/design/<slug>-brief.md` from [assets/brief.template.md](assets/brief.template.md): Overview, Screens (one section each), Flow, Open questions. The brief records what each screen does and contains — not how it looks. If the user asks to just see it, print the brief in the conversation instead of writing the file.

## Do not

- Pick colors, spacing, typography, motion, or component libraries — that is the design system's job; see [[z-design-handoff]].
- Skip screens because they are "obvious" — empty and error states are where briefs fail.
- Write the brief before every screen in the inventory is walked.
- Describe layout pixel-precisely; name regions and hierarchy, not coordinates.
- Continue past the brief unprompted — [[z-design-handoff]], the PRD, and any implementation start only when the user asks.

## Verify

    fd -e md . docs/design/    # brief exists

- Every screen in the inventory has Purpose/Shows/Actions/States/Transitions resolved.
- Every action names its failure behavior.
- Open questions are listed, not silently dropped.

see [[z-grill-with-docs]], [[z-design-handoff]]
