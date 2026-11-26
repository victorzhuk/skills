---
name: z-interface-kit
description: "Build or refine an interface with design tokens, typography, layout, components, and motion. Use for component styling or design handoff. See [[z-accessibility]] for audits, [[z-react-core]] for React, and [[z-ts-core]] for tooling."
---

# Interface kit

## Establish the design context

Read the design brief, `DESIGN.md`, component library, and installed styling configuration. Reuse the project's tokens and primitives. Add a dependency only for a demonstrated gap. Identify the main flow and its loading, empty, error, and success states.

## Set type, spacing, and color

- Start with readable type and fallbacks. A 16 CSS px body and a 65-character line are starting points. Test long text, translations, and resizing.
- Use balanced headings and tabular numbers where supported. Test the fallback. Keep spacing consistent with the project's scale.
- For concentric surfaces, add the gap to the inner radius to get the outer radius. Inspect stacking contexts when layers overlap.
- Define tokens for foreground, background, primary actions, muted text, errors, borders, and focus. Match the installed theme's token format.
- Check foreground/background contrast in every supported theme and state. Pair color cues with text, icons, or other visible information. Apply [[z-accessibility]] for WCAG text and non-text criteria.

## Implement components

| Component | Required behavior |
|---|---|
| Button | Preserve its accessible name while loading. Prevent duplicate submission. Check pointer target size and spacing. |
| Card | Give interactive styling to actionable elements. Keep competing controls separate. |
| Dialog | Name the dialog. Test initial focus, modal isolation, Escape, and focus restoration. |
| Form | Associate labels, instructions, and errors. Add appropriate autocomplete. Show the server's submission result. |
| Notification | Announce status without moving focus. Keep important or actionable information available. |
| List | Measure rendering cost before virtualization. Preserve keyboard navigation and screen-reader context. |

Consult [component patterns](references/component-patterns.md) for the control in use. Check each API against the installed version.

## Add motion when it conveys a change

Start with brief transitions. Use transforms and opacity where suitable. Measure rendering cost. Limit hover effects to devices that support hover. Avoid `transition: all` and permanent speculative `will-change`.

Honor `prefers-reduced-motion`. Preserve the state change and its feedback when motion stops. Keep behavior independent of animation-end events. See [animation patterns](references/animation-playbook.md) for gestures.

## Check the complete interface

Exercise the primary flow and all relevant states. Test narrow and wide viewports, themes, keyboard order, visible focus, announcements, and touch targets. Check text at 200% and reflow at 400% zoom where applicable.

Use the [delivery checks](references/essentials-and-delivery.md) for a handoff. Use the [review checklist](references/review-checklist.md) and [accessibility checklist](references/accessibility-checklist.md) for a larger review.
