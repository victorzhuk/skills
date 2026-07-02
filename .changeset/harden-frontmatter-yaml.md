---
"victorzhuk-skills": patch
---

Fix two skill descriptions (`z-clean-output`, `z-testing-strategy`) that broke strict YAML parsers: an unquoted apostrophe inside a plain scalar. Both are now quoted correctly. `npm run check` and `npm run list` gained matching hardening: quoted descriptions are unwrapped correctly (no more doubled `''` in printed output), and `npm run check` now rejects any unquoted description containing `": "` since that's invalid under strict YAML. `z-qa-visual` is folded into `z-qa-browser` as a "Visual regression (rare)" section — it had no standalone adoption anywhere in the corpus.
