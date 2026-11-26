---
name: z-worktrunk
description: "Manage Git worktrees with the Worktrunk wt CLI. Use for switching branches, creating or removing worktrees, merging, hooks, or worktree-path configuration."
---

# Manage Git worktrees with Worktrunk

## Inspect the installation

Run `wt --version` and inspect `wt <command> --help` for the selected operation.
Check project configuration in `.config/wt.toml` and the active user configuration. Inspect hooks before operations that run them.
Shell integration enables directory switching. Check `wt config shell` for the installation instructions.

## Select the operation

| Task | Command | Effect |
|---|---|---|
| Inspect worktrees | `wt list` | Shows branches, paths, changes, and divergence. Check the configured JSON schema before parsing `--format=json`. |
| Open a branch | `wt switch <branch>` | Switches to its worktree or creates a worktree for the existing branch. |
| Create a branch | `wt switch --create <branch> --base <base>` | Creates a branch and worktree from the selected base. Omit the base for the default. |
| Return to a worktree | `wt switch -` or `wt switch ^` | Selects the previous or default-branch worktree. |
| Open a review | `wt switch pr:N` or `wt switch mr:N` | Opens the review branch. Do not combine with `--create`. |
| Run a program | `wt switch <branch> -x <program> -- <args>` | Passes arguments to one program. Use an explicit shell for shell syntax. |
| Remove a worktree | `wt remove <branch>` | Can also remove the merged branch. Use `--no-delete-branch` to keep it. |

Use a separate worktree for each concurrent change. Read the path from `wt list` or the configured `worktree-path` template.
For example, `{{ repo_path }}/.worktrees/{{ branch | sanitize }}` places worktrees under the repository.
Inspect `wt step`, `wt hook`, or `wt config` help for individual operations, hooks, plugins, and saved state.

## Merge or remove

1. Identify the source branch, target branch, and source worktree. Inspect its staged, unstaged, and untracked files.
2. Check the installed merge defaults and project policy. By default, `wt merge` can stage untracked files, squash commits, and remove the source worktree.
3. Select an operation that preserves the intended history, file scope, and worktree. Check `--stage`, `--no-commit`, `--no-squash`, and `--no-remove` before use.
4. Inspect configured hooks with `wt hook show`. A failing blocking hook stops the operation.
5. Before removal, inspect uncommitted work and unmerged commits. `wt remove --force` permits removal of a dirty worktree. `wt remove -D` permits removal of an unmerged branch.
6. For `wt switch --clobber`, inspect the stale non-worktree directory at the target path before removing it.

## Checks

Check the exit status and `wt list`. After integration, inspect the target's content.
For a history-preserving merge, also check commit ancestry. A squash can preserve content while changing commit identity.
Use `wt remove --foreground` when a later step depends on completed removal. Check the branch and directory after the command exits.

[Worktrunk merge behavior](https://worktrunk.dev/merge/). See [[z-git-guardrails]] for literal Git command filtering.
