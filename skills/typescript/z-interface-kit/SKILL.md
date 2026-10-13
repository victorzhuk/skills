---
name: z-interface-kit
description: UI implementation with design tokens, typography, layout, components, and motion. Use for building or polishing interfaces, component styling, and translating a design into working UI. Follow the project's design system; accessibility audits belong to [[z-accessibility]], React boundaries to [[z-react-core]], and TypeScript tooling to [[z-ts-core]].
---

# Interface kit

Follow the project's design system and existing components. If no system exists, choose a small set of tokens and a visual direction suited to the audience and task. The defaults below are design preferences, not accessibility conformance requirements.

## Start with the working context

- Read the relevant design brief, `DESIGN.md`, component library, and package versions.
- Preserve existing framework and styling conventions. Add a dependency only for a demonstrated gap.
- Resolve the main user flow, content hierarchy, and loading, empty, error, and success states before decorative motion.
- Route React server/client questions to [[z-react-core]] and TypeScript configuration to [[z-ts-core]].

## Typography and layout

- Use readable body text, clear hierarchy, and resilient font fallbacks. A 16px body size and roughly 65-character line length are useful starting points, not universal minimums.
- Let text resize and reflow. Avoid fixed heights that clip translated or enlarged content.
- Use `text-wrap: balance` for headings and `pretty` for prose where supported; verify the fallback.
- Use tabular numbers when changing digits should keep alignment.
- Reuse a spacing scale. A 4/8px rhythm is a default; optical adjustments and content needs can justify exceptions.
- For nested rounded surfaces, use `outer radius = inner radius + gap` when concentric geometry is intended. Borders and shadows are both valid ways to establish hierarchy.
- Define stacking levels deliberately and account for stacking contexts; a large z-index does not escape its context.

## Color and theme

- Use semantic tokens for background, foreground, primary, muted, destructive, border, and focus.
- Preserve the token format required by the installed styling system. Older shadcn/Tailwind examples use HSL channels; current Tailwind v4 examples commonly use complete color values and `@theme`. Do not mix these recipes.
- Test every foreground/background pair in each supported theme and state.
- WCAG AA text contrast is 4.5:1 normally, or 3:1 for large text: at least 18pt regular (24 CSS px) or 14pt bold (about 18.67 CSS px).
- Required non-text controls and state indicators generally need 3:1 against adjacent colors. Never encode information only through color.
- Pure black, pure white, system fonts, gradients, and familiar layouts are valid when they serve the product. Do not replace working choices solely to appear distinctive.

## Components

Prefer native controls and the project's existing accessible primitives. A library is a starting point; composition can still break semantics, focus, or labeling.

- **Buttons:** use native disabled behavior, preserve an accessible name while loading, prevent duplicate submission, and keep layout stable. A 44px target is a useful house preference; WCAG 2.2 AA target-size rules use 24 CSS px with defined exceptions.
- **Cards:** add hover/press behavior only to actionable surfaces. Avoid nesting competing interactive targets.
- **Dialogs:** provide a name, initial focus, modal isolation, Escape behavior, and focus restoration. Use a maintained primitive or native dialog; verify the actual keyboard flow.
- **Forms:** visible labels, correctly associated help/errors, appropriate autocomplete, server validation, and a useful submission result.
- **Notifications:** announce status without stealing focus. Keep important errors and actionable content available until dismissed or resolved; do not rely on a short-lived toast as the only record.
- **Lists:** virtualize when measured rendering cost warrants it, while preserving keyboard access and screen-reader context.

Load [component patterns](references/component-patterns.md) only for the component being implemented. Treat version-specific examples as patterns to adapt, not a package installation plan.

## Motion

- Use motion to explain a change or confirm an action. Reduce it on frequently repeated interactions.
- Start with short transitions, usually 100–300ms; tune to distance, context, and user testing. Easing and duration are design choices.
- Animate transform and opacity when they achieve the effect; verify actual rendering cost. CSS alone does not guarantee compositor execution.
- Prefer transitions for retargetable hover/state changes. Keyframe animations can also be paused or cancelled; choose based on required behavior.
- Gate hover-only effects with `(hover: hover) and (pointer: fine)`.
- Respect `prefers-reduced-motion`: remove nonessential movement and keep state feedback available without motion. Do not make correctness depend on an animation-end event.
- Avoid `transition: all` and persistent speculative `will-change`.

Load [animation patterns](references/animation-playbook.md) for gestures or complex choreography.

## Do not

- Treat aesthetic preferences, Lighthouse scores, or automated checks as proof of WCAG conformance.
- Copy framework-version-specific token or component APIs without checking installed versions.
- Hide focus, remove labels, or shrink interaction targets to satisfy a visual preference.
- Add decorative motion to every press, hover, or state change by default.
- Build a second design system around a small change.

## Verify

Use [[z-accessibility]] as the accessibility authority, normally targeting WCAG 2.2 AA unless the product contract specifies another version.

- Run the existing bounded checks required for the change.
- Exercise the primary flow and relevant loading, empty, error, and success states.
- Test keyboard order, visible and unobscured focus, dialog focus restoration, labels, and announcements manually.
- Check contrast, reduced motion, touch targets, 200% text resizing, and 400% zoom/reflow where applicable.
- Inspect supported narrow/wide viewports and themes, including long content.
- Measure any claimed performance improvement; an automated score alone is not a conformance assessment.

For a focused handoff use [delivery checks](references/essentials-and-delivery.md); for a larger review use [review checklist](references/review-checklist.md). The [accessibility checklist](references/accessibility-checklist.md) supplements [[z-accessibility]].
