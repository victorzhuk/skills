---
"victorzhuk-skills": patch
---

Add final implementation guards to the five product-pipeline skills (`z-grill-with-docs`, `z-design-brief`, `z-design-handoff`, `z-to-prd`, `z-prd-to-openspec`): each now ends by storing its artifact (or printing it in the conversation on request), asking the user before any implementation starts, and routing implementation through the project's apply workflow — the `openspec` CLI's apply step or the project's own apply command — instead of editing source straight from a spec.
