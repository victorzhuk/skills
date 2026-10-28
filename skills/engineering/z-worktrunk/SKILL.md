---
name: z-worktrunk
description: 'Manage Git worktrees with the `wt` (Worktrunk) CLI — switch, create, merge, remove, hooks, config, PR/MR shortcuts. Fires on "worktrunk", "wt switch", "wt list", "wt merge", "wt remove", "worktrees". Prefer `wt` over raw `git worktree` for naming, hooks, and lifecycle; excludes the omp/claude activity plugins.'
---

# Worktrunk (`wt`)

Before copying commands, check the installed version (`wt --version`) and the subcommand's `wt <command> --help` — flags and output shapes change between releases. Use what is installed; do not upgrade `wt` to match an example.

## Core commands

- `wt switch <branch>` — switch to a worktree; create one if the branch exists but has none.
- `wt switch --create <branch>` [--base <base>] — new branch + worktree; base defaults to the default branch and accepts the same shortcuts (`^`, `@`, `-`, `pr:N`, `mr:N`).
- `wt switch -` — previous worktree (like `cd -`); `wt switch ^` — default-branch worktree.
- `wt switch pr:N` / `mr:N` / a PR/MR URL — switch to a PR/MR branch (fetches fork refs). Not combinable with `--create`.
- `wt switch` (no args) — interactive picker; `--branches`/`--remotes`/`--prs` widen candidates.
- `wt switch -x <program> -- <args...>` — run one program in the switched-to worktree; args after `--` bypass worktrunk parsing. Shell syntax needs an explicit shell: `wt switch feature -x sh -- -c 'npm install && npm test'`.
- `wt list [--full] [--branches] [--format=json]` — worktrees, status, divergence, uncommitted changes; `--full` adds CI status and LLM summaries (network + LLM).
- `wt merge` — by default, stages all tracked and untracked changes, includes them in the squash commit, merges into the target (default branch), and runs hooks. Cleanup removes the worktree by default.
- `wt remove [<branch>]` — remove worktree; delete branch only when merged (`--force` for a dirty worktree, `-D` for an unmerged branch).
- `wt step` — individual operations (`wt step commit`, `wt step squash`, `wt step copy-ignored`, `wt step tether`, `wt step relocate`).
- `wt hook <type> [name...]` — run configured hooks manually; `user:`/`project:` prefixes filter by source.
- `wt config` — shell integration (`wt config shell install`), config creation (`wt config create [--project]`), plugins, state, approvals, aliases.

Branch shortcuts apply wherever a branch is accepted: `^` (default), `@` (current), `-` (previous), `pr:{N}`, `mr:{N}`.

## Parallel-agent workflow

```
wt switch -x claude -c feature-a -- 'Add user authentication'
wt switch -x claude -c feature-b -- 'Fix the pagination bug'
```

One worktree per task, one agent in each. `wt switch -` hops back; `wt list` shows all worktrees; `wt merge` from inside the worktree integrates; `wt remove` when done.

## Hooks

Ten hook types, configured in `.config/wt.toml` (project) or user config: `pre-switch`, `post-switch`, `pre-start`, `post-start`, `pre-commit`, `post-commit`, `pre-merge`, `post-merge`, `pre-remove`, `post-remove`. `pre-*` hooks block — a failure aborts the operation. `post-*` hooks run in the background (logs via `wt config state logs`). During `wt merge` blocking hooks run pre-commit → pre-merge → pre-remove. `--no-hooks` is accepted by `wt switch`, `wt merge`, `wt remove`, `wt step commit`, and `wt step squash` — not by `wt hook`.

## Config

- Project config: `.config/wt.toml` at the repo root (committed, shared).
- User config: `~/.config/worktrunk/config.toml` (XDG-aware).
- `worktree-path` template controls worktree placement; a `<repo>/.worktrees/<branch>` layout is `worktree-path = "{{ repo_path }}/.worktrees/{{ branch | sanitize }}"` (default is a sibling dir `{{ repo_path }}/../{{ repo }}.{{ branch | sanitize }}`). Variables: `{{ repo_path }}`, `{{ repo }}`, `{{ owner }}`, `{{ remote_repo }}`, `{{ branch }}`; filters `sanitize`, `sanitize_db`, `codename(n)`.
- `[list] json-schema = 2` (default: envelope) or `1` (bare array) selects the `wt list --format=json` shape.
- Per-repo overrides live in `[projects."<host>/<owner>/<repo>"]` in user config.

## Conventions and safety

- Address worktrees by branch name or worktree path; paths are computed from the template. `wt list` marks out-of-template paths; `wt step relocate` moves them back.
- Inspect source-worktree status, staged and unstaged diffs, and untracked files before merging. Prefer a clean source worktree with reviewed commits. If committing pending work is intended, establish its exact scope first. The default `--stage all` includes untracked files. Check installed `--stage` options before selecting a narrower scope, and preserve unrelated work before cleanup.
- Dirty worktree refuses removal unless `--force`; unmerged branch is kept unless `-D`. Both are deliberate acts.
- `--clobber` removes a stale non-worktree directory occupying the target path.
- `wt switch` failure causes: branch missing → `--create`; path occupied → switch to or remove the other worktree; stale directory → `--clobber`.
- Never bypass hooks (`--no-hooks`) without a reason.

## Integration

- oh-my-pi activity tracking: `wt config plugins omp install` / `uninstall`.
- Claude Code: `wt config plugins claude install` (activity tracking + statusline; `wt list statusline --format=claude-code` feeds the statusline).
- Other agents: `wt config plugins codex|opencode|pi install`.

## Do not

- Assume `git worktree` semantics — `wt switch` navigates between worktrees; it does not change branches in place (use `git switch` inside a worktree for that).
- Hardcode worktree paths; set the `worktree-path` template.
- Run `wt merge` without reviewing commits and pending files — it can commit untracked files, squash, and remove the worktree by default.
- Pass `--no-hooks` to `wt hook` — it has no such flag.

## Verify

- `wt list` shows the expected worktrees and status symbols.
- `wt list --format=json` for scripting; check exit codes, not just output.
- After merge: target branch contains the commits; worktree removed (unless `--no-remove`).
- After removal: branch gone (if merged) and directory absent.

Full reference: `wt <command> --help` and https://worktrunk.dev.

see [[z-git-guardrails]]
