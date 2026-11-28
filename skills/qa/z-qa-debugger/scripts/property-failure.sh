#!/usr/bin/env bash
if [[ ${1-} != -- || $# -lt 2 ]]; then
  echo 'usage: property-failure.sh -- command [args...]' >&2
  exit 2
fi
shift
log=$(mktemp "${TMPDIR:-/tmp}/property-failure.XXXXXXXX") || exit 1
keep=false
trap 'if [[ $keep == false ]]; then rm -f -- "$log"; fi' EXIT
"$@" >"$log" 2>&1
status=$?
if (( status == 0 )); then
  echo 'Test command passed.'
  exit 0
fi
printf 'Test command exited %d.\n' "$status"
if (( $(wc -c <"$log") <= 16384 )); then
  cat -- "$log"
else
  keep=true
  printf 'Truncated output. Full log: %s\n' "$log"
  printf 'Replay lines (when present):\n'
  LC_ALL=C grep -aE -- '-rapid\.(seed|failfile)|EPHYRA_REPLAY=' "$log" | head -c 4096
  printf '\nStart of output:\n'
  head -c 4096 -- "$log"
  printf '\nEnd of output:\n'
  tail -c 8192 -- "$log"
fi
exit "$status"
