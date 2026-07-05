---
"victorzhuk-skills": patch
---

Interview skills now ask option-case questions with a marked recommendation instead of prose-only questions: when an answer folds into 2–4 concrete options, present them as cases — recommended option first, marked "(Recommended)", one-line trade-off per option — through the harness's structured question tool when one exists (AskUserQuestion or equivalent), falling back to the same structure in prose. `z-grill-with-docs` carries the rule (plus a new "Do not" against bare yes/no option questions); `z-design-brief` inherits it and confirms the screen inventory as a multi-select; `z-to-prd` asks its two allowed questions (test seam, TDD vs tests-after) as option cases; `z-design-handoff` asks unpinned brand/token choices the same way.
