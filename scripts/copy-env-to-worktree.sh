#!/usr/bin/env bash
# Copy the environment files a worktree cannot get from git.
#
# `apps/web/.env` is git-ignored, so a fresh worktree is created without it.
# A dev server without it answers 200 with an empty page and `Missing Firebase
# env vars` in the console, which looks exactly like a broken app — a trap that
# has cost this project two review rounds.
#
# It exists as a script rather than as a `cp` an agent writes for itself because
# every agent writes a different one. A permission rule matches a command by its
# prefix, so `[ -f x ] && cp x y` is not covered by a rule about `cp`, and each
# new shape either interrupts for approval or leaves another rule behind. One
# name is one rule.
#
# It never prints the contents of anything it copies: these files carry real
# credentials, and this project deliberately denies reading them.
#
# Usage:
#   scripts/copy-env-to-worktree.sh            # into the current worktree
#   scripts/copy-env-to-worktree.sh <path>     # into the worktree at <path>

set -euo pipefail

# Which files to carry across. Extend this rather than teaching agents to copy
# something else by hand.
FILES=(
  "apps/web/.env"
)

target="${1:-$PWD}"

if [ ! -d "$target" ]; then
  echo "error: no such directory: $target" >&2
  exit 1
fi

# The main working tree is the first entry `git worktree list` prints, and it is
# the one holding the real files — every other entry is a worktree that, by the
# nature of this problem, does not have them.
source_root=$(git -C "$target" worktree list --porcelain | awk '/^worktree /{print $2; exit}')

if [ -z "$source_root" ]; then
  echo "error: $target is not inside a git worktree" >&2
  exit 1
fi

target_root=$(git -C "$target" rev-parse --show-toplevel)

if [ "$source_root" = "$target_root" ]; then
  echo "already in the main working tree — nothing to copy"
  exit 0
fi

copied=0
missing=()

for rel in "${FILES[@]}"; do
  src="$source_root/$rel"
  dst="$target_root/$rel"

  if [ ! -f "$src" ]; then
    missing+=("$rel")
    continue
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  copied=$((copied + 1))
  echo "copied $rel"
done

if [ ${#missing[@]} -gt 0 ]; then
  # Not an error on its own: a checkout that never had the file is a setup
  # problem to report, not a failure of this script.
  echo "not found in $source_root: ${missing[*]}" >&2
fi

if [ "$copied" -eq 0 ]; then
  echo "error: nothing was copied — the dev server will not start" >&2
  exit 1
fi
