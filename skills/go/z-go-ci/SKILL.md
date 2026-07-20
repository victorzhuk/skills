---
name: z-go-ci
description: GitHub Actions CI/CD for Go projects — test matrix, race detection, golangci-lint, govulncheck, CodeQL, GoReleaser, Dependabot/Renovate, Docker image pipelines. Triggers on "github actions", "workflow", "govulncheck", "goreleaser", "dependabot", "release pipeline". Does not cover lint rule selection; see [[z-go-lint]].
allowed-tools: Read Edit Write Bash(go:*) Bash(golangci-lint:*) Bash(git:*) Bash(goreleaser:*) Bash(gh:*)
---

# Go CI

## Quick Reference

| Stage      | Tool                                  | Purpose                              |
|------------|----------------------------------------|--------------------------------------|
| Test       | `go test -race`                       | Unit tests + race detection          |
| Lint       | `golangci-lint`                       | Static analysis                      |
| Vuln scan  | `govulncheck`                         | CVEs in call-reachable paths only    |
| Release    | GoReleaser                            | Cross-compiled binaries + changelog, only when a binary ships |

This is the real baseline: one pinned Go version, race-detected tests, lint, `govulncheck`, and GoReleaser for anything that produces a binary. See **Optional hardening** below for coverage gates, version matrices, SAST, dependency bots, and multi-platform Docker — each is a real, addable option, none is the default.

## Test workflow

`.github/workflows/test.yml`:

```yaml
name: test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - run: go test -race ./...
```

Pin one Go version — either `go-version-file: go.mod` (tracks the module automatically) or a literal `go-version: "1.24"`. No version matrix by default. `-count=1` on integration jobs to disable caching for service-backed tests.

## Lint workflow

`.github/workflows/lint.yml`:

```yaml
name: lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - uses: golangci/golangci-lint-action@v6
```

## Security workflow

`.github/workflows/security.yml`:

```yaml
name: security
on: [push, pull_request]

jobs:
  govulncheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version-file: go.mod }
      - run: go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

`govulncheck` only reports CVEs in paths your code actually calls — prefer it over generic dependency scanners. This is the whole security job by default; `gosec` findings are usually surfaced through a `golangci-lint` linter (see [[z-go-lint]]) rather than run as their own step, and CodeQL is optional hardening (below), not part of the baseline.

## Release workflow

`.github/workflows/release.yml` — triggers on `v*` tags only:

```yaml
name: release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-go@v5
        with: { go-version-file: go.mod }
      - uses: goreleaser/goreleaser-action@v6
        with:
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Minimal `.goreleaser.yml`: `builds` → `main: ./cmd/myapp`, `goos: [linux, darwin, windows]`, `goarch: [amd64, arm64]`; `archives` with `tar.gz` and a Windows `zip` override; `checksum`; `changelog: sort: asc`. For a library omit `builds` and set `release: { draft: false }`. For multi-binary add one entry per `cmd/*`.

## Docker workflow

`.github/workflows/build.yml` — single context, single platform, triggered after CI passes:

```yaml
name: build
on:
  workflow_run:
    workflows: [test]
    types: [completed]

jobs:
  build:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

One `docker/build-push-action` call, one platform. Multi-platform builds, provenance/sbom attestations, and image scanning are real options — see Optional hardening — not part of the baseline.

Repository settings: branch protection on `master` (required status checks, PR approval, no force push); `contents: read` as the default workflow permission; grant write only per-job where needed; credentials in repository secrets, never inline.

## Optional hardening

Each of these is a real, well-known option and worth adding once a specific risk justifies the extra job — none of them is the default, and adding all of them preemptively is cost without a matching need:

| Hardening | What it adds | Add it when |
|---|---|---|
| `codecov/codecov-action` coverage gate | Coverage percentage tracked and gated in PRs | Someone actually reads the coverage number and acts on drops |
| Go version matrix + `fail-fast: false` + `-shuffle=on` | Compatibility across Go versions; catches order-dependent test bugs | A library needs to prove multi-version compatibility, or shuffle-sensitive flakiness is suspected |
| CodeQL (`github/codeql-action`) | Deeper SAST than a linter | An internet-facing service needs a documented SAST story beyond `golangci-lint`'s `gosec` linter |
| Dependabot (`.github/dependabot.yml`) or Renovate (`renovate.json`) | Automated dependency-bump PRs | Dependency drift has actually caused a problem, or the team wants it hands-off |
| Multi-platform Docker + `provenance: mode=max` + `sbom: true` + Trivy scan | `linux/amd64,linux/arm64` images, supply-chain attestations, vulnerability scanning | The image ships to more than one architecture, or a consumer requires attestations |
| `go mod tidy && git diff --exit-code` tidy-check | Catches stale `go.sum` | `go.sum` drift has bitten the project before |
| OIDC federation (`aws-actions/configure-aws-credentials`, `google-github-actions/auth`, etc.) | Exchanges a short-lived, workflow-scoped identity token for cloud credentials instead of a static key in secrets | A workflow needs to authenticate to a cloud provider — prefer this over long-lived cloud secrets by default, not just for high-risk repos |

## Do not

- Omit `-race` from the test job — data races are undefined behaviour.
- Cache integration test results — use `-count=1` for service-backed tests.
- Use `@master` or `@latest` for action refs — pin to a major version tag (`@v4`) as the baseline; pin third-party (non-`actions/`, non-`docker/`) actions to a full commit SHA instead where supply-chain policy requires an immutable reference, since a tag can be moved.
- Grant `contents: write` globally — scope it to the release job.
- Add a version matrix, `-shuffle=on`, CodeQL, Dependabot, multi-platform Docker, or a tidy-check by default "just in case" — each is real, useful hardening, but add it for a specific risk, not preemptively.

## Verify

```sh
gh workflow list
gh run list --workflow=test.yml --limit 5
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```
