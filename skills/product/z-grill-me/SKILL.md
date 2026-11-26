---
name: z-grill-me
description: "Clarify a request or sharpen a prompt before implementation. Check the brief against code and project records. Ask one unresolved question at a time. Use [[z-grill-with-docs]] to record decisions."
---

# Clarify a request

## Prepare the brief

Summarize the goal, reason, verified context, testable requirements, constraints, exclusions, and unknowns.
Label assumptions explicitly.

## Resolve what the evidence settles

1. Check named files, symbols, commands, and flags. Mark planned additions as new. Identify existing items you could not locate.
2. Read the relevant implementation. Cite the path and line when it settles a question or contradicts the brief.
3. Read existing glossary entries, decisions, PRDs, and specs. Use the established vocabulary and decisions.
4. Identify stale or conflicting records. Cite the evidence for each conflict.
5. Check version-sensitive capabilities in current primary documentation before presenting them as options.

For a prompt-only request, return the verified brief here.

## Interview

Ask one question per turn about an unresolved decision that affects the outcome. Resolve prerequisites first.
For concrete choices, give the alternatives, their trade-offs, and a recommendation with its reason.
Use a structured question when the host supports the options. Use prose for an open question.
Surface contradictions as they appear. Stop when another answer would not change a decision.

## Close

List decisions, assumptions, and unresolved items separately. Trace each fact to source or user input.
Identify the next useful artifact when appropriate. Start further work only when requested.
Use [[z-grill-with-docs]] for durable records, [[z-design-brief]] for UI behavior, and [[z-to-prd]] for product requirements.
