---
name: z-qa-browser
description: "Browser QA through available host tools and the project’s Playwright runner. Use for E2E tests, browser exploration, visual regression, screenshots, or web flows. Verify current page state, meaningful assertions, and bounded execution. HTTP-only contracts belong to [[z-qa-api]]. WCAG remediation belongs to the accessibility skill."
---

# Browser QA

Use the host's browser tools or the project's installed browser runner. Inspect the active tool contract before choosing commands.

## Discover

- Read the app's start/test wrappers, Playwright configuration, existing specs, and approved target.
- Prefer native browser control when available. Use the installed CLI when the task needs it.
- Microsoft's published package is `@playwright/cli`; verify the installed distribution and version with local help.
- Do not assume a local command named `playwright-cli` has the same flags as another release.

## Explore with current state

Capture the page state before acting. Use observed refs or accessible locators. Refresh state after navigation or changes that invalidate the target.

Current Playwright CLI accepts snapshot refs, CSS, and Playwright locators. Prefer refs for inspected interactive exploration and role/test-id locators for maintained specs. Do not invent refs or selectors.

Snapshot output may link to a saved file instead of printing the full tree. Read the returned artifact. Verify output-control flags in the installed help rather than relying on a remembered `--raw` flag.

Use a named session for independent work. Close only sessions created for the task; global close/kill commands may disrupt unrelated work.

## Assert the journey

Record expected outcomes in the repository's Playwright specs when a regression test is requested. Use web-first `expect` assertions against meaningful state, not arbitrary sleeps.

Keep exploratory observations distinct from executable regression proof. A snapshot showing a dashboard is evidence for that moment, not an assertion that will run in CI.

For browser products, run acceptance against the running application using the scenario contract in [[z-bdd]].
Agents execute, investigate, and explore. Maintain repeatable scripts with explicit expected outcomes as the acceptance gate.
Do not weaken assertions or skip required scenarios while repairing locators or fixtures.

Exercise success, rejection, loading, and relevant empty/error states. Mock only dependencies outside the behavior under test. Register a route before triggering the request.

## Authentication and artifacts

Use existing test accounts and fixture conventions. Keep saved authentication state, screenshots, traces, and network payloads out of public commits when they contain secrets or private data.

Discover the configured state path instead of inventing one. Verify reuse does not bypass the auth behavior being tested.

## Visual and accessibility checks

Use Playwright's `toHaveScreenshot()` when visual regression serves the requested surface. Follow existing browser, font, viewport, and tolerance settings. Review baseline changes rather than blindly accepting them.

Do not infer that visual or accessibility testing is out of scope because a different project omitted it. Use the project's actual requirements and accessibility tooling.

## Run and verify

Use the project wrapper. Apply process deadlines, test/hook timeouts, and worker limits per [[z-testing-strategy]]. A CI shard still needs explicit effective bounds.

- Verify the target origin, session, and account.
- Run a written flow before calling it a regression guard.
- Report assertions, runner result, unavailable checks, and relevant artifacts.
- Confirm intentional negative cases fail rather than only observing happy-path success.

## References

- [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli).
- [Playwright assertions](https://playwright.dev/docs/test-assertions).
- [Authentication state](https://playwright.dev/docs/auth).

See [[z-qa-api]], [[z-qa-debugger]], [[z-go-bdd]].
