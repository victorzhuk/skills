---
name: z-testing-strategy
description: Choose test depth and behavior-contract approach from the type of work, not a fixed coverage target — MVP/greenfield TDD vs existing-service regression protection, and when observable behavior needs a Gherkin/BDD contract vs an ordinary test. Use before writing code that has any observable behavior; use when planning what to test, classifying a task as MVP vs existing-service, or deciding whether a change needs a failing test first. Triggers on "what should I test", "TDD", "regression test", "is this MVP or production", "does this need a feature file". Does not cover language-specific test syntax, mocking libraries, or table-driven patterns; see the language's own testing skill (e.g. Go: [[z-go-testing]] for unit tests, [[z-go-bdd]] for Gherkin/godog).
---

# Testing strategy

Before writing code with observable behavior, classify the work and pick the matching test depth — then write the failing test before the implementation.

## Step 1 — classify

**Observable behavior** (needs a test before the code): API/CLI response, business workflow, permission or auth check, billing/money/retry/idempotency, state transition, persistence effect, external side effect, user-visible error, a bug someone can describe by what the system does wrong.

**Internal-only** (a test may not be worth it): private helper, mechanical refactor with no behavior change, generated code, a mapper with no logic.

## Step 2 — pick the mode

| Work type | Mode | Depth |
|---|---|---|
| New MVP/greenfield service | MVP | Tight TDD on core business behavior; light integration smoke only |
| New feature in an existing service | Existing-service | Regression/characterization test first; cover recurrent cases around the touch point |
| Bug fix in an existing service | Existing-service | Reproduction test first, then the fix |
| Refactor with no intended behavior change | Existing-service | Characterization test around the touched behavior before moving code |
| Risky domain — auth, money, data loss, permissions, irreversible state | Existing-service depth, even inside an MVP | Cover the edge cases before shipping, regardless of project maturity |

### MVP / greenfield

Goal: learn fast without freezing an unstable design.

- Start business behavior with TDD: one failing test per small behavior, smallest code to pass, refactor while green.
- Prefer domain/use-case tests over transport tests.
- Add one smoke integration test per real boundary that can break independently (DB, HTTP, queue, external client).
- Cover: one happy path, one main business rejection, one real integration path, and any auth/money/permissions/data-loss rule even at this stage.
- Skip: DTO/getter/setter tests, framework-boot tests, mapper tests with no logic, exhaustive validation matrices, scaffolding that will be deleted soon.
- Done when: core behavior is executable as tests, one real integration boundary is exercised, and anything deferred is named explicitly rather than silently dropped.

### Existing business service

Goal: change behavior without losing what's already guaranteed.

- Read the existing tests before writing code.
- Add a failing test before changing behavior — regression for a fix, characterization for a refactor, new-behavior test for a feature.
- Cover, when touched: permissions, validation boundaries, state transitions, idempotency/retries, persistence and transaction behavior, external side effects, user-visible error mapping, backward compatibility, migrations.
- Run the targeted test first, then the relevant suite through the project's own wrappers.
- Done when: old behavior stays covered, new behavior has direct tests, bug fixes carry a reproduction test, and no test is left flaky or skipped without a reason.

## Step 3 — does this need a behavior contract (Gherkin/BDD)?

Reach for a Gherkin/BDD-style contract when the behavior is readable by more than developers: a business workflow, an API/CLI contract, permissions/auth, billing/retries/idempotency, a cross-service or infrastructure boundary, or anything that doubles as release evidence.

Prefer an ordinary test when the behavior is purely internal: an algorithm invariant, a validation helper, a parser/formatter edge case, a fast domain rule better expressed as a table test.

If the project has no BDD harness and the behavior clearly warrants one, use the nearest behavior-level test in the ordinary framework and ask before adding a new dependency.

## Test layer choice

| Need | Layer |
|---|---|
| Fast business feedback | domain/use-case unit test |
| Contract with storage | repository integration test |
| Request/response behavior | handler/API integration test |
| External service behavior | adapter contract test with a fake/stub |
| Critical user journey | E2E test |
| Unknown legacy behavior | characterization test |
| A previous production bug | regression test that fails before the fix |

Prefer the lowest layer that proves the user-visible behavior; move up only when the lower layer would hide the real risk.

## Reporting evidence

When a behavior-changing task is done, state: what changed, which test/scenario proves it, the command that ran it, and the report path if one was generated. If no behavior test was added, say why in one sentence — don't leave it implicit.

## Do not

- Chase a coverage percentage by testing boilerplate (getters, DTOs, framework wiring).
- Mock the unit under test.
- Assert a whole struct when one field is the actual contract.
- Write Gherkin for a private helper or generated code — it adds ceremony with no audience.
- Leave a skipped or flaky test without an owner and a reason.
- Treat "MVP" as license to skip auth/money/permissions/data-loss coverage.

## Verify

State in the plan or PR: testing mode chosen (MVP or existing-service), the test(s) written first, anything deliberately deferred, and the command used to run them.
