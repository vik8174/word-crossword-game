#!/usr/bin/env bash
# Record a Worker's report or an Inspector's verdict for one round of an issue.
#
# The record lives in `handoffs/verdicts/<issue>/` of the main working tree,
# which git ignores. That is the point of it: a verdict that lives only in a
# sub-agent's context is lost when the context compacts, and a comment on the
# pull request is a publication on an outside service, which a sub-agent is
# refused however the settings read. A local file is neither.
#
# It exists as a script rather than a redirect an agent writes for itself for
# the same reason `copy-env-to-worktree.sh` does: a permission rule matches a
# command by its prefix, so one name is one rule and every hand-written shape is
# a prompt. It also finds the main working tree, which a worktree cannot see by
# a relative path, because `handoffs/` is not in it.
#
# Usage, from the main tree or any worktree of it:
#   scripts/record-round.sh <issue> <round> report  <<'EOF' ... EOF
#   scripts/record-round.sh <issue> <round> verdict <<'EOF' ... EOF

set -euo pipefail

fail() { echo "error: $*" >&2; exit 1; }

[ "$#" -eq 3 ] || fail "usage: scripts/record-round.sh <issue> <round> <report|verdict> < content"

issue=$1
round=$2
kind=$3

[[ $issue =~ ^[0-9]+$ ]] || fail "issue must be a number, got: $issue"
[[ $round =~ ^[1-9][0-9]*$ ]] || fail "round must be a positive number, got: $round"
case $kind in
  report | verdict) ;;
  *) fail "kind must be report or verdict, got: $kind" ;;
esac

[ -t 0 ] && fail "no content: pipe the $kind in on standard input"
content=$(cat)
[ -n "${content//[[:space:]]/}" ] || fail "the $kind is empty; nothing recorded"

# The main working tree is the first entry, and the only one holding handoffs/.
main_root=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "$main_root" ] || fail "not inside a git worktree of this project"

dir="$main_root/handoffs/verdicts/$issue"
file="$dir/round-$round-$kind.md"

mkdir -p "$dir"
if [ -e "$file" ]; then
  action="replaced"
else
  action="recorded"
fi
printf '%s\n' "$content" > "$file"

echo "$action $kind for #$issue, round $round: $file"
