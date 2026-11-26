---
name: z-go-lint
description: "Configure golangci-lint or investigate Go lint findings. Use for v2 settings, review scope, nolint directives, and approved fixes. See [[z-go-ci]] for workflow configuration."
---

# Go Lint

## Commands

```bash
golangci-lint run ./...            # all configured linters
golangci-lint run --fix ./...      # auto-fix where possible
golangci-lint fmt ./...            # format (v2+)
golangci-lint run --enable-only govet ./...
golangci-lint linters              # list all available linters
golangci-lint migrate              # convert v1 config to v2
```

Use the repository's lint target when available.

## .golangci.yml essentials

Check the binary's major version. In v2, declare the schema version and configure formatters separately from linters.

```yaml
version: "2"

run:
  timeout: 5m           # set explicitly; v2 defaults to no timeout

linters:
  default: none          # v2 replacement for disable-all: true
  enable:
    - govet
    - staticcheck
    - errcheck
    - unused
    - bodyclose
    - sqlclosecheck
    - nolintlint         # enforces correct nolint usage
  settings:
    nolintlint:
      require-specific: true
      require-explanation: true
  exclusions:
    generated: strict    # default — skips files matching the Go generated-file convention

formatters:
  enable:
    - gofumpt
    - goimports

issues:
  new-from-rev: HEAD~1   # Example for a single-commit review. Select the actual review base.
```

Pin the CI binary version. For generated code, check the Go marker and the matching exclusion settings.
Use `linters.exclusions.paths` and `formatters.exclusions.paths` for explicit path patterns.

## Select a starting configuration

For new configurations, start with checks that fit the project. Preserve working settings when adding a check.

```yaml
version: "2"

run:
  timeout: 5m

linters:
  default: none
  enable:
    - govet
    - errcheck
    - staticcheck
    - unused
    - misspell
    - bodyclose
    - sqlclosecheck
    - nolintlint
  settings:
    nolintlint:
      require-specific: true
      require-explanation: true
  exclusions:
    generated: strict

formatters:
  enable:
    - gofumpt
    - goimports
```

## Choose the project's lint scope

Extend the existing linter list. Preserve the project's suppression policy.

**Minimal** — use these entries in `linters.enable` with the bootstrap settings:

```yaml
- govet
- errcheck
- staticcheck
- unused
- misspell
- nolintlint
```

**Strict** — adds contract- and correctness-focused linters on top:

```yaml
- cyclop
- goconst
- testifylint
- contextcheck
- depguard
- errname
- errorlint
- bodyclose
- sqlclosecheck
- ginkgolinter
```

Add stricter checks when they detect relevant defects and the project can maintain the results.

## nolint directives

```go
// Good — specific linter + reason
//nolint:errcheck // fire-and-forget: logger.Sync error is not actionable
_ = logger.Sync()

// Bad — bare suppression, no reason
//nolint
_ = logger.Sync()
```

Rules enforced by `nolintlint`:
- Always name the linter: `//nolint:errcheck`, not `//nolint`
- Always include a justification after `//`
- Never suppress `gosec`, `bodyclose`, `sqlclosecheck` without a documented reason

## Quick Reference

| Linter | Catches |
|---|---|
| `govet` | suspicious constructs (`printf` verbs, struct copies) |
| `staticcheck` | dead code, wrong API usage, performance issues |
| `errcheck` | unchecked `error` return values |
| `revive` | style and idiomatic Go (replaces `golint`) |
| `gosec` | security issues (crypto, SQL injection, path traversal) |
| `bodyclose` | `http.Response.Body` left unclosed |
| `sqlclosecheck` | `sql.Rows` / `sql.Stmt` left unclosed |
| `wrapcheck` | errors from external packages not wrapped |
| `nolintlint` | malformed or bare `//nolint` directives |
| `ineffassign` | assignments whose value is never used |
| `gocritic` | code smells, anti-patterns, simplifications |
| `gofumpt` | stricter `gofmt` — blank lines, grouping |
| `goimports` | import ordering and missing/extraneous imports |

## Interpreting output

```
path/to/file.go:42:10: message (linter-name)
```

The linter name tells you the rule. Add `--verbose` for timing and context.

## Common problems

| Problem | Fix |
|---|---|
| Deadline exceeded | Identify the slow stage before changing the project deadline. |
| Legacy backlog | Compare against the actual review base. Include all requested new work. |
| Linter unavailable | Check the installed binary's list of linters. |
| Conflicting rules | Find the intended policy before changing configuration. |
| v1 configuration | Inspect the migration output before using the v2 configuration. |
| Slow on a large repository | Measure package loading and analyzer times before tuning concurrency. |

## Authorized fixes

Legacy codebase adoption and other broad fixes run only when the caller explicitly
authorizes them. Auto-fixable first, then by category:

1. Auto-fixable: `golangci-lint run --fix ./...`
2. Security: `bodyclose`, `sqlclosecheck`, `gosec`
3. Error handling: `errcheck`, `wrapcheck`
4. Style/format: `gofumpt`, `goimports`, `revive`
5. Code quality: `gocritic`, `unused`, `ineffassign`

## Code review pre-check

Run before reviewing a diff:

```bash
gofmt -l . && go vet ./... && golangci-lint run ./...
```

Report findings in the review scope. Apply fixes only when requested. Preserve caller-selected checks and test contracts. See [[z-lint]].

## Do not

- Use bare `//nolint` — always name the linter.
- Suppress security linters (`gosec`, `bodyclose`, `sqlclosecheck`) without a written reason.
- Run `golangci-lint` without a `.golangci.yml` — defaults change across versions.
- Rely on auto-fix for security or error-handling findings — check each one.
- Add `nolintlint` to the disabled list — it guards the rest.

## Verification

```sh
golangci-lint run ./... && go vet ./...
```
