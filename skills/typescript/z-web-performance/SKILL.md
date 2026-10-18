---
name: z-web-performance
description: Own page-rendering performance and Core Web Vitals - LCP, INP, CLS thresholds, the field/lab/RUM evidence split, and regression attribution. Use for Core Web Vitals, LCP, INP, CLS, page rendering performance, field data. Load and throughput belong to [[z-qa-performance]]; accessibility to [[z-accessibility]].
---

# Web performance

Diagnose and improve page-rendering performance against Core Web Vitals, using the strongest available evidence and attributing regressions to a specific change.

## Metrics and thresholds

Source: web.dev/articles/vitals (Core Web Vitals), verified 2026-10-18.

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | <= 2.5 s | 2.5 s - 4.0 s | > 4.0 s |
| INP (Interaction to Next Paint) | <= 200 ms | 200 ms - 500 ms | > 500 ms |
| CLS (Cumulative Layout Shift) | <= 0.1 | 0.1 - 0.25 | > 0.25 |

Assess each metric at the 75th percentile across page views, per device class (mobile and desktop separately).

## Evidence hierarchy

Ordered strongest first for proving user experience. Use the strongest source available; state which one a claim rests on.

1. **CrUX field p75** - real Chrome users, aggregated per origin or URL. Proves the field outcome for eligible traffic. Cannot attribute a regression to a cause; no per-user detail; low-traffic URLs are absent.
2. **First-party RUM** - your own instrumentation on real users. Proves attribution (page, template, resource, device) and covers traffic CrUX excludes. Needs volume: a p75 from a handful of sessions is noise, not a result.
3. **Lab trace** - Lighthouse, WebPageTest, DevTools performance trace. Reproducible and debuggable under controlled conditions. Proves mechanics (long tasks, render-blocking resources, layout shifts), never the field outcome - synthetic hardware, cache, and network conditions are not your users'.
4. **Static source inspection** - bundle size, image format, font loading, code shape. Generates hypotheses only; proves nothing about any metric.

A lab score alone never proves a field outcome. A single-user sample never proves a p75. Say which evidence class every claim comes from.

## Regression attribution

- Bisect by deployment, not by guess: compare the metric across the deploy boundary where the regression appeared, then narrow through intermediate deploys or flags until one change flips it.
- Compare the same metric, same aggregation (p75), same device class, before and after the change. Do not compare lab-before against field-after.
- Name the measurement window (start, end) and the device class in every attribution claim. Short windows and device mixing manufacture and hide regressions.
- Confirm the attribution by predicting the recovery: after reverting or fixing the named change, the metric returns to baseline within a comparable window.

## Do not

- Reporting a Lighthouse score as the field result.
- Optimizing a metric without a baseline measurement first.
- Treating a synthetic run as a user-experience threshold.
- Claiming a fix without a post-change measurement of the same metric from the same evidence class.
- Averaging percentiles across pages or devices; a mean of p75s is not a p75.

## Verify

- Baseline exists: the metric value, source (CrUX/RUM/lab), window, and device class are recorded before any optimization.
- Threshold check: report LCP, INP, and CLS each as good / needs improvement / poor against the table above, at p75, per device class.
- Attribution check: the named change, the deploy boundary, and the before/after numbers for the same metric and window are all stated.
- Improvement check: post-change measurement from the same evidence class shows the metric moved, with the window and sample size stated.
- Cross-check: at least one lab or source-level finding explains the field delta mechanically; a field delta with no mechanical story is an open question, not a closed fix.

## Boundaries

- Load testing, throughput, and server latency under generated traffic belong to [[z-qa-performance]].
- Accessibility conformance belongs to [[z-accessibility]].
- React render-cost mechanics (memoization, derived state, transitions) belong to [[z-react-core]].
- Visual implementation, motion, and layout of the fixes belong to [[z-interface-kit]].
