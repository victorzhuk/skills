#!/bin/bash

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

[ -z "$COMMAND" ] && exit 0

block() {
  echo "BLOCKED: '$COMMAND' matches dangerous pattern '$1'. The user has prevented you from doing this." >&2
  exit 2
}

DANGEROUS_PATTERNS=(
  "git push"
  "push --force"
  "git reset --hard"
  "reset --hard"
  "git clean -fd"
  "git clean -f"
  "git checkout \."
  "git restore \."
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qE "$pattern"; then
    block "$pattern"
  fi
done

# git branch -D: deleting a branch already merged into HEAD is routine worktree
# cleanup and loses nothing; force-deleting unmerged work is blocked.
if printf '%s' "$COMMAND" | grep -qE 'git branch (-D|--delete --force)'; then
  branches=$(printf '%s' "$COMMAND" |
    sed -E 's/.*git branch (-D|--delete --force) //; s/[&|;].*//')
  for b in $branches; do
    case "$b" in -*) continue ;; esac
    if ! git merge-base --is-ancestor "$b" HEAD 2>/dev/null; then
      block "git branch -D (unmerged branch: $b)"
    fi
  done
fi

exit 0
