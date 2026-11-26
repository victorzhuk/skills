---
name: z-design-brief
description: "Write a design brief for a UI. Describe screens, actions, states, and navigation. Use [[z-design-handoff]] for visual design. Skip this procedure for backend-only or CLI work."
---

# Write a design brief

## Map the screens

1. Read the approved idea. Reuse the existing screen inventory or derive one from the primary journey.
2. Trace the primary user journey from its entry point to its outcome.
3. Add missing entry, settings, authentication, and recovery screens where needed. Include deep links and back navigation.
4. Resolve missing decisions one screen at a time. Use the question format in [[z-grill-with-docs]].

## Describe each screen

| Field | Record |
|---|---|
| Purpose | The task the user can complete. |
| Shows | Content, its source, and its loading and empty states. |
| Actions | Each control's label, effect, destination, and failure behavior. |
| States | Applicable disabled, loading, error, hover, and focus states. |
| Transitions | Entry points, destinations, back behavior, and shared offline or error handling. |

Distinguish a state of an existing screen from a separate destination. Describe content hierarchy. Leave visual tokens to [[z-design-handoff]].

## Deliver the brief

Use [the brief template](assets/brief.template.md) at `docs/design/<slug>-brief.md`. Return the brief in chat when requested.
Trace each action through the inventory. Check its destination and failure outcome. List unresolved questions explicitly.
