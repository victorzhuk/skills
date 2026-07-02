---
name: z-qa-visual
description: "Visual regression testing via Playwright's built-in toHaveScreenshot(). Not in active use anywhere in this codebase — no project runs pixelmatch, shot-scraper, axe-core CLI, or ImageMagick diffing, and one API-only service explicitly ruled visual regression out of scope. Use only when visual regression is genuinely needed; start with toHaveScreenshot() since Playwright is already the real E2E tool — see [[z-qa-browser]] for that setup. Auto-activates for: visual regression, screenshot diff, golden files, UI appearance testing. Does not cover WCAG remediation guidance — see [[accessibility]]."
---

# Visual QA

## Status

No project here does automated visual regression. Nothing runs pixelmatch/pngjs, shot-scraper, axe-core CLI as a CI check, or ImageMagick diffing. One design doc explicitly rejected visual regression as out of scope for an API-only service. Treat this as a real, deliberate gap, not an oversight to backfill by default.

If a project genuinely needs visual regression, don't reach for a custom pixel-diff script or a new CLI dependency. Playwright is already the real E2E tool in every repo that has a frontend (see [[z-qa-browser]]), and it ships visual comparison built in.

## toHaveScreenshot()

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

test('product card component', async ({ page }) => {
  await page.goto('https://app.example.com/products');
  const card = page.locator('.product-card').first();
  await expect(card).toHaveScreenshot('product-card.png');
});
```

```bash
# capture/update baselines
npx playwright test --update-snapshots

# run visual tests
npx playwright test tests/visual.spec.ts
```

"Golden files" here means image baselines (the `.png` snapshots above) — unrelated to the Go `text`/JSON golden-file convention used for snapshot-testing serialized output elsewhere in this codebase.

## Accessibility

The real a11y practice found in this codebase is a manual DevTools spot-check, not an automated CI gate. Don't wire `axe-core` or any a11y linter into a pipeline on the assumption it's standard practice here — it isn't. For WCAG remediation guidance, see [[accessibility]].

## Do not

- Introduce pixelmatch, shot-scraper, axe-core CLI, or ImageMagick — no project uses them; `toHaveScreenshot()` covers the real need.
- Add visual regression to an API-only service — it was explicitly scoped out once already; don't reopen that without asking.
- Assume automated a11y CI checks are existing convention — the real pattern is manual.
- Compare screenshots without tolerance — bare pixel-equality breaks on font antialiasing; use `maxDiffPixels`/`threshold`.

## Verify

- `.png` baselines under `tests/` or `*-snapshots/` are committed and reviewed like code, not regenerated blindly with `--update-snapshots` to silence a failure.
- Any new visual test justifies itself against [[z-qa-browser]]'s existing Playwright setup instead of adding a parallel toolchain.
