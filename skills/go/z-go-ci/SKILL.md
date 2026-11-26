---
name: z-go-ci
description: "Configure GitHub Actions for Go tests, lint, vulnerability checks, release tags, and image publication. Use for workflow dependencies, permissions, and release evidence."
allowed-tools: Read Edit Write Bash(go:*) Bash(golangci-lint:*) Bash(git:*) Bash(goreleaser:*) Bash(gh:*)
---

# Go CI

## Quick Reference

| Stage      | Tool                                  | Purpose                              |
|------------|----------------------------------------|--------------------------------------|
| Test       | `go test -race`                       | Unit tests + race detection          |
| Lint       | `golangci-lint`                       | Static analysis                      |
| Vuln scan | `govulncheck` | Known vulnerabilities in the selected Go build |
| Release    | GoReleaser                            | Cross-compiled binaries + changelog, only when a binary ships |

Use the project's supported Go toolchain. Test, lint, and scan the revision before publishing a binary or image.

## Test workflow

Example test job. Keep jobs that use `needs` in the same workflow.

```yaml
name: test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - run: timeout 15m go test -parallel 4 -p 2 -race -timeout 10m ./...
```

Use `-count=1` for integration tests that depend on live services. Specify job, process, and test-binary deadlines. Limit package and test parallelism.

## Lint workflow

Example lint job.

```yaml
name: lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - uses: golangci/golangci-lint-action@v9
        with:
          version: v2.13
```

Use a compatible linter, action, and runner version. See the [official compatibility example](https://github.com/golangci/golangci-lint-action#compatibility).

## Security workflow

Example security job for a module that pins `govulncheck` as a Go tool.

```yaml
name: security
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version-file: go.mod }
      - run: go tool govulncheck ./...
```

Inspect reachability and scan mode in the [govulncheck report](https://go.dev/doc/security/vuln/). Record the tool version and applicable build tags. See [[z-go-lint]] for lint checks.

## Release workflow

Keep release, test, lint, and security jobs in one workflow. Enable prerequisites on tag pushes. Publish only successful release tags.

```yaml
jobs:
  release:
    needs: [test, lint, security]
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    timeout-minutes: 20
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

Configure each GoReleaser build for the actual command, target platforms, archive format, and checksums. Inspect library workflows separately.

## Docker workflow

Publish images from trusted default-branch pushes. Require test, lint, and security jobs to succeed on the same commit.

```yaml
jobs:
  build:
    needs: [test, lint, security]
    if: github.event_name == 'push' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.sha }}
      - name: Compute build metadata
        id: meta
        run: echo "commit-date=$(git log -1 --format=%cI)" >> "$GITHUB_OUTPUT"
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          # VERSION: the release tag on a release build, or the version file the repo already maintains
          build-args: |
            VERSION=${{ github.ref_name }}
            GIT_COMMIT=${{ github.sha }}
            BUILD_DATE=${{ steps.meta.outputs.commit-date }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
      # third-party action: pinned to a version tag; full commit SHA only where supply-chain policy requires an immutable reference
      - uses: aquasecurity/trivy-action@v0.36.0
        with:
          image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
          severity: HIGH,CRITICAL
          exit-code: 0
```

Preserve both publishers' `needs` dependencies. A `workflow_run` publisher must check the event, branch, head SHA, and prerequisite results.

Keep registry credentials out of jobs that execute untrusted pull request code.

The example scans the published image for high and critical findings. Exit code zero makes this scan informational.

To gate publication, scan the exact artifact before promoting it. Exclude unrelated files from the Docker build context.

Protect the release branch. Set read-only workflow permissions. Grant write permissions only to jobs that need them.

## Optional hardening

Select additional checks from the repository's risks and deployment targets.

| Hardening | What it adds | Add it when |
|---|---|---|
| `codecov/codecov-action` coverage gate | Coverage percentage tracked and gated in PRs | Someone actually reads the coverage number and acts on drops |
| Go version matrix, `fail-fast: false`, and `-shuffle=on` | Check supported Go versions and test independence | Use when the library supports multiple toolchains or test order affects results |
| CodeQL (`github/codeql-action`) | Deeper SAST than a linter | An internet-facing service needs a documented SAST story beyond `golangci-lint`'s `gosec` linter |
| Dependabot (`.github/dependabot.yml`) or Renovate (`renovate.json`) | Automated dependency-bump PRs | Dependency drift has actually caused a problem, or the team wants it hands-off |
| Multi-platform Docker + `provenance: mode=max` + `sbom: true` + Trivy scan | `linux/amd64,linux/arm64` images, supply-chain attestations, vulnerability scanning | The image ships to more than one architecture, or a consumer requires attestations |
| `go mod tidy && git diff --exit-code` | Detect stale module files | A change to dependencies must include updated `go.mod` and `go.sum` |
| OIDC federation (`aws-actions/configure-aws-credentials`, `google-github-actions/auth`, etc.) | Exchanges a short-lived, workflow-scoped identity token for cloud credentials instead of a static key in secrets | A workflow needs to authenticate to a cloud provider — prefer this over long-lived cloud secrets by default, not just for high-risk repos |

## Checks

```sh
gh workflow list
gh run list --workflow=test.yml --limit 5
go tool govulncheck ./...
```
