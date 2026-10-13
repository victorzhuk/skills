---
name: z-lint
description: Check or fix lint and formatting through the project's installed tools and wrappers. Use for lint errors, formatting checks, or authorized autofix. Default to report-only; include tracked and untracked files in the requested scope. Test execution belongs to [[z-testing-strategy]].
---

# Lint and format

Default to checking the requested scope. Apply fixes when the caller authorizes them, including an explicit `--fix` request.

## Discover the toolchain

Read project instructions, wrappers, scripts, lockfile, and applicable package configuration. Prefer the repository's lint/format targets over raw tool calls. Match the package manager and installed versions; do not let a convenience launcher download a missing tool silently.

In a monorepo, inspect the target package and inherited configuration. A root configuration is not proof that every subtree uses it.

## Select files

Use an explicit requested path or the changed working-tree scope. Include staged, unstaged, and untracked files; omit deleted paths and deduplicate.

For Git discovery, use NUL-delimited output from `git diff --name-only -z`, `git diff --cached --name-only -z`, and `git ls-files --others --exclude-standard -z`. Preserve spaces and other filename characters when passing arguments.

If no relevant files changed, report that result. Do not expand to the whole repository without a reason in the requested scope.

## Run checks

Use the installed version's help for flags. These are common raw fallbacks only when no repository wrapper applies:

| Tool | Check | Authorized fix |
|---|---|---|
| Biome | `biome check <paths>` | `biome check --write <paths>` |
| ESLint | `eslint <paths>` | `eslint --fix <paths>` |
| Prettier | `prettier --check <paths>` | `prettier --write <paths>` |
| Ruff | `ruff check <paths>`, `ruff format --check <paths>` | `ruff check --fix <paths>`, `ruff format <paths>` |
| Black | `black --check <paths>` | `black <paths>` |
| Go | `gofmt -l <files>`; repository linter/vet target | `gofmt -w <files>` |
| Rust | scoped repository rustfmt/clippy targets | corresponding format target |

Do not assume workspace-wide Cargo commands respect a single-file scope. State package-level checks explicitly when required.

For current Biome, `--write` or `--fix` applies safe fixes; unsafe fixes need separate intent. Do not use the old `--apply` flag without evidence for the installed release.

## Report

Report tool/version, actual scope, exit status, remaining rule violations, and changed files. Group repeated issues; keep enough file/line evidence to act. Do not recommend weakening a rule merely because it reports many findings.

## Verify

- Check-only mode left files unchanged.
- New untracked files were included where relevant.
- Authorized fixes stayed within scope and passed the same check.
- Missing tools or unsupported scope are reported, not silently installed or widened.

[Biome CLI](https://biomejs.dev/reference/cli/).
See [[z-testing-strategy]] for test runs, [[z-zero-comments]] for comment content.
