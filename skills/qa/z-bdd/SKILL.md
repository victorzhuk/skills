---
name: z-bdd
description: "BDD acceptance contracts for humans and agents across UI, API, and CLI products. Use for Gherkin, Given-When-Then, E2E acceptance, or scenario evidence. Define repeatable scenarios with explicit assertions and required outcomes. Test selection belongs to [[z-testing-strategy]]. Go harness wiring belongs to [[z-go-bdd]]."
---

# Behavior contracts

Define the behavior before implementation. Prove it with repeatable scenarios at the product's public boundary.

## Agree the contract

Read the request, existing requirements, domain language, and acceptance scenarios. Resolve ambiguous outcomes before implementation.

Make scenarios authoritative for acceptance. Link existing requirement records instead of maintaining competing copies of the same behavior.
Preserve existing requirement identifiers. Do not require a tracker or invent ticket IDs.

Use Gherkin when the project needs a shared readable format. Preserve an equivalent existing scenario format when it serves that contract.
Do not install a framework merely to obtain Given-When-Then syntax.

Each scenario defines:

- The behavior and its requirement source.
- The actor, initial state, and controlled fixtures.
- One action under test and explicit observable outcomes.
- The public boundary and dependencies exercised.
- Its risk and required execution scope.

Use domain language in step text. Keep selectors, function names, and fixture plumbing in the executable adapters.
Keep setup minimal. Isolate scenario state and bound polling and dependency startup.

## Choose the product boundary

| Product | Acceptance boundary |
|---|---|
| Web UI | Browser against the running application |
| API or service | Running service through its public protocol |
| CLI | Built executable with controlled inputs and environment |

Use the real application path and required first-party dependencies. Record external substitutes and the behavior they cannot prove.
An in-process handler or use-case test may support acceptance. It does not prove a running service's full path.
Use [[z-testing-strategy]] to select additional tests for named residual risks.

## Execute repeatably

Keep maintained scenarios and explicit assertions runnable through the project's existing runner.
Agents may execute scenarios, inspect failures, and explore additional cases. Exploratory judgment does not replace regression assertions.
Capture new discoveries as candidate scenarios. Change acceptance criteria only when the requirement changes through the agreed review process.

Derive expected values from requirements or independent examples. Never weaken assertions, skip required scenarios, or change fixtures to hide a failure.
Repair locators or infrastructure only when the intended behavior and assertions remain unchanged.
Verify that each new or changed assertion detects its intended failure. Follow the approved test-first or tests-after flow.

## Gate on evidence

Record selected scenarios before execution. Compare that selection with the observed results so an empty or incomplete run cannot pass.

PASS requires every required scenario and assertion to pass. Required failures, skips, pending steps, missing results, blocked execution, and flakes prevent PASS.
A retry-pass remains flaky. Diagnose it using [[z-qa-debugger]] rather than silently treating it as stable.
An environment failure means incomplete acceptance. Report the blocker and the next useful diagnostic action.

Reuse the project's report format. Record the revision, scenario reference, boundary, command, outcome, and evidence location.
Record relevant environment and fixture identity so another run can reproduce the conditions. Redact credentials and private fixture data.
Include relevant traces or logs without secrets. Keep run evidence separate from the authoritative scenarios.

## Verify

- Every changed behavior maps to a readable scenario and explicit assertions.
- Required scenarios executed at the declared boundary with controlled state.
- Results match the selected scope and the tested revision.
- Missing proof, substitutes, and named residual risks remain visible.

See [[z-testing-strategy]], [[z-go-bdd]], [[z-qa-browser]], [[z-qa-api]], [[z-qa-analyst]].
