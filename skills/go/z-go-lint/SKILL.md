---
name: z-go-lint
description: >
  Configure and run golangci-lint, suppress warnings correctly, fix common lint
  findings, and integrate linting into CI/pre-commit hooks. Use when configuring
  .golangci.yml, interpreting lint output, adding nolint directives, adopting
  linting on a legacy codebase, or running a code review pre-check. Triggers on
  "golangci-lint", "nolint", "go vet", "staticcheck", "revive", "gosec",
  "golangci-lint run", ".golangci.yml". Does not cover style rules that linters
  enforce; see [[z-go-naming]] and [[z-go-safety]] for those. Does not cover CI
  pipeline setup; see [[z-go-ci]].
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

Use the project's own target when it exists: `make lint` / `task lint`.

## .golangci.yml essentials

v2 config declares a schema `version`, replaces `disable-all: true` with `linters.default: none`,
and splits formatters (`gofmt`, `gofumpt`, `goimports`, `gci`) into their own top-level section:

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

formatters:
  enable:
    - gofumpt
    - goimports

issues:
  new-from-rev: HEAD~1   # legacy codebases: lint only changed code
```

Pin the version in CI; never rely on "latest" from CI runners.

## Two real tiers, not one allowlist

Real repos split into two tiers rather than one shared "essentials" list — pick the tier that
matches the project's risk profile, don't default to a merged superset.

**Minimal** (ytrack) — a small service, five linters:

```yaml
linters:
  default: none
  enable:
    - govet
    - errcheck
    - staticcheck
    - unused
    - misspell
```

**Strict** (homyak, go-ent) — adds contract- and correctness-focused linters on top:

```yaml
linters:
  default: none
  enable:
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

Start minimal on a new service; move to strict once the codebase has enough tests and
conventions in place for `cyclop`/`goconst`/`errorlint` findings to be signal, not noise.

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
| "deadline exceeded" | Set `run.timeout: 5m` in config |
| Too many issues on legacy code | `issues.new-from-rev: HEAD~1` |
| Linter not found | Check `golangci-lint linters`; may need a newer binary |
| Two linters conflict | Disable the weaker one with a comment why |
| v1 config errors after upgrade | `golangci-lint migrate` |
| Slow on large repo | Reduce `run.concurrency` or exclude paths under `linters.exclusions.paths` |

## Legacy codebase adoption

Fix by category in parallel:

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

Fix any findings before proceeding to manual review. Mechanical issues distract from logical ones.

## Do not

- Use bare `//nolint` — always name the linter.
- Suppress security linters (`gosec`, `bodyclose`, `sqlclosecheck`) without a written reason.
- Run `golangci-lint` without a `.golangci.yml` — defaults change across versions.
- Rely on auto-fix for security or error-handling findings — verify each one.
- Add `nolintlint` to the disabled list — it guards the rest.

## Verify

```sh
golangci-lint run ./... && go vet ./...
```
