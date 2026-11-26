---
name: z-accessibility
description: "Audit web accessibility against WCAG 2.2. Use for keyboard navigation, screen-reader support, contrast, forms, and conformance reviews. See [[z-interface-kit]] for component styling."
---

# Web accessibility

## Define the audit

Record the target WCAG version, level, pages, and complete user flows. Use WCAG 2.2 AA unless the product specifies another target. AA includes level A. Use the [criterion reference](references/WCAG.md) and the [WCAG standard](https://www.w3.org/TR/WCAG22/) for scope and exceptions.

## Check the interface

| Area | Inspect |
|---|---|
| Perception | Give images, icon buttons, charts, and controls useful text alternatives. Hide decorative images from assistive technology. |
| Media | Check captions, transcripts, and audio description against the media type, timing, and target level. |
| Text contrast | For AA, use 4.5:1 for ordinary text or 3:1 for large text. Large text starts at 18 pt regular or 14 pt bold. |
| Non-text contrast | Check required control boundaries, states, and meaningful graphics against adjacent colors. Criterion 1.4.11 requires 3:1, subject to its exceptions. |
| Input | Test keyboard activation, skip navigation, visible focus, and focus order. Provide alternatives to dragging. Check the 24 by 24 CSS px target-size rule and its exceptions. |
| Focus | Check that author-created content does not fully obscure keyboard focus. Test modal entry, background isolation, Escape, and focus restoration. |
| Time and motion | Check time-limit controls, moving content, flash thresholds, and reduced-motion behavior. |
| Understanding | Mark page and passage languages. Keep navigation and help consistent. Name form controls and link errors to the affected fields. |
| Authentication | Test alternatives to cognitive tests and unnecessary repeat entry in the same process. Check the applicable exceptions. |
| Semantics | Prefer native controls. For custom widgets, test the accessible name, role, state, and keyboard interaction. Announce status changes without moving focus. |

Use the [interface examples](references/interface-examples.md) for HTML, CSS, and JavaScript patterns. Report a broken name or relationship against the affected criterion. WCAG 2.2 removed parsing criterion 4.1.1.

## Check the complete flow

1. Run the existing automated audit on each relevant state.
2. Complete each flow by keyboard and with a screen reader. Test zoom, reflow, contrast, and failure recovery.
3. Record the page, state, criterion, user impact, and steps for each failure. Retest the corrected flow.
4. State which flows, assistive technologies, and criteria the audit covered. Automated results alone cannot establish conformance.

Use the [testing and triage guide](references/testing-triage.md) for commands and issue reporting.
