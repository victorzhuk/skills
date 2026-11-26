---
name: z-tdd
description: "Use red-green-refactor to implement behavior through a public interface. Write a failing test, make it pass, and preserve the contract during refactoring. See [[z-bdd]] for acceptance scenarios."
---

# Test-driven development

Use this procedure when test-first is the agreed sequence. Preserve a caller-approved tests-after sequence.

## Select the behavior

Read the requirement and the project's domain terms. Name one observable outcome and the public interface that exposes it.
Use [[z-testing-strategy]] for acceptance boundaries and residual risks. An internal test needs a named invariant that external tests cannot distinguish.
Preserve the caller's approved interfaces. Resolve a missing scope decision before adding another one.

## Run one cycle

1. **Red.** Write a test for the expected behavior. Derive its expected value from the requirement or an independent worked example.
2. Run the test. Observe failure for the expected reason. Fix unrelated setup errors before proceeding.
3. **Green.** Implement only the behavior needed for the test. Run the test again.
4. **Refactor.** Improve structure within scope while the tests pass. Repeat for the next behavior.

When a caller assigns separate contract-test and implementation stages, follow that sequence.
A pre-agreed batch of contract tests can cover one assigned change. Preserve sealed tests and stop at the assigned stage.

## Verify

Record the observed failure and passing result. An internal refactor that preserves the public behavior should still pass the same test.
Avoid assertions about incidental call order, private layout, or a calculation copied from the implementation.
See [[z-deep-modules]], [[z-go-testing]], and [[z-verify-before-done]].
