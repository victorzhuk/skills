# BDD Anti-Patterns

Use this as a review checklist.

## Feature files

- Scenario mirrors a function name instead of behavior.
- Steps mention table names, package names, mocks, handlers, selectors, or SQL when those are not the user-visible contract.
- `Background` creates a hidden world that readers cannot reason about.
- One scenario verifies several independent behaviors.
- `Scenario Outline` compresses unrelated cases into a confusing examples table.
- Tags are inconsistent aliases: `@payment`, `@payments`, `@billing-payments`.
- `@wip` remains on merge-ready scenarios.

## Step definitions

- Business logic lives in step code.
- `Given` contains assertions.
- `When` performs setup plus the action under test.
- `Then` changes system state.
- Shared mutable state leaks between scenarios.
- Steps depend on scenario order.
- Regexes are too broad and bind unintended steps.
- Errors are swallowed to keep the scenario green.

## Test design

- Mock-only BDD claims to prove DB, queue, cache, transaction, or external-provider behavior.
- A Gherkin scenario duplicates a faster domain table test without adding business readability.
- UI click paths are used to prove backend rules that an API/use-case test can prove faster.
- Reports are treated as source of truth instead of `.feature` files.
- Feature files are written after implementation only to satisfy process.

## Review questions

- Would this scenario fail if the behavior regressed?
- Can a product or support person understand it without code context?
- Does the test cross the boundary where the real risk lives?
- Is every setup detail necessary for the behavior?
- Is the final assertion observable outside private implementation?
