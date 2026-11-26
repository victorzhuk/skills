---
name: z-merge-conflicts
description: "Resolve Git merge, rebase, or cherry-pick conflicts. Preserve unrelated work, stage the intended resolutions, and verify the result before continuing."
---

# Merge conflicts

Resolve by intent and preserve unrelated work.

## Process

1. Identify the merge, rebase, or cherry-pick and its current commit. Record conflicting paths and pre-existing staged and unstaged changes.
2. Read each side's commits and relevant PRs or tickets. Explain why each change exists.
3. Preserve both intents when compatible. Use the caller's stated goal to resolve differences. Escalate a choice that the evidence cannot settle.
4. Run the applicable project commands through their wrappers with the required limits. Fix failures from the resolution.
5. Stage resolved paths explicitly. Inspect the entire staged diff against the initial state. Do not incorporate unrelated staged work into a commit.
6. Continue the actual operation within the caller's authorization. Use the continuation for the active operation. Report any remaining conflicts.

## Do not

- Select ours/theirs wholesale without reading both intents.
- Invent behavior neither side requested.
- Stage every modified file.
- Abort merely to avoid resolving a conflict. Explicit user cancellation can authorize aborting after preserving recoverable work.
- Treat marker-like test fixtures as unresolved conflicts without inspection.

## Inspect the resolution

- `git diff --name-only --diff-filter=U` has no unresolved paths.
- Changed files contain no unintended conflict markers.
- Staged changes include only intended resolutions and already-authorized work.
- The project commands pass and `git status` shows the intended operation completed.

Use [[z-verify-before-done]] for evidence and [[z-testing-strategy]] for test scope.
