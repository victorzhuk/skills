---
name: z-design-handoff
description: "Prepare a design handoff from a screen brief for Figma Make, Stitch, v0, or Lovable. Write the tokens, components, screen prompts, and prototype results."
---

# Prepare a design handoff

## Extract the design requirements

1. Read `docs/design/<slug>-brief.md` and the supplied visual references. Use [[z-design-brief]] to resolve missing actions or states.
2. Define semantic color roles, type sizes, spacing, and corner radii. Use fixed values when the references establish them.
3. List the components each action needs. Record their variants and states.
4. Record tone, density, and platform conventions. Resolve a missing brand decision with [[z-grill-with-docs]].

## Prepare the package

Use [the handoff template](assets/handoff.template.md) at `docs/design/<slug>-handoff.md`.
Write one portable prompt per screen. Include its purpose, content, actions, states, and relevant reference.
Resolve open questions that prevent a complete prompt before delivering the package.
Refer to shared tokens when the target tool has that context. Otherwise include the necessary tokens in each prompt.

Check every brief screen against its prompt. Check that each listed component appears in a screen.
Leave Results empty for the initial handoff. The user operates the design tool.

## Record a returned prototype

Record its link, exports, or screenshots in Results. List deviations by screen and record which ones the user accepts.
Use the returned results as input to [[z-to-prd]] when requested.
