---
name: z-qa-api
description: "API testing in Go: net/http/httptest for handler-level contract tests and testcontainers-go for real-boundary integration against a live Postgres. Auto-activates for: API testing, REST contract tests, handler test, endpoint health check, auth flow testing, testcontainers integration test. Does not cover browser/UI flows; see [[z-qa-browser]]. Does not cover load/throughput testing; see [[z-qa-performance]]."
---

# API QA Skill

## Philosophy

- `httptest` is the real anchor — `net/http/httptest` handler contract tests assert status/body/headers in-process, no live server, no network hop. This is the actual pattern across Go services: health checks, journeys, routers, all tested this way.
- `testcontainers-go` for real-boundary integration — self-provisions an ephemeral Postgres (`modules/postgres`), no docker-compose file or kubectl context to inspect. `TestIntegration*` naming, gated behind `testing.Short()`.
- `xh` + `jaq` for one-off ad-hoc calls against a running service.
- `curl | jq` is a real, legitimate smoke/health-check pattern in committed test scripts — not something to replace with a "proper" tool.
- `hurl` (`.hurl` files) is a viable declarative alternative for multi-step flows, but no project here actually uses it. Reach for it only if a team already committed to it, not by default.

## httptest — handler contract tests

```go
func TestReadinessHandler(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		pingErr    error
		wantStatus int
		wantBody   string
	}{
		{name: "healthy", wantStatus: http.StatusOK, wantBody: `{"status":"ok"}`},
		{name: "db down", pingErr: assert.AnError, wantStatus: http.StatusServiceUnavailable,
			wantBody: `{"status":"not_ready","checks":{"db":"down"}}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
			w := httptest.NewRecorder()
			ReadinessHandler(stubPinger{err: tt.pingErr}).ServeHTTP(w, req)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.JSONEq(t, tt.wantBody, w.Body.String())
		})
	}
}
```

`ServeHTTP` runs the handler in-process against `httptest.NewRecorder()` — no port binding. Table-driven per status/body combination; see [[z-go-testing]] for the general table-driven/testify pattern this builds on.

## testcontainers-go — real-boundary integration

```go
func TestMain(m *testing.M) {
	flag.Parse()
	if testing.Short() {
		os.Exit(m.Run())
	}

	ctx := context.Background()
	container, err := tcpostgres.Run(ctx, "postgres:16-alpine",
		tcpostgres.WithDatabase("app"),
		tcpostgres.WithUsername("postgres"),
		tcpostgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForListeningPort("5432/tcp").WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		panic("start postgres container: " + err.Error())
	}
	dsn, _ := container.ConnectionString(ctx, "sslmode=disable")
	runMigrations(ctx, dsn)

	testPool, _ = pgxpool.New(ctx, dsn)
	code := m.Run()
	testPool.Close()
	_ = testcontainers.TerminateContainer(container)
	os.Exit(code)
}
```

```bash
# CI: disable the Ryuk reaper sidecar, not the containers under test
TESTCONTAINERS_RYUK_DISABLED=true go test -run TestIntegration -v ./internal/infra/store/...
```

`testing.Short()` in `TestMain` lets `go test -short` skip these while a dedicated make target runs the full suite. Self-provisions the database from an image tag — nothing to stand up by hand.

## xh + jaq — ad-hoc calls

```bash
xh GET localhost:8080/api/users
xh POST localhost:8080/api/users email=test@test.com name="John"
xh GET localhost:8080/me "Authorization: Bearer $TOKEN"
xh GET localhost:8080/openapi.json | jaq '.paths | keys[]'
```

## curl + jq — smoke / health checks

```bash
curl -s http://localhost:8080/health > /dev/null && echo ok

RESPONSE=$(curl -s -X POST http://localhost:8080/mcp/start -d '{"config":"x"}')
if echo "$RESPONSE" | jq -r '.status' | grep -q healthy; then
	echo PASS
fi
```

Extract the field with `jq` first, then check it — don't `grep` the raw response body.

## hurl — optional declarative alternative

```hurl
GET https://api.example.com/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
```

```bash
hurl --test --variables-file .env.test tests/api/
```

No project here has adopted `hurl`. It's a fallback for a team that wants readable, chainable `.hurl` files over Go tests — not the starting point.

## Do not

- Reach for `hurl` as the default API test layer — httptest + testcontainers-go is the real pattern; pick `hurl` only if a team already committed to it.
- Skip `TESTCONTAINERS_RYUK_DISABLED=true` in a CI runner without a privileged Docker daemon — orphaned Ryuk containers pile up.
- Assert only the status code in a handler test — check body/headers too, table-driven per case.
- Treat `curl | jq` smoke scripts as an anti-pattern to fix — it's a real, legitimate lightweight pattern for health checks.
- Hardcode tokens or DSNs in committed test scripts or `.hurl` files — pull from env vars or a gitignored variables file.

## Verify

- `go test -run TestReadiness ./...` (or the project's handler package) exercises the httptest suite.
- `TESTCONTAINERS_RYUK_DISABLED=true go test -run TestIntegration ./...` runs the testcontainers suite — needs a running Docker daemon.
- `curl -s http://localhost:PORT/health | jq -r '.status'` confirms a smoke target is up before a deeper suite runs.

Load/throughput testing: see [[z-qa-performance]]. Browser/UI flows: see [[z-qa-browser]]. General Go test hygiene (table-driven, testify, parallelism): see [[z-go-testing]]. Test planning and priority mapping: see [[z-qa-analyst]]. Running and triaging the suite: see [[z-qa-debugger]].
