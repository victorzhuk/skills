---
name: z-qa-browser
description: "Autonomous browser testing with playwright-cli, a ref-based token-efficient CLI for agents — snapshot once, then click/fill by ref (e5), not by selector. Auto-activates for: E2E tests, browser automation, UI testing, visual regression, screenshot capture, web flows. Does not cover HTTP-only contract testing; see [[z-qa-api]]. Does not cover WCAG remediation; see the accessibility skill."
---

# Browser QA Skill

`playwright-cli` is a project-local CLI, not a published npm package — the exact binary and full command surface live in the target repo. Run `playwright-cli --help` there before relying on any flag not listed below.

## Philosophy

Snapshot-first, ref-based. Every command auto-prints a Snapshot (a ref-tagged element tree — `e1`, `e2`, …) after it runs. Read the refs, then target the next command by ref: `click e5`, `fill e5 "value"`.

`--raw` suppresses the auto-printed Snapshot on that one call. That's the real token lever — not avoiding snapshots. You still need a Snapshot before you can act; you just don't need to reprint it on every follow-up call once you already have the refs you're going to use.

There are no `assert-*` commands. Assertions are hand-written `expect()` calls in the generated `.spec.ts` file, run through `npx playwright test`.

## Core Commands

```bash
# Navigation
playwright-cli open https://app.example.com
playwright-cli open https://app.example.com --raw          # suppress the snapshot dump

# Interaction — targets are refs from the last Snapshot, never CSS selectors
playwright-cli click e5
playwright-cli fill e5 "user@test.com"

# Sessions (persistent browser state across commands)
playwright-cli -s=myapp open https://app.example.com
playwright-cli -s=myapp fill e3 "value"
playwright-cli list                                         # list open sessions
playwright-cli close-all                                    # close all sessions
playwright-cli kill-all                                     # kill all sessions/processes

# Network
playwright-cli route "*/api/users" --body '{"users":[]}'
playwright-cli unroute "*/api/users"

# Storage (cookies + localStorage)
playwright-cli state-save ./auth.json
playwright-cli state-load ./auth.json
```

## Selectors — a different layer

CLI targeting is by ref (`e5`), pulled straight from the Snapshot — no selector strategy needed there. Selectors matter one layer up: when hand-writing locators and `expect()` assertions into the generated `.spec.ts` file, prefer `text=`, `role=`, or `data-testid=` over brittle CSS (confirmed pattern in real projects).

## Running Generated Tests

```bash
npx playwright test --reporter=line
npx playwright test --reporter=html
npx playwright test --shard=1/3      # parallel CI, run all three shards
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

## Common Flows

### Login -> action -> verify
```bash
playwright-cli -s=e2e open https://app.example.com/login
# Snapshot printed: e3 = email input, e4 = password input, e5 = submit button
playwright-cli -s=e2e fill e3 "qa@test.com"
playwright-cli -s=e2e fill e4 "secret"
playwright-cli -s=e2e click e5
# Snapshot after the click shows the dashboard rendered — write that expectation
# into the .spec.ts, the CLI itself won't assert it.
```

### Auth reuse across runs
```bash
playwright-cli -s=e2e open https://app.example.com/login
playwright-cli -s=e2e fill e3 "qa@test.com"
playwright-cli -s=e2e fill e4 "secret"
playwright-cli -s=e2e click e5
playwright-cli -s=e2e state-save ./test-output/auth.json

# later runs
playwright-cli -s=e2e state-load ./test-output/auth.json
playwright-cli -s=e2e open https://app.example.com/protected-page
```

### API mock + UI check
```bash
playwright-cli open https://app.example.com
playwright-cli route "*/api/products" --body '{"products":[{"id":1,"name":"Test Product"}]}'
playwright-cli open https://app.example.com/products        # reload under the mock
# confirm "Test Product" in the Snapshot, then write the expect() in the .spec.ts
```

## Visual regression (rare)

No project here does automated visual regression — nothing runs pixelmatch, shot-scraper, axe-core CLI, or ImageMagick diffing, and one API-only service explicitly ruled it out of scope already. Treat this as a deliberate gap, not something to backfill by default.

If a project genuinely needs it, reach for Playwright's own `toHaveScreenshot()` — it's already the E2E tool above, no new dependency:

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test('home page visual regression', async ({ page }) => {
  await page.goto('https://app.example.com');
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  });
});
```

```bash
npx playwright test --update-snapshots   # capture/update baselines
npx playwright test tests/visual.spec.ts
```

## Do not

- Target the CLI with CSS selectors (`button[data-testid=...]`) — there's no selector engine here, only refs from the Snapshot.
- Invoke `assert-*` — it doesn't exist. Put expectations in the `.spec.ts` file.
- Treat `--raw` as "skip snapshotting" — it only suppresses the print on that call; you still snapshot to get refs before acting.
- Run headed in CI — keep CI runs headless.
- Share one global session across parallel test suites — give each suite its own `-s=` session.
- Hardcode `sleep()` between navigation and interaction — resolve the flow through the Snapshot instead.
- Introduce pixelmatch, shot-scraper, axe-core CLI, or ImageMagick for visual regression — `toHaveScreenshot()` covers the real need.
- Add visual regression to an API-only service — it was explicitly scoped out once already; don't reopen that without asking.
- Assume automated accessibility CI checks are existing convention — the real practice here is a manual DevTools spot-check.
- Compare screenshots without tolerance — bare pixel-equality breaks on font antialiasing; use `maxDiffPixels`/`threshold`.

## Verify

- `playwright-cli --help` matches the commands you're about to script — this doc mirrors observed usage in real projects, not a published spec.
- `npx playwright test --reporter=line` passes for a written flow before treating it as a regression guard.

See [[z-go-bdd]] for turning a verified flow into a behavior contract and [[z-qa-api]] for HTTP-only contract checks that don't need a browser.
