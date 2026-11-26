---
name: z-qa-api
description: "Test API journeys through a running service. Use for REST contracts, authentication, Go handlers, or dependency fixtures. See [[z-bdd]] for acceptance and [[z-qa-browser]] for browser journeys."
---

# API testing

Discover the service's test runner and existing contract-test style. Use [[z-bdd]] for acceptance through the running service's public protocol.
Exercise real application wiring and required dependencies. A health response alone does not prove a business journey.
Add handler or dependency integration tests only for named residual risks per [[z-testing-strategy]]. Preserve existing tests.

## Handler contracts

Use `net/http/httptest` with the repository's assertion library. Check status, relevant headers, response shape, and caller-visible error behavior.

Cover authentication and resource authorization separately. A 200 response alone does not establish correct data or permissions.

Use `httptest.NewServer` when the network/client interaction is part of the contract. A recorder proves handler behavior without a network hop.

## Integration setup

Inspect existing fixtures, build tags, and wrappers before adding testcontainers, compose, or another mechanism. Match the database version and migration path used by the project.

If the project uses short-mode guards, put one in each integration entry point before accessing its fixture:

```go
func TestIntegrationStore(t *testing.T) {
    if testing.Short() {
        t.Skip("requires database")
    }

    // Create the existing fixture and exercise its public contract here.
}
```

`TestIntegration` naming alone does not skip tests. A `TestMain` branch that calls `m.Run()` still executes selected tests. If short mode omits shared setup, all dependent tests must skip before using it.

- Bound dependency startup and connection attempts.
- Check container startup, connection-string, migration, pool-creation, and readiness errors.
- Register cleanup immediately after each successful allocation. Close clients before terminating containers.
- Isolate records or transactions across tests. Do not share mutable test state accidentally.
- Keep Ryuk enabled by default. Disable it only for a documented CI limitation with an alternative cleanup mechanism.
- Run short mode without external services. Then run the actual integration target with its dependencies.

## Live smoke checks

Select the intended test service. Use its established HTTP client, test credentials, and controlled fixtures.

For a service whose documented healthy response is HTTP 200 with `{"status":"ok"}`, this shell example checks both transport and body:

```bash
set -o pipefail
response=$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  --write-out '\n%{http_code}' "$HEALTH_URL") || exit 1
code=${response##*$'\n'}
body=${response%$'\n'*}
[ "$code" = 200 ] || exit 1
printf '%s' "$body" | jq -e '.status == "ok"' >/dev/null
```

Set `HEALTH_URL` from the verified target. This Bash example expects status 200 and the documented JSON value. A substring check would also match `unhealthy`.

A declarative tool such as Hurl is appropriate when already adopted. Do not add it merely to replace working repository tests.

## Do not

- Count an unexpected status as a pass. A rejection test must assert its expected error response.
- Ignore errors during fixture setup.
- Disable cleanup globally to hide a container startup failure.
- Copy real tokens, credentials, or sensitive responses into committed fixtures.
- Assume all Go services provision dependencies in the same way.

## Check the results

Run the repository's bounded handler and integration targets. Exercise an unexpected status, invalid body, unauthorized request, and unavailable dependency. Assert the expected result in each case. Report scope and unavailable external checks.

[TestMain](https://pkg.go.dev/testing#hdr-Main), [Testcontainers cleanup](https://golang.testcontainers.org/features/garbage_collector/).

See [[z-go-testing]], [[z-testing-strategy]], [[z-qa-debugger]], [[z-qa-browser]], [[z-qa-performance]].
