---
name: z-web-performance
description: "Measure LCP, INP, and CLS. Use Core Web Vitals field data, real-user monitoring, and lab traces to investigate regressions. See [[z-qa-performance]] for load tests."
---

# Core Web Vitals

## Classify field measurements

Use the 75th percentile for each metric. Separate mobile and desktop measurements. Record the URL or origin and the collection window.

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5 s | > 2.5 s and ≤ 4 s | > 4 s |
| INP | ≤ 200 ms | > 200 ms and ≤ 500 ms | > 500 ms |
| CLS | ≤ 0.1 | > 0.1 and ≤ 0.25 | > 0.25 |

Use unrounded measurements at the boundaries. [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

## Investigate a regression

1. Establish a field baseline. CrUX covers eligible Chrome traffic. Check whether the result represents a URL or its origin.
2. Use first-party real-user monitoring to compare affected routes, devices, resources, or releases. Record cohort size and sampling differences.
3. Use a controlled lab trace to investigate long tasks, rendering delays, or layout shifts. Source inspection can suggest mechanisms.
4. Test the proposed cause with a controlled comparison, rollback, or measured fix. A field correlation alone cannot establish causation.
5. Compare equivalent field windows after the change. Report evidence gaps when traffic or collection time is insufficient.

## Check the measurements

Report each metric, unit, percentile, device class, scope, source, and window. Include sample counts when available.
Use raw samples or a suitable distribution to combine populations. Averaging per-page percentiles gives a different statistic.
Report lab-only improvements separately until field measurements cover the changed release.

See [[z-qa-performance]] for service load, [[z-accessibility]] for conformance, [[z-react-core]] for rendering, and [[z-interface-kit]] for layout.
