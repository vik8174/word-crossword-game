#!/usr/bin/env bash
# Proves that the commit at HEAD came from a pull request whose eight CI checks
# all passed, on a head whose tree is exactly the tree of HEAD.
#
# CI runs on pull requests only (`ci.yml`), so a commit on `main` carries the
# deploy's checks and not CI's. Visual and Lighthouse are calibrated on CI and
# cannot be run locally (contract, "Visual" and "Lighthouse"), so a release
# reads them from the pull request that produced the commit. The merge hook
# refuses a pull request that is behind its base, so the squashed commit and
# the pull request's head have the same tree; this script checks that too
# rather than assume it.
#
# The checks to require are the arguments, all eight when none is given:
#   scripts/gate-merged-pr-green.sh Visual
#
# Exits 0 when all of that holds, 1 otherwise, saying which part failed.
set -euo pipefail

if [ "$#" -gt 0 ]; then REQUIRED=("$@"); else REQUIRED=(Lint Test Coverage Build Rules E2E Visual Lighthouse); fi

sha=$(git rev-parse HEAD)
pr=$(gh api "repos/{owner}/{repo}/commits/$sha/pulls" --jq '.[0].number // empty')
if [ -z "$pr" ]; then
  echo "FAIL: no pull request produced $sha"
  exit 1
fi
echo "commit $sha came from pull request #$pr"

head=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
git fetch -q origin "$head" 2>/dev/null || true
if ! git cat-file -e "$head^{commit}" 2>/dev/null; then
  echo "FAIL: the head $head of #$pr is not reachable to compare trees"
  exit 1
fi
if [ "$(git rev-parse "$head^{tree}")" != "$(git rev-parse "HEAD^{tree}")" ]; then
  echo "FAIL: the tree of #$pr's head $head differs from the tree of $sha"
  exit 1
fi
echo "the tree of #$pr's head $head equals the tree of $sha"

checks=$(gh pr checks "$pr" --json name,state --jq '.[] | "\(.name) \(.state)"')
status=0
for name in "${REQUIRED[@]}"; do
  state=$(printf '%s\n' "$checks" | awk -v n="$name" '$1 == n { print $2 }' | tail -1)
  if [ "$state" = "SUCCESS" ]; then
    echo "  $name: SUCCESS"
  else
    echo "  $name: ${state:-MISSING}"
    status=1
  fi
done
[ "$status" -eq 0 ] && echo "all ${#REQUIRED[@]} CI checks of #$pr passed" || echo "FAIL: not every CI check of #$pr passed"
exit "$status"
