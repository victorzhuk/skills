---
name: z-design-handoff
description: Turns a design brief into a tool-agnostic handoff package for a cloud design tool such as Figma Make, Google Stitch, v0, or Lovable — a design-system spec of tokens, component inventory, and states, plus one generation prompt per screen and a reference list — so the user can paste it into whatever tool they use and bring back a prototype. Use after [[z-design-brief]] produces a brief, when the user wants to move a brief into a design tool, or mentions "design system", "handoff package", or "generate this in Figma, Stitch, or v0". Does not operate any design tool — the user runs the generation step and returns with a prototype. Does not turn the prototype into a PRD; see [[z-to-prd]].
---

# Design handoff

Turn a design brief into a handoff package the user pastes into a cloud design tool (Figma Make, Google Stitch, v0, Lovable, …) to build a design system and prototype there. The user runs the tool; this skill prepares its inputs and records its outputs.

## Read the brief

Start from `docs/design/<slug>-brief.md` ([[z-design-brief]]). Missing screens or unresolved actions go back to the brief first — a handoff built on gaps produces a prototype that answers nothing.

## Design-system spec

Derive from the brief plus whatever references the user provides — screenshots, products they like, brand assets:

- **Tokens** — color roles (background, surface, primary, danger, …), type scale, spacing scale, radius. Name roles, not hex values, unless a reference pins them.
- **Component inventory** — every element the screens' Actions and States imply: buttons, inputs, cards, lists, dialogs, navigation. For each, the variants and states the brief names.
- **Voice** — density, tone, platform conventions to follow.

Infer from references; where nothing pins a choice, ask — option cases with a recommended default, per [[z-grill-with-docs]] question discipline — don't invent a brand.

## Per-screen generation prompts

One prompt per screen, self-contained and portable across tools:

- a compact restatement of the design-system spec (or a reference to it, if the tool holds context),
- the screen's Purpose/Shows/Actions/States from the brief, in prose,
- which reference applies and what to take from it.

## Package

Write `docs/design/<slug>-handoff.md` from [assets/handoff.template.md](assets/handoff.template.md): design-system spec, reference list, per-screen prompts, and an empty Results section.

## Re-entry

When the user returns with a prototype — link, exports, screenshots — record it in the handoff doc's Results section, screen by screen, noting deviations from the brief worth keeping vs fixing. That record is what [[z-to-prd]] reads.

## Do not

- Drive the design tool yourself — the user runs the generation step.
- Lock prompts to one tool's syntax; keep them prose.
- Invent brand values no reference supports.
- Hand off while Open questions still block a screen prompt.
- Treat the returned prototype as a build order — it feeds [[z-to-prd]]; implementation is not this skill's next step.

## Verify

    fd -e md . docs/design/    # handoff doc exists next to the brief

- Every screen in the brief has a generation prompt.
- Every component in the inventory appears in at least one screen prompt.
- The Results section captures the returned prototype before moving to [[z-to-prd]].

see [[z-design-brief]], [[z-to-prd]]
