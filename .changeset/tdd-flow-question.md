---
"victorzhuk-skills": patch
---

Make the spec pipeline confirm the testing flow — TDD (test-first) or tests-after — before generating anything: `z-to-prd` now asks it as its second allowed interview question (alongside seam confirmation) and records the answer in the PRD's Testing decisions (the PRD template gained a `Flow:` line); `z-prd-to-openspec` reads the flow from the PRD, asks only when the PRD doesn't record one, and orders each slice's `tasks.md` accordingly (TDD puts the failing test before implementation tasks, tests-after puts test tasks last).
