---
name: z-go-service-bootstrap
description: Day-0 checklist for standing up a new Go web service — fires on "bootstrap a new Go service", "new service scaffold", "greenfield Go service", "what does a new Go service need". Maps each day-0 artifact (lint config, env mirror, Dockerfile+compose, version stamping, entrypoint, metrics port, healthz/readyz, timeouts/drain, CI scan) to its owner skill. Does not cover the detail of any artifact; each is owned by its linked skill.
---

# Go Service Bootstrap

Day-0 checklist for a new Go web service. Walk the list top to bottom; each
item names the artifact and the skill that owns how to build it. Open the
linked skill before writing the artifact — the detail lives there, not here.

## Checklist

1. `go mod init` plus the repo skeleton (`cmd/app/`, `internal/`). Then commit
   `.golangci.yml` before any code — bootstrap baseline config in
   [[z-go-lint]].
2. `.env.example` mirroring every `env:"NAME"` key, and a one-line `dotenv`
   `.envrc` — [[z-go-env-v11]].
3. `Makefile` with version stamping: `Version`, `CommitHash`, `BuildDate`
   ldflags into package `main`, plus a `dev` watch target — [[z-go-makefile]].
4. Thin `main` calling a testable `run(ctx, args, stdout, stderr)`: flags,
   `signal.NotifyContext`, explicit construction, exit code only in `main` —
   [[z-go-entrypoint]].
5. `Dockerfile` (multi-stage, static build) and dev `compose.yml` with
   `db`/`redis` healthchecks — [[z-go-dockerfile]].
6. Business mux on `:8080` serving the API only; separate `:9090` management
   listener carrying `/metrics` and pprof — [[z-go-observability]].
7. `/healthz` and `/readyz` hand-written on the business mux next to the
   generated server; never inside `openapi.yaml` — [[z-go-ogen]].
8. Inbound server timeouts (`ReadHeaderTimeout` and siblings,
   `MaxHeaderBytes`) plus graceful drain via `srv.Shutdown` — [[z-go-safety]]
   and [[z-go-entrypoint]].
9. CI: pinned-version tests, lint, govulncheck, image build with a Trivy scan leg —
   [[z-go-ci]].

## Do not

- Do not copy code from this checklist; each artifact has an owner skill with
  the authoritative version.
- Do not register `/metrics`, pprof, `/healthz`, or `/readyz` in the OpenAPI
  spec.
- Do not defer lint config, `.env.example`, or the Dockerfile past day 0 —
  retrofitting each costs more than the artifact.

## Verify

```bash
test -f .golangci.yml && test -f .env.example && test -f .dockerignore \
  && test -f Dockerfile && test -f compose.yml && test -f Makefile
# env-mirror: run the [[z-go-env-v11]] verify helper.
# Empty difference = PASS; the command must exit nonzero on a difference.
grep -E 'Version|CommitHash|BuildDate' Makefile
curl -sf localhost:8080/healthz && curl -sf localhost:9090/metrics
```

Source keys missing from `.env.example` fail the check; extra keys in `.env.example` are allowed.
