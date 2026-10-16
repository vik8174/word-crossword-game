#!/usr/bin/env bash
# Runs the visual regression check, or updates its baselines, inside the
# Playwright image CI uses (issue #293).
#
# Baselines are made only in that image: font rendering on a Mac differs, and a
# Mac baseline fails every CI run. The image tag is read from the Playwright
# version in apps/web/package.json, the one source CI checks it against, and the
# platform is fixed to linux/amd64, the architecture of the CI runner, so an
# Apple Silicon Mac renders the same pixels (under emulation, so it is slow).
#
# The repository is mounted, but node_modules is not the host's: a named volume
# covers each, so the Linux install does not touch the Mac's.
#
# Usage (through pnpm, from the repository root):
#   pnpm test:visual:docker    compare the stories with the committed baselines
#   pnpm test:visual:update    rewrite the baselines
set -euo pipefail

mode="${1:-test}"
case "$mode" in
  test) extra="" ;;
  update) extra="--update-snapshots" ;;
  *) echo "usage: visual-docker.sh test|update" >&2; exit 2 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$root/apps/web/package.json').devDependencies['@playwright/test']")"
image="mcr.microsoft.com/playwright:v${version}-noble"
docker="${DOCKER:-$(command -v docker || echo /usr/local/bin/docker)}"
port="${VISUAL_PORT:-4174}"

exec "$docker" run --rm --init --ipc=host --platform linux/amd64 \
  -v "$root":/work -w /work \
  -v wcg-visual-node-modules:/work/node_modules \
  -v wcg-visual-web-node-modules:/work/apps/web/node_modules \
  -v wcg-visual-shared-node-modules:/work/packages/shared/node_modules \
  -v wcg-visual-pnpm-store:/pnpm-store \
  -e CI="${CI:-}" -e VISUAL_CONTAINER=1 -e VISUAL_PORT="$port" -e VISUAL_RATIO="${VISUAL_RATIO:-}" \
  "$image" bash -c "
    set -euo pipefail
    corepack enable
    pnpm config set store-dir /pnpm-store
    pnpm install --frozen-lockfile
    pnpm --filter web build-storybook
    pnpm --filter web test:visual $extra
  "
