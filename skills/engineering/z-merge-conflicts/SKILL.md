---
name: z-merge-conflicts
description: Resolve an in-progress git merge or rebase conflict by intent, not by picking sides blindly — read both sides' commits, PRs, and tickets, preserve both intents where possible, never abort, and run the project's checks before concluding. Use when a merge, rebase, or cherry-pick stops on conflicts, or when the user asks to resolve conflicts. Triggers on "merge conflict", "rebase conflict", "both modified", "<<<<<<< HEAD".
---

# Merge conflicts

Resolve by understanding why each side changed, not by pattern-matching on which hunk looks newer.

## Process

1. **See the state.** Merge or rebase? Which commit is being applied? List the conflicting files (`git status`, `git log --merge`, the `<<<<<<<`/`>>>>>>>` markers).
2. **Find the primary sources per conflict.** Why was each side's change made — commit messages, the PRs they came from, linked issues/tickets. Intent decides resolutions; the diff alone can't.
3. **Resolve each hunk.** Preserve both intents where possible. Where they're incompatible, pick the side matching the merge's stated goal and note the trade-off. Never invent behavior that neither side had. Always resolve; never `--abort` — aborting discards the work, it doesn't resolve anything.
4. **Run the project's checks** through its own wrappers — typically typecheck, then tests, then format. Fix what the merge broke.
5. **Finish.** Stage everything and commit. If rebasing, `--continue` until every commit is applied — a half-done rebase is worse than a conflict.

## Do not

- Pick "ours"/"theirs" wholesale without reading both sides' intent.
- Invent new behavior to make the hunks compose.
- `--abort` to make the problem go away.
- Conclude before the project's checks pass.
- Leave conflict markers in any file (`rg '<<<<<<<'` must be empty).

## Verify

    rg -l '^(<{7}|={7}|>{7})' .    # no conflict markers survive
    git status                     # no unmerged paths; rebase/merge finished

- Both sides' intents are represented or the trade-off is noted in the commit message.
- Project checks pass after resolution.

see [[z-verify-before-done]]
