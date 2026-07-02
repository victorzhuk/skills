---
name: z-qa-performance
description: "Load and throughput testing with k6 — flat vus/duration or stages for the load shape, http_req_duration percentile thresholds, http_req_failed rate gating, wired through Makefile targets (test-load-smoke/test-load/test-load-stress/test-load-spike). Locust covers non-HTTP/worker-queue load k6 can't reach (worker and callback simulation). Auto-activates for: load testing, performance benchmarks, latency profiling, SLA validation, API throughput testing. Does not cover Core Web Vitals; see [[core-web-vitals]]. Does not cover single-request API contract checks; see [[z-qa-api]]."
---

# Performance QA Skill

## Philosophy

k6 is the one real load-testing tool in this codebase — wired through Makefile targets (`test-load-smoke`, `test-load`, `test-load-stress`, `test-load-spike`) and one CI workflow. Define SLAs as k6 `thresholds`; that's the native gate, no external script needed.

Real scripts stay flat: `vus` + `duration` for a fixed load level, or a `stages` array for a ramp — both sit directly on `options`. k6 also supports named `scenarios{ executor: ... }` blocks, but nothing here uses them; treat that as an advanced, rarely-needed shape, not the default.

Locust fills the gap k6 doesn't reach: worker/queue-style load with no single HTTP request to hammer — background job processing, callback delivery. That's the real pattern behind `worker_simulation.py` and `callback_client.py`.

## Install

```bash
# k6
brew install k6
# or: apt install k6

# Locust (Python)
pip install locust
```

## k6 — smoke (flat vus/duration)

Maps to `test-load-smoke` — a couple of VUs, short duration, a quick pass/fail before a bigger run.

```javascript
// tests/perf/smoke.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
```

## k6 — load / regression (stages + thresholds)

Maps to `test-load`. Thresholds are the SLA — the run fails on its own when they're violated.

```javascript
// tests/perf/load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency', true);

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.05'],
    api_latency: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';

export default function () {
  const headers = { Authorization: `Bearer ${__ENV.API_TOKEN}` };
  const choice = Math.random();

  if (choice < 0.6) {
    const res = http.get(`${BASE_URL}/products`, { headers });
    check(res, { 'products 200': (r) => r.status === 200 });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  } else if (choice < 0.9) {
    const res = http.get(`${BASE_URL}/products/1`, { headers });
    check(res, { 'product 200': (r) => r.status === 200 });
  } else {
    const res = http.post(
      `${BASE_URL}/cart`,
      JSON.stringify({ productId: 1, quantity: 1 }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
    check(res, { 'cart 201': (r) => r.status === 201 });
  }

  sleep(1);
}
```

## k6 — stress and spike (stages, pushed harder)

Same `stages` shape, different curve. Maps to `test-load-stress` (ramp up and hold at a high plateau to find where thresholds start failing) and `test-load-spike` (slam to a burst, then recover):

```javascript
// tests/perf/spike.js
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // warm up
    { duration: '30s', target: 500 },  // spike
    { duration: '10s', target: 10 },   // recover
    { duration: '30s', target: 10 },   // observe recovery
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],    // tolerate more errors during the spike
    http_req_duration: ['p(95)<2000'], // relaxed SLA during the spike
  },
};
```

`tests/perf/stress.js` reuses this shape but keeps ramping up and holding instead of spiking and recovering.

## k6 CLI commands

```bash
# run a script
k6 run tests/perf/load.js

# with environment vars
k6 run -e BASE_URL=https://staging.api.example.com \
       -e API_TOKEN=$TOKEN \
       tests/perf/load.js

# quick override for a one-off smoke run
k6 run --vus 1 --iterations 1 tests/perf/load.js

# JSON output for post-processing
k6 run --out json=results/k6-output.json tests/perf/load.js

# parse thresholds/percentiles out of the JSON
jaq '.metrics.http_req_duration.values | {p50: .["p(50)"], p95: .["p(95)"], p99: .["p(99)"]}' \
  < results/k6-output.json
```

