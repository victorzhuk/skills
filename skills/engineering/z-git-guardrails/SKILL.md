---
name: z-git-guardrails
description: Install a Claude Code PreToolUse filter for literal Git push, hard reset, forced clean, path restore, and unmerged branch deletion commands. Use when adding or repairing a Git safety hook. Best-effort detection, not a shell sandbox or runtime authorization; other hosts need their own permission controls.
---

# Git guardrails

Install a best-effort `PreToolUse` filter for literal Git invocations in Bash tool calls. It requires Bash, Python 3, and Git. Keep [block-dangerous-git.sh](scripts/block-dangerous-git.sh) beside [check-git.py](scripts/check-git.py).

The filter parses direct commands and command separators. It understands Git's `-C`, `--git-dir`, and `--work-tree` options. It does not interpret aliases, shell functions, wrapper programs, scripts, substitutions, or the full shell grammar. Use host permission controls for those forms. Passing this filter never grants authorization.

## What gets blocked

- Literal `git push`, including global options before `push`
- `git reset --hard`
- `git clean` with force, including combined short flags
- `git checkout` with a path separator, `.`, or force; worktree `git restore`
- Forced branch deletion unless ancestry can be checked for an isolated literal command

## What stays allowed

Worktree-based flows delete branches and worktrees as routine cleanup, so the hook deliberately lets through:

- Literal `git worktree` commands pass this filter. Destructive cleanup still needs the host's checks and existing user authorization.
- An isolated `git branch -D` passes when every named branch tip is an ancestor of `HEAD` in the command's effective repository. Resolve local branches under `refs/heads/` and `-r`/`--remotes` targets under `refs/remotes/`; a same-named tag cannot establish ancestry. This snapshot check does not protect against concurrent ref changes or preserve the branch name for the user.
- `git branch -d` — git itself refuses unmerged branches on lowercase `-d`.

## Steps

1. **Resolve scope.** Use the requested project or user installation. Ask only if that choice remains unspecified.
2. **Copy both scripts** to the chosen `hooks/` directory and make the `.sh` entry point executable. Verify Python 3 and Git are available.
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
4. **Preserve policy.** Apply only requested customizations. Add cases to the guard tests for any changed command policy.
5. **Verify** with piped test input:

   ```bash
   echo '{"tool_input":{"command":"git push origin master"}}' | <path-to-script>   # exit 2, BLOCKED on stderr
   echo '{"tool_input":{"command":"git worktree remove ../wt"}}' | <path-to-script>   # exit 0
   ```

## Do not

- Overwrite an existing `hooks.PreToolUse` array — merge into it.
- Add `git worktree` to the blocklist — that breaks worktree-based apply flows.
- Rely on the hook as a security boundary or as proof that a shell program is safe. It filters a literal subset of Bash tool input, not arbitrary programs or the user's terminal.

## Verify

- Blocked command test exits `2` with `BLOCKED:` on stderr; allowed commands exit `0`.
- `git branch -D` of a merged branch passes; of an unmerged branch is blocked.
- Same-named tags or local branches do not change the decision for the selected local or remote-tracking branch.
- The hook script is executable and referenced from settings by the correct path.
- Run `timeout 60s python3 -m unittest discover -s scripts -p 'test_*.py'` from this skill directory; use `gtimeout` where GNU timeout is installed under that name. The runner is serial. The tests submit command text; they do not run destructive Git operations.
