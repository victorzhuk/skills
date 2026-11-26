---
name: z-git-guardrails
description: "Install and test a Claude Code hook that filters literal destructive Git commands. Use for PreToolUse Bash filtering and branch-deletion checks. Host permissions remain authoritative."
---

# Git guardrails

Install a best-effort `PreToolUse` filter for literal Git invocations in Bash tool calls. It requires Bash, Python 3, and Git. Keep [block-dangerous-git.sh](scripts/block-dangerous-git.sh) beside [check-git.py](scripts/check-git.py).

The filter parses direct commands and command separators. It understands Git's `-C`, `--git-dir`, and `--work-tree` options. It does not interpret aliases, shell functions, wrapper programs, scripts, substitutions, or the full shell grammar. Use host permission controls for those forms. Passing this filter never grants authorization.

## What gets blocked

- Literal `git push`, including global options before `push`
- `git reset --hard`
- `git clean` with force, including combined short flags
- `git checkout` with a path separator, `.`, or force
- `git restore` when it changes the worktree
- Forced branch deletion unless ancestry can be checked for an isolated literal command

## What stays allowed

Worktree-based flows delete branches and worktrees as routine cleanup, so the hook deliberately lets through:

- Literal `git worktree` commands pass this filter. Destructive cleanup still needs the host's checks and existing user authorization.
- An isolated `git branch -D` passes only if every named tip is an ancestor of the effective repository's `HEAD`.
  Local branches use `refs/heads/`. Remote-tracking branches use `refs/remotes/` with `-r` or `--remotes`.
  A same-named tag cannot establish ancestry. The check does not protect the branch name or prevent concurrent ref changes.
- `git branch -d` — git itself refuses unmerged branches on lowercase `-d`.

## Steps

1. **Resolve scope.** Use the requested project or user installation. Ask only if that choice remains unspecified.
2. **Copy both scripts** to the chosen `hooks/` directory and make the `.sh` entry point executable. Check that Python 3 and Git are available.
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
5. From the skill directory, send sample input to the filter:

   ```bash
   printf '%s\n' '{"tool_input":{"command":"git push origin master"}}' | bash scripts/block-dangerous-git.sh
   printf '%s\n' '{"tool_input":{"command":"git worktree remove ../wt"}}' | bash scripts/block-dangerous-git.sh
   ```

## Do not

- Overwrite an existing `hooks.PreToolUse` array — merge into it.
- Add `git worktree` to the blocklist — that breaks worktree-based apply flows.
- Rely on the hook as a security boundary or as proof that a shell program is safe. It filters a literal subset of Bash tool input, not arbitrary programs or the user's terminal.

## Check the filter

- A blocked command returns `2` and writes `BLOCKED:` to stderr. An allowed command returns `0`.
- The isolated forced-deletion check permits a merged branch and rejects an unmerged branch.
- Same-named tags or local branches do not change the decision for the selected local or remote-tracking branch.
- The hook script is executable and referenced from settings by the correct path.
- From the skill directory, run `timeout 60s python3 -m unittest discover -s scripts -p 'test_*.py'`. Use `gtimeout` where appropriate. The serial suite submits command text to the filter.
