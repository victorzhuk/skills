# Gherkin Style

A feature file is a behavior contract. It must be readable by product, engineering, QA, support, and automation.

## Shape

```gherkin
@domain @risk @story:ID @type:integration
Feature: Capability name
  As a role
  I want a capability
  So that an outcome is possible

  Background:
    Given shared precondition

  Scenario: Specific observable behavior
    Given initial state
    When actor performs one action
    Then observable outcome exists
    And related observable outcome exists
```

## Rules

- One scenario covers one behavior.
- Use concrete values over vague terms.
- Keep steps stable across UI/API implementation changes.
- Put only repeated, non-decisive setup in `Background`.
- Use `Scenario Outline` when the examples are part of the requirement, not to compress unrelated cases.
- Name scenarios by outcome: `Gateway timeout leaves order pending`, not `Test retry handler`.
- Express errors as the actor sees them: `Then checkout is rejected as "card expired"`.
- Keep `Then` steps observable: persisted state, response, event, email, audit record, external call.

## Step semantics

| Keyword | Job | Avoid |
|---|---|---|
| `Given` | Prepare state | Hidden assertions, business action under test |
| `When` | Perform one action | Multiple actions, setup |
| `Then` | Assert outcome | Implementation detail, polling without timeout |
| `And` | Continue previous keyword | New phase disguised as continuation |

## Tags

Put tags above the `Feature` when every scenario inherits them. Put tags above a `Scenario` for risk, story, or type differences.

```gherkin
@billing @critical @story:PAY-241 @type:integration
Scenario: Gateway timeout leaves order pending
```

## Good

```gherkin
Scenario: Gateway timeout leaves order pending
  Given the payment gateway times out during capture
  When a customer checks out an order for 100 cents
  Then the order remains pending
  And payment capture is retried 3 times
```

## Bad

```gherkin
Scenario: Test CapturePayment retries
  Given row in payments table has status pending
  When CapturePaymentUseCase.Execute is called
  Then retry_count column equals 3
```

The bad version mirrors implementation. It will drift when the code is renamed without behavior changing.
