#!/usr/bin/env bash
# Runs the release gates of gates.conf: Quality, Security and Performance.
#
#   scripts/release-gates.sh <version>   every check; refuses a dirty tree and
#                                        writes handoffs/gates/<version>.md
#   scripts/release-gates.sh --pr        only the checks marked `pr`; no report
#   scripts/release-gates.sh --validate  reads gates.conf and runs nothing
#
# A check passes when its command exits 0. A gate is green when every one of
# its checks passed, and a gate with no checks is red. The last line of the
# output (and of the report) is `GATES GREEN at <commit>` or
# `GATES RED at <commit>: <gate>/<check>, ...`, and the script exits 0 only on
# GATES GREEN. A release is tagged on that commit only (CLAUDE.md, the project
# contract, "Release gates").
set -uo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
conf="$root/gates.conf"
GATES=(quality security performance)

mode=release version=""
case "${1:-}" in
  --pr) mode=pr ;;
  --validate) mode=validate ;;
  "" | -*) echo "usage: scripts/release-gates.sh <version> | --pr | --validate" >&2; exit 2 ;;
  *) version=$1 ;;
esac

# --- read and validate gates.conf: gate | check | when | command ---
names=() gates=() whens=() commands=() errors=()
lineno=0
while IFS= read -r line || [ -n "$line" ]; do
  lineno=$((lineno + 1))
  case "$line" in '' | '#'*) continue ;; esac
  gate=$(printf '%s' "$line" | cut -d'|' -f1 | xargs)
  name=$(printf '%s' "$line" | cut -d'|' -f2 | xargs)
  when=$(printf '%s' "$line" | cut -d'|' -f3 | xargs)
  command=$(printf '%s' "$line" | cut -d'|' -f4- | sed 's/^ *//; s/ *$//')
  case " ${GATES[*]} " in *" $gate "*) ;; *) errors+=("line $lineno: unknown gate '$gate'") ;; esac
  case "$when" in pr | release) ;; *) errors+=("line $lineno: 'when' must be pr or release, not '$when'") ;; esac
  [ -n "$name" ] || errors+=("line $lineno: a check has no name")
  [ -n "$command" ] || errors+=("line $lineno: check '$name' has no command")
  for seen in "${names[@]+"${names[@]}"}"; do
    if [ "$seen" = "$name" ]; then errors+=("line $lineno: check '$name' is named twice"); break; fi
  done
  names+=("$name") gates+=("$gate") whens+=("$when") commands+=("$command")
done < "$conf"

if [ "${#errors[@]}" -gt 0 ]; then
  printf 'gates.conf refused:\n' >&2
  printf '  %s\n' "${errors[@]}" >&2
  exit 2
fi
if [ "$mode" = validate ]; then
  echo "gates.conf: ${#names[@]} checks, valid"
  exit 0
fi

cd "$root" || exit 2
commit=$(git rev-parse --short=12 HEAD)
if [ "$mode" = release ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "refused: the working tree is not clean; the gates are run on a commit, not on a tree" >&2
    exit 2
  fi
  report="$root/handoffs/gates/$version.md"
  mkdir -p "$(dirname "$report")"
  {
    echo "# Release gates: $version"
    echo
    echo "Commit \`$(git rev-parse HEAD)\`, $(date -u '+%Y-%m-%d %H:%M UTC')."
    echo
  } > "$report"
fi

# --- run ---
failed=() ran=()
for i in "${!names[@]}"; do
  [ "$mode" = pr ] && [ "${whens[$i]}" != pr ] && continue
  ran+=("${gates[$i]}")
  log=$(mktemp)
  start=$SECONDS
  bash -c "${commands[$i]}" > "$log" 2>&1
  code=$?
  took=$((SECONDS - start))
  if [ "$code" -eq 0 ]; then result=passed; else result="FAILED (exit $code)"; failed+=("${gates[$i]}/${names[$i]}"); fi
  printf '%-12s %-24s %-18s %ss\n' "${gates[$i]}" "${names[$i]}" "$result" "$took"
  if [ "$mode" = release ]; then
    {
      echo "## ${gates[$i]} / ${names[$i]}: $result, ${took} s"
      echo
      echo "\`${commands[$i]}\`"
      echo
      echo '```'
      tail -n 20 "$log"
      echo '```'
      echo
    } >> "$report"
  fi
  rm -f "$log"
done

# a gate with no check that ran is red
for gate in "${GATES[@]}"; do
  case " ${ran[*]-} " in *" $gate "*) ;; *) failed+=("$gate/(no checks)") ;; esac
done

if [ "${#failed[@]}" -eq 0 ]; then
  verdict="GATES GREEN at $commit"
else
  verdict="GATES RED at $commit: $(IFS=,; echo "${failed[*]}" | sed 's/,/, /g')"
fi
[ "$mode" = release ] && echo "$verdict" >> "$report" && echo "report: handoffs/gates/$version.md"
echo "$verdict"
[ "${#failed[@]}" -eq 0 ]
