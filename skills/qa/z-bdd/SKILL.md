---
name: z-bdd
description: "Define BDD acceptance scenarios for a UI, API, or CLI. Use for Given-When-Then, E2E acceptance, or scenario evidence. See [[z-testing-strategy]] for test selection and [[z-go-bdd]] for Go harnesses."
---

# Specify observable behavior

## Agree on a scenario

Read the requirement, project vocabulary, and existing acceptance scenarios. Resolve ambiguous outcomes before implementation.
Reuse existing requirement identifiers and the project's readable scenario format. Gherkin does not require a new test framework.

For each scenario, record the requirement, actor, initial state, controlled fixtures, action, and observable outcome.
Specify the public boundary, dependencies, risk, and required execution scope.
Use domain terms in the scenario. Put selectors, API calls, and fixture setup in the executable adapter.

## Choose the boundary

| Product | Exercise |
|---|---|
| Web UI | Open the running application in a browser. |
| API or service | Call the running service through its public protocol. |
| CLI | Run the built executable with controlled arguments and environment. |

Include required first-party dependencies. Record what each external substitute leaves untested.
An in-process handler test covers only part of a running-service journey. Use [[z-testing-strategy]] for residual risks.

## Execute the contract

1. Record the selected scenarios before the run. Isolate state and bound setup and polling.
2. Derive expected results from the requirement or an independent example.
3. Exercise each assertion through the project runner. Check that changed assertions detect the intended failure.
4. Preserve approved test order, fixtures, and expected behavior when repairing test infrastructure.
5. Record discoveries as candidate scenarios. Change acceptance criteria through the agreed requirement process.

## Report the verdict

Compare selected scenarios with observed results. Pass only when every required scenario ran and met every assertion.
A failure, skip, pending step, missing result, blocker, or flake prevents acceptance. Report retry passes through [[z-qa-debugger]].
Identify the next diagnostic action for a blocked run. Exploratory observations alone cannot establish repeatable acceptance.

Record the revision, scenario, boundary, command, environment, fixture identity, outcome, and evidence location.
Redact private data. Store execution evidence separately from the authoritative scenarios.
