---
name: z-qa-orchestrator
description: "Run acceptance and required regression checks with the project runner. Use for full QA, a scoped phase, or a QA report. See [[z-bdd]] for contracts and [[z-qa-debugger]] for failures."
---

# Run project QA

## Select the runner and scope

Read CI, project instructions, and local QA commands. Inspect the actual Makefile, Taskfile, justfile, or package scripts.
Use the existing wrapper and fixture setup. See [[z-just]], [[z-go-makefile]], or [[z-go-taskfile]] for wrapper behavior.
For an explicitly named test, package, or phase, run only that scope. A general QA request includes the project's merge gate.

## Run phases in order

1. **Changed acceptance and critical smoke tests.** Record selected scenarios and boundaries. Run their prerequisites, static checks, and critical journeys in project order.
2. **Merge gate.** Run broader required acceptance, regression, lint, type, race, and security checks. Include additional tests for approved residual risks.
3. **Additional checks.** Run requested load, visual, accessibility, or manual checks. Keep checks required for acceptance in the acceptance gate.

Apply the process deadlines, test timeouts, and worker limits in [[z-testing-strategy]].
Follow exact dispatched commands when the caller supplies them. Use the prescribed lifecycle to apply their limits.
Within a phase, collect the requested failure evidence. After a failed phase, stop unless the caller requests continuation.
Use existing tools. Adding dependencies or screenshot baselines requires the corresponding scope.

## Record the result

For each phase, record scope, duration, verdict, and incomplete checks. Preserve failures when another phase succeeds.
Apply [[z-bdd]] to the overall verdict. Required skips, pending steps, missing results, blockers, and flakes prevent a pass.
Summarize the attempted phases inline or use the project's established QA log.

Use [[z-qa-api]], [[z-qa-browser]], [[z-qa-android]], and [[z-qa-performance]] for product-specific execution.
Use [[z-qa-analyst]] for planning, [[z-qa-spec-writer]] for stubs, and [[z-qa-debugger]] for triage.
See [[z-go-bdd]] and [[z-go-testing]] for Go test mechanics.
