---
name: z-qa-analyst
description: "Map requirements to assertions, execution evidence, and gaps. Use for test planning, priorities, or coverage review. See [[z-qa-spec-writer]] for scaffolding and [[z-qa-debugger]] for failures."
---

# Build a test plan

## Inspect behavior

1. Read the scoped requirements, public interfaces, and existing tests.
2. Identify the project runner and coverage format. Inspect current evidence or use the bounded project wrapper.
3. Map each behavior to a scenario and its observable assertions. Record the source path when it helps navigation.
4. Assign risk from impact and likelihood. P0 examples include money, data loss, crashes, and unauthorized access.
5. Use P1 for core workflows and P2 for lower-impact cases when these match the project's conventions.

A matching filename or executed statement cannot establish what a test asserts. A higher-level test can cover several source files.

## Record evidence

| Status | Meaning |
|---|---|
| Covered | A relevant assertion passed for the scenario and revision. |
| Partial | Assertions cover only some required outcomes. Identify the missing outcomes. |
| Gap | No adequate assertion exists. A skipped stub leaves a gap. |
| Unverified | A test exists, but current execution evidence is unavailable. |

Use the existing plan format. Record behavior, source paths, assertion, risk, status, missing proof, and next check.
Include the date and revision or scope. Reuse existing requirement IDs. Keep deliberate exclusions visible.
Create a new plan file or delegate analysis only within the caller's scope.

## Check the plan

Trace each status to an assertion and its available result. Use [[z-bdd]] for acceptance evidence.
Preserve existing tests. Recommend a lower-level test only for a named risk under [[z-testing-strategy]].
