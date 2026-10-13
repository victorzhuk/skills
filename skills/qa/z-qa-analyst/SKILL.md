---
name: z-qa-analyst
description: "Behavior-based test planning and acceptance traceability. Use for QA analysis, coverage gaps, test priorities, or a test plan. Map requirements to assertions and execution evidence; distinguish coverage from proof. Stub generation belongs to [[z-qa-spec-writer]], failure triage to [[z-qa-debugger]]."
---

# Test-plan analysis

Map behavior and risk to existing tests. Use execution coverage as supporting evidence, not proof of assertions.

## Inspect before planning

1. Read the scoped requirements, public interfaces, and existing tests.
2. Discover the repository's runner and coverage format.
3. Map each behavior to acceptance scenarios and assertions. Include relevant source paths for navigation.
4. Run or read current applicable coverage evidence through the bounded project wrapper.
5. Update the existing test-plan record; create a new record only within the requested scope.

A test file name does not prove coverage. Conversely, a source file without a same-named test may be covered through a higher interface.

## Prioritize

| Tier | Risk |
|---|---|
| P0 | Auth bypass, permissions, money, crashes, data loss |
| P1 | Core product invariants and common workflows |
| P2 | Remaining integration cases and lower-impact behavior |

Classify by impact and likelihood in the actual project. Do not mark everything P0 or infer importance from file size.

## Evidence status

| Status | Required evidence |
|---|---|
| Covered | A relevant assertion, its execution result, and the scenario it proves |
| Partial | Some required outcomes have assertions; list the missing ones |
| Gap | No adequate assertion for the required behavior |
| Unverified | Test exists but current execution evidence is unavailable |

Statement/branch coverage shows executed paths. It cannot establish that a test asserts the required outcome. A skipped stub remains a gap.

## Plan format

Use the project's convention. A compact table is sufficient:

| Behavior / requirement | Source paths | Test / assertion | Risk | Status | Missing proof |
|---|---|---|---|---|---|

Use existing acceptance IDs when present. Do not invent IDs or require one test file per source file. Date the record and identify the revision or scope reviewed.

List partial, gap, and unverified items with their reason and proposed next check. Preserve deliberate exclusions.

## Do not

- Install tools to count files or lines when the task needs behavior evidence.
- Generate skipped stubs automatically from every uncovered source file.
- Infer a framework or dependency setup from another project.
- Spawn parallel analysis unless the caller authorizes delegation.
- Mark coverage complete because an instrumentation percentage is high.

## Verify

Each status traces to inspected assertions and available execution evidence. Every missing proof is visible in the plan.
Use the approved product boundary for acceptance. Propose lower-layer tests only for named residual risks per [[z-testing-strategy]].
Preserve existing tests. Apply [[z-bdd]] when deciding whether required scenario evidence passes the gate.

See [[z-testing-strategy]], [[z-qa-spec-writer]], [[z-qa-debugger]], [[z-qa-orchestrator]], [[z-go-bdd]].
