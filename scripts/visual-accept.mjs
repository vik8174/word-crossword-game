#!/usr/bin/env node
// Takes the baselines a CI run rendered (issue #293).
//
//   pnpm test:visual:accept <run-id>
//
// A `Visual` job that fails, or is run on purpose with a baseline missing,
// uploads the `visual-diffs` artifact: for each shot the expected, actual and
// diff images. This downloads that artifact with `gh run download` and writes
// every `actual` image into `apps/web/visual/baselines/`, named as the test
// expects. The developer looks at the changed PNGs and commits them. Nothing
// here pushes, and no workflow commits: a baseline is only ever one that the CI
// image rendered, never one made on a Mac.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARTIFACT = 'visual-diffs';
const SUFFIX = '-actual.png';

const runId = process.argv[2];

if (!runId || !/^\d+$/.test(runId)) {
  console.error('usage: pnpm test:visual:accept <run-id>   (the number in the run URL)');
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'apps/web/visual/baselines');
const scratch = mkdtempSync(join(tmpdir(), 'visual-accept-'));

/** Every file under a directory, as paths. */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    return statSync(path).isDirectory() ? walk(path) : [path];
  });

try {
  execFileSync('gh', ['run', 'download', runId, '-n', ARTIFACT, '-D', scratch], {
    cwd: root,
    stdio: 'inherit',
  });

  const actuals = walk(scratch).filter((file) => file.endsWith(SUFFIX));

  mkdirSync(target, { recursive: true });

  for (const file of actuals) {
    const name = `${file.slice(file.lastIndexOf('/') + 1, -SUFFIX.length)}.png`;

    copyFileSync(file, join(target, name));
  }

  console.log(`${actuals.length} baselines written to apps/web/visual/baselines/`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
