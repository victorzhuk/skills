---
name: z-lint
description: "Check lint and formatting for the requested files, including untracked files. Use installed project tools. Apply autofixes when requested. See [[z-testing-strategy]] for tests."
---

# Lint and format

Default to checking the requested scope. Apply fixes when the caller authorizes them, including an explicit `--fix` request.

## Discover the toolchain

Read project instructions, wrappers, package scripts, and the lockfile. Use the installed versions and the project's lint and format targets. Check whether a launcher downloads missing tools.

In a monorepo, inspect the target package and inherited configuration. A root configuration is not proof that every subtree uses it.

## Select files

Select the requested paths or changed files. Include staged, unstaged, and untracked files. Deduplicate paths and omit deleted files.

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
| Go | `gofmt -l <files>` and the project's linter or vet target | `gofmt -w <files>` |
| Rust | scoped repository rustfmt/clippy targets | corresponding format target |

Do not assume workspace-wide Cargo commands respect a single-file scope. State package-level checks explicitly when required.

Check Biome's installed help before applying fixes. Its `--write` and `--fix` flags apply safe fixes by default. Unsafe fixes need separate intent.

## Report

Report the tool version, effective scope, exit status, changed files, and remaining violations. Group repeated issues with file and line evidence. Preserve existing lint rules.

## Check the result

- Compare the working tree before and after a check-only run. Account for pre-existing changes.
- Include relevant untracked files.
- Inspect authorized edits for out-of-scope changes. Run the same check after fixing them.
- Report missing tools or unsupported scope. Keep the original scope and tool installation.

[Biome CLI](https://biomejs.dev/reference/cli/).
See [[z-testing-strategy]] for test runs, [[z-zero-comments]] for comment content.
