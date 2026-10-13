---
name: z-merge-conflicts
description: "Resolve merge, rebase, or cherry-pick conflicts by intent. Use for \"merge conflict\", \"rebase conflict\", \"both modified\", or \"conflict markers\". Read both sides, preserve unrelated work, stage only intended resolutions, and verify before continuing the authorized operation."
---

# Merge conflicts

Resolve by intent and preserve unrelated work.

## Process

1. Identify the merge, rebase, or cherry-pick and its current commit. Record conflicting paths and pre-existing staged and unstaged changes.
2. Read each side's commits and relevant PRs or tickets. Explain why each change exists.
3. Preserve both intents where possible. Resolve incompatible behavior using the caller's stated goal; escalate a decision the evidence cannot settle.
4. Run applicable project checks through its wrappers and resource limits. Fix what the resolution broke.
5. Stage resolved paths explicitly. Inspect the entire staged diff against the initial state. Do not incorporate unrelated staged work into a commit.
6. Continue the actual operation within the caller's authorization. Use the correct merge, rebase, or cherry-pick continuation and report remaining conflicts.

## Do not

- Select ours/theirs wholesale without reading both intents.
- Invent behavior neither side requested.
- Stage every modified file.
- Abort merely to avoid resolving a conflict. Explicit user cancellation can authorize aborting after preserving recoverable work.
- Treat marker-like test fixtures as unresolved conflicts without inspection.

## Verify

- `git diff --name-only --diff-filter=U` has no unresolved paths.
- Changed files contain no unintended conflict markers.
- Staged changes include only intended resolutions and already-authorized work.
- Project checks pass and `git status` confirms the intended operation completed.

see [[z-verify-before-done]], [[z-testing-strategy]]
