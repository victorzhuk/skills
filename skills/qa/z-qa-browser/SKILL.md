---
name: z-qa-browser
description: "Test browser journeys, accessible locators, Playwright assertions, or screenshot regressions. Use [[z-qa-api]] for HTTP-only contracts and [[z-accessibility]] for a WCAG audit."
---

# Browser QA

Use the host's browser tools or the project's installed browser runner. Inspect the active tool contract before choosing commands.

## Discover

- Read the app's start/test wrappers, Playwright configuration, existing specs, and approved target.
- Prefer native browser control when available. Use the installed CLI when the task needs it.
- Microsoft's CLI package is `@playwright/cli`. Check the installed distribution and version with local help.
- Do not assume a local command named `playwright-cli` has the same flags as another release.

## Explore with current state

Capture the page state before acting. Use observed refs or accessible locators. Refresh state after navigation or changes that invalidate the target.

Current Playwright CLI accepts snapshot refs, CSS, and Playwright locators. Prefer refs for inspected interactive exploration and role/test-id locators for maintained specs. Do not invent refs or selectors.

Snapshot output may link to a saved file instead of printing the full tree. Read the returned artifact. Check the installed help for output flags before using `--raw`.

Use a named session for independent work. Close only the sessions created for this task.

## Assert the journey

For requested regression coverage, record expected outcomes in the repository’s Playwright specs. Use web-first `expect` assertions on observable state.

Keep exploratory observations distinct from executable regression proof. A snapshot showing a dashboard is evidence for that moment, not an assertion that will run in CI.

Run maintained acceptance scenarios against the application with [[z-bdd]]. Preserve expected outcomes when repairing locators or fixtures.

Exercise success, rejection, loading, and relevant empty/error states. Mock only dependencies outside the behavior under test. Register a route before triggering the request.

## Authentication and artifacts

Use existing test accounts and fixture conventions. Keep saved authentication state, screenshots, traces, and network payloads out of public commits when they contain secrets or private data.

Read the storage path from configuration. Check that state reuse still exercises the authentication behavior under test.

## Visual and accessibility checks

Use Playwright's `toHaveScreenshot()` when visual regression serves the requested surface. Follow existing browser, font, viewport, and tolerance settings. Review baseline changes rather than blindly accepting them.

Do not infer that visual or accessibility testing is out of scope because a different project omitted it. Use the project's actual requirements and accessibility tooling.

## Run and check the result

Use the project wrapper. Apply process deadlines, test/hook timeouts, and worker limits per [[z-testing-strategy]]. A CI shard still needs explicit effective bounds.

- Check the target origin, session, and account.
- Run a written flow before calling it a regression guard.
- Report assertions, runner result, unavailable checks, and relevant artifacts.
- Exercise rejection paths. Assert the expected denial and the absence of protected side effects. Prove that a broken outcome fails the assertion.

## References

- [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli).
- [Playwright assertions](https://playwright.dev/docs/test-assertions).
- [Authentication state](https://playwright.dev/docs/auth).

Use [[z-qa-android]] for Android device control and native screenshots.

See [[z-qa-api]], [[z-qa-debugger]], [[z-go-bdd]].
