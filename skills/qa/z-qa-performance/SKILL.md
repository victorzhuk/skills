---
name: z-qa-performance
description: "Load and throughput testing with the project’s runner. Use for load tests, latency thresholds, API throughput, or SLA validation. Choose user-count or arrival-rate workloads, gate business checks, and bound generated traffic. Single-request contracts belong to [[z-qa-api]]; page rendering performance belongs to the web-performance skill."
---

# Load and throughput testing

Choose the workload and success contract before choosing a tool. Reuse the project's load runner and targets.

## Establish the experiment

Record target, authorization, expected traffic, test data, duration, concurrency/rate limits, and cleanup. Derive latency/error thresholds from the service's requirements or an explicit experiment; example numbers are not universal SLAs.

Use existing k6 or Locust scripts when appropriate. Do not reject another established tool based on unrelated project history.

## Choose the workload model

| Question | Model |
|---|---|
| Fixed number of active users | Closed model: VUs with realistic pacing |
| Independent request/arrival rate | Open model: constant or ramping arrival-rate executor |
| Multiple journeys | Named scenarios with separate rates or user populations |

A single arrival-rate workload already warrants a named scenario. Closed models reduce offered load as responses slow, which can hide overload. For open models, bound allocated VUs and inspect `dropped_iterations`.

Use think time when modeling users. Do not add sleep to an arrival-rate executor merely to control rate; the executor schedules arrivals.

## Gate business checks

Failed k6 `check()` calls alone do not fail the process. Add a threshold for the checks metric or aggregate every business failure consistently.

This illustrative smoke contract requires HTTP 200 and a JSON status of `ok`. Replace the URL and contract with the verified service behavior:

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

For a multi-branch journey, gate assertions from every branch. A request returning 200 when creation requires 201 is a business failure even if the HTTP failure metric accepts it.

Separate endpoint latency using tags or metrics when an aggregate can hide a slow critical operation. Check adequate sample counts before interpreting p99.

## Execution

- Run through the repository wrapper with a whole-process deadline, workload duration, request timeouts, and concurrency/rate caps.
- Verify the target is authorized for the chosen load. Do not infer production permission from access.
- Validate required environment variables before generating traffic.
- Keep credentials out of CLI arguments and output where the existing secret mechanism permits it.
- Retain the runner's exit status and summary; do not replace it with a parser's success.
- Use the installed version's summary schema. Prefer its supported summary mechanism, such as `handleSummary`, and verify fields before parsing.

For non-HTTP workloads, inspect protocol/client support before selecting a tool. Locust's custom `User` and client request events can measure worker/queue operations. Set runtime and user/rate caps, use a monotonic clock, and record actual payload bytes if size matters.

Locust's failure status policy must match the intended threshold. Use its supported exit-code configuration or an `events.quitting` listener; console/CSV output alone is not a pass/fail assertion.

## Verify

- Healthy fixture passes; wrong success status, invalid body, and failed business checks fail.
- All journeys contribute to the intended failure gate.
- The run reaches the planned offered load; dropped work and generator saturation are reported.
- Thresholds, effective limits, sample counts, exit status, and cleanup outcome are recorded.

## References

- [k6 checks](https://grafana.com/docs/k6/latest/using-k6/checks/).
- [Open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).
- [k6 summary options](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/).

See [[z-testing-strategy]], [[z-qa-api]], [[z-qa-orchestrator]].
