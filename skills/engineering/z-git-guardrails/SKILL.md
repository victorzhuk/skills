---
name: z-git-guardrails
description: Install a Claude Code PreToolUse hook that blocks destructive git commands — push, reset --hard, clean -f, checkout ./restore ., and branch -D of unmerged branches — before they execute, while letting worktree cleanup through (git worktree remove and deleting already-merged worktree branches stay allowed). Use when the user wants git safety hooks, to prevent force pushes or hard resets, or to block destructive git operations. Claude Code specific — other harnesses need their own hook mechanism.
---

# Git guardrails

Install a `PreToolUse` hook that intercepts Bash tool calls and blocks destructive git commands before they run. The bundled script lives at [scripts/block-dangerous-git.sh](scripts/block-dangerous-git.sh).

## What gets blocked

- `git push` (all variants, including `--force`)
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git checkout .` / `git restore .`
- `git branch -D <branch>` — only when the branch is **not** merged into `HEAD`

## What stays allowed

Worktree-based flows delete branches and worktrees as routine cleanup, so the hook deliberately lets through:

- `git worktree` operations (`add`, `remove`, `prune`) — never intercepted;
- `git branch -D` of a branch whose tip is already an ancestor of `HEAD` (checked with `git merge-base --is-ancestor`) — deleting merged work loses nothing;
- `git branch -d` — git itself refuses unmerged branches on lowercase `-d`.

## Steps

1. **Ask scope.** This project only (`.claude/settings.json` + `.claude/hooks/`) or all projects (the user-level `settings.json` and `hooks/` under the Claude config directory)?
2. **Copy the script** to the chosen `hooks/` directory and `chmod +x` it.
3. **Wire the hook** into the chosen settings file — merge into any existing `hooks.PreToolUse` array, don't overwrite:

   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Bash",
           "hooks": [
             {
               "type": "command",
               "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous-git.sh"
             }
           ]
         }
       ]
     }
   }
   ```

   For the global install, point `command` at the script's path under the user-level Claude config directory instead.
4. **Ask about customization** — patterns to add or drop; edit the copied script's `DANGEROUS_PATTERNS` array.
5. **Verify** with piped test input:

   ```bash
   echo '{"tool_input":{"command":"git push origin main"}}' | <path-to-script>   # exit 2, BLOCKED on stderr
   echo '{"tool_input":{"command":"git worktree remove ../wt"}}' | <path-to-script>   # exit 0
   ```

## Do not

- Overwrite an existing `hooks.PreToolUse` array — merge into it.
- Add `git worktree` to the blocklist — that breaks worktree-based apply flows.
- Rely on the hook as the only safety net; it filters the Bash tool, not the user's own terminal.

## Verify

- Blocked command test exits `2` with `BLOCKED:` on stderr; allowed commands exit `0`.
- `git branch -D` of a merged branch passes; of an unmerged branch is blocked.
- The hook script is executable and referenced from settings by the correct path.
