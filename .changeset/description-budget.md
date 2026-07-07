---
"victorzhuk-skills": minor
---

Compress skill descriptions to fit harness context budgets. Harnesses load every skill description into context and skip skills once the total passes ~50 KB; the catalog sat at 49k chars. The 45 largest descriptions are rewritten to the house shape (what → when → at most 5–6 trigger phrases → at most 2 boundary clauses), and `npm run check` now enforces a 600-char per-description cap and a 40,000-char catalog total.
