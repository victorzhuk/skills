---
name: z-tdd
description: Red-green loop discipline that produces tests worth keeping — tests at pre-agreed seams through public interfaces, expected values from an independent source of truth, one vertical slice per cycle. Use when building a feature or fixing a bug test-first. Triggers on "TDD", "red-green-refactor", "test-first", "failing test", "tracer bullet". Does not choose test depth; see [[z-testing-strategy]]. Go mechanics belong to [[z-go-testing]].
---

# TDD

TDD is the red → green loop. This is the reference that makes the loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Apply every section on every cycle, not after.

Before starting, read the project's glossary (`CONTEXT.md` or equivalent) so test names match domain language, and respect ADRs in the touched area.

## What a good test is

Tests verify behaviour through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" names the capability — and survives refactors because it doesn't care about internal structure.

## Seams — where tests go

A **seam** is the public boundary you test at: where behaviour is observable without reaching inside ([[z-deep-modules]]).

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. You can't test everything — agreeing seams up front is how effort lands on critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks on refactor while behaviour is unchanged.
- **Tautological** — the assertion recomputes the expected value the way the code does, so it passes by construction and can never disagree with the code. Expected values come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify *imagined* behaviour and freeze test structure before the implementation teaches you anything. Work in **vertical slices**: one test → one implementation → repeat, each test a tracer bullet responding to what the last cycle taught.

## Rules of the loop

- **Red before green.** Failing test first, then only enough code to pass it. Watch it fail — a test that never went red proves nothing.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle. No speculative features.
- **Refactoring is a separate stage.** It happens after green with the tests as a net, never mid-cycle.

## Do not

- Write a test at a seam the user hasn't confirmed.
- Compute the expected value with the same logic as the code under test.
- Write the implementation first and back-fill a passing test.
- Bulk-write tests for behaviour that doesn't exist yet.
- Refactor while red.

## Verify

- Every new test failed once before its implementation existed.
- Tests reference only the public interface — no private symbols, no side-channel assertions.
- The seams under test were named and confirmed before the first test.

see [[z-testing-strategy]], [[z-deep-modules]], [[z-go-testing]], [[z-verify-before-done]]
