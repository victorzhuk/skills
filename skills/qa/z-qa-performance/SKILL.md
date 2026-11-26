---
name: z-qa-performance
description: "Design and run a bounded load test. Use for traffic models, latency percentiles, throughput, k6 thresholds, or Locust business failures. See [[z-web-performance]] for browser rendering."
---

# Load and throughput testing

Choose the workload and success contract before choosing a tool. Reuse the project's load runner and targets.

## Establish the experiment

Record the target, authorization, traffic, data, duration, concurrency, and cleanup plan. Derive latency and error thresholds from service requirements or the stated experiment.

Use existing k6 or Locust scripts when appropriate. Do not reject another established tool based on unrelated project history.

## Choose the workload model

| Question | Model |
|---|---|
| Fixed number of active users | Closed model: VUs with realistic pacing |
| Independent request/arrival rate | Open model: constant or ramping arrival-rate executor |
| Multiple journeys | Named scenarios with separate rates or user populations |

A single arrival-rate workload already warrants a named scenario. Closed models reduce offered load as responses slow, which can hide overload. For open models, bound allocated VUs and inspect `dropped_iterations`.

Model user think time only when it belongs to the journey. An arrival-rate executor already schedules iteration starts.

## Gate business checks

Define a threshold for business checks. A failed k6 `check()` alone does not set a failing exit status.

This example requires HTTP 200 and a JSON `status` of `ok`. Set the URL and pass criteria for the service under test.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get(__ENV.HEALTH_URL, { timeout: '10s' });
  let status;
  try {
    status = res.json('status');
  } catch {
    status = undefined;
  }
  check(res, {
    'healthy response': () => res.status === 200 && status === 'ok',
  });
  sleep(1);
}
```

Assert each branch's business outcome. If creation requires HTTP 201, HTTP 200 must fail the check.

Separate endpoint latency using tags or metrics when an aggregate can hide a slow critical operation. Check adequate sample counts before interpreting p99.

## Execution

- Run through the repository wrapper with a whole-process deadline, workload duration, request timeouts, and concurrency/rate caps.
- Check that the caller authorized this target and load. Access alone does not authorize production traffic.
- Check required environment variables before sending traffic.
- Keep credentials out of CLI arguments and output where the existing secret mechanism permits it.
- Retain the runner's exit status and summary when parsing output.
- Use the installed version's summary schema. Prefer its supported summary mechanism, such as `handleSummary`, and check fields before parsing.

For non-HTTP workloads, inspect protocol/client support before selecting a tool. Locust's custom `User` and client request events can measure worker/queue operations. Set runtime and user/rate caps, use a monotonic clock, and record actual payload bytes if size matters.

Set the Locust exit policy to reflect the required failure threshold. Use the installed exit-code settings or an `events.quitting` listener. Inspect exit status alongside the report.

## Check the run

- The healthy case passes. A wrong status, invalid body, or failed business assertion fails the run.
- All journeys contribute to the intended failure gate.
- Report achieved load, dropped work, and generator saturation.
- Record thresholds, effective limits, sample counts, exit status, and cleanup outcome.

## References

- [k6 checks](https://grafana.com/docs/k6/latest/using-k6/checks/).
- [Open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).
- [k6 summary options](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/).

See [[z-testing-strategy]], [[z-qa-api]], [[z-qa-orchestrator]].
