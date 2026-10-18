---
name: z-tdd
description: Red-green loop discipline that produces tests worth keeping — tests at pre-agreed seams through public interfaces, expected values from an independent source of truth, one vertical slice per cycle. Use when building a feature or fixing a bug test-first. Triggers on "TDD", "red-green-refactor", "test-first", "failing test", "tracer bullet". Does not choose test depth; see [[z-testing-strategy]]. Go mechanics belong to [[z-go-testing]].
---

# TDD

TDD is the red → green loop. This is the reference that makes the loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Apply every section on every cycle, not after.

Apply this loop when test-first is the chosen flow. Preserve an approved tests-after flow rather than changing it. Read the project's authoritative glossary/spec record so test names match domain language, and respect recorded decisions.

## What a good test is

Tests verify behaviour through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" names the capability — and survives refactors because it doesn't care about internal structure.

## Seams — where tests go

A **seam** is the public boundary you test at: where behaviour is observable without reaching inside ([[z-deep-modules]]).

**Use the agreed seams.** Existing caller approval or a dispatch plan is sufficient. Follow [[z-testing-strategy]] for acceptance boundaries and residual-risk exceptions. The red-green loop can run through a public product boundary. Resolve genuinely missing seam decisions before expanding scope. Under zapply, report an unlisted seam to the driver rather than asking the user from the worker.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks on refactor while behaviour is unchanged.
- **Tautological** — the assertion recomputes the expected value the way the code does, so it passes by construction and can never disagree with the code. Expected values come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify *imagined* behaviour and freeze test structure before the implementation teaches you anything. Work in **vertical slices**: one test → one implementation → repeat, each test a tracer bullet responding to what the last cycle taught. A zapply red stage is not this anti-pattern: there the plan's behavior contract already closed the design, and bulk-writing the chunk's contract tests against it is the mandate.

## Rules of the loop

- **Red before green.** Failing test first, then only enough code to pass it. Watch it fail — a test that never went red proves nothing.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle. No speculative features.
- **Refactoring is a separate stage.** It happens after green with the tests as a net, never mid-cycle. Under a zapply seal — the caller's sealed contract tests — stop at green; refactoring beyond the chunk belongs to the caller's review floor.

## Do not

- Expand beyond caller-approved seams without resolving the scope change.
- Compute the expected value with the same logic as the code under test.
- Write the implementation first and back-fill a passing test.
- Bulk-write tests for behaviour that doesn't exist yet (outside a zapply red stage, where the sealed contract mandates it).
- Refactor while red.

## Verify

- Every new test failed once before its implementation existed.
- Tests reference the approved seam. Use the public interface by default; an internal test is acceptable for a named invariant that is not externally distinguishable. Never couple assertions to incidental call order or private layout.
- The seams under test were named and confirmed before the first test.

see [[z-testing-strategy]], [[z-deep-modules]], [[z-go-testing]], [[z-verify-before-done]]