## Makefile wiring

```makefile
test-load-smoke:
	k6 run tests/perf/smoke.js

test-load:
	k6 run tests/perf/load.js

test-load-stress:
	k6 run tests/perf/stress.js

test-load-spike:
	k6 run tests/perf/spike.js
```

One CI workflow calls these targets. Keep the gate in the script's own `thresholds` — don't bolt an external pass/fail check onto the Makefile target.

## Advanced: named scenario executors (optional)

k6 supports a `scenarios{}` block with named executors (`constant-vus`, `ramping-vus`, `constant-arrival-rate`, `ramping-arrival-rate`, …) for running multiple independent workloads in one test. Real k6 feature, but no script in this codebase uses it — reach for it only when a single flat/staged `options` block genuinely can't express two concurrent workloads:

```javascript
export const options = {
  scenarios: {
    browse_products: {
      executor: 'constant-vus',
      vus: 30,
      duration: '3m',
      exec: 'browseProducts',
    },
    checkout_flow: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 20,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
      ],
      exec: 'checkout',
    },
  },
};

export function browseProducts() { /* ... */ }
export function checkout() { /* ... */ }
```

## Locust — non-HTTP / worker-queue load

A queue worker or callback-delivery service has no single HTTP endpoint to hammer, so k6's http-first model doesn't fit. Locust's plain `User` class (not `HttpUser`) plus a custom client covers that shape — wrap the project's own client, call it from a `@task`, and fire a `request` event yourself so Locust can report timing and failures:

```python
# worker_simulation.py
import time
from locust import User, task, between

import callback_client


class WorkerClient:
    def __init__(self, environment):
        self.environment = environment

    def deliver(self, payload):
        start = time.time()
        try:
            callback_client.send(payload)
        except Exception as exc:
            self.environment.events.request.fire(
                request_type="callback", name="deliver",
                response_time=(time.time() - start) * 1000,
                response_length=0, exception=exc,
            )
        else:
            self.environment.events.request.fire(
                request_type="callback", name="deliver",
                response_time=(time.time() - start) * 1000,
                response_length=len(payload),
            )


class WorkerUser(User):
    wait_time = between(1, 3)

    def on_start(self):
        self.client = WorkerClient(self.environment)

    @task
    def deliver_callback(self):
        self.client.deliver({"event": "order.created"})
```

```bash
locust -f worker_simulation.py --headless -u 50 -r 10 -t 5m --csv results/worker
```

Maps to the `load-test-worker` Makefile target. Locust has no k6-style `thresholds` block — for an explicit pass/fail gate, add an `events.quitting` listener that sets `environment.process_exit_code`, don't reach for an external script.

## Do not

- Add oha, vegeta, hey, hyperfine, or Lighthouse CLI — none are used anywhere here; k6 covers HTTP load and SLA gating, Locust covers non-HTTP.
- Build an external SLA-gating script (`bc`/`jaq` post-processing over a benchmark's JSON) — k6's own `thresholds` already fail the run natively.
- Reach for `scenarios{ executor: ... }` as the default shape — flat `vus`/`duration` or `stages` covers every real script here.
- Use `--vus` without think time (`sleep()` in k6, `wait_time` in Locust) — produces bursty, unrealistic traffic.
- Ignore p99 latency — outliers are what break user experience, not the median.
- Load test production directly — stick to staging or a rate-limit-safe path.

## Verify

- `thresholds` fail the k6 run natively on `http_req_duration`/`http_req_failed` — no separate script needed to gate CI.
- A Locust run's pass/fail comes from its own console/`--csv` output or an `events.quitting` listener, not a wrapper script.
- Every load script stays wired to its Makefile target (`test-load-smoke`/`test-load`/`test-load-stress`/`test-load-spike` for k6, `load-test-worker` for Locust) so the CI workflow stays the source of truth, not an ad hoc invocation.
