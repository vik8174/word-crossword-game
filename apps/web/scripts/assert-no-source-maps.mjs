/**
 * Fails the build if a source map survived into what gets deployed.
 *
 * Firebase Hosting publishes the whole of `apps/web/dist` (`firebase.json`),
 * and its `ignore` patterns do not cover `.map`. A map served next to the
 * bundle hands every player the unminified source, which is the one thing an
 * uploaded map must not do: it is for Sentry, not for the browser.
 *
 * Two arrangements keep maps out of `dist`, and this guard is what proves
 * either of them still holds. Builds that upload maps delete them afterwards
 * (`sourcemaps.filesToDeleteAfterUpload`); builds with no Sentry token never
 * generate maps in the first place.
 */

import { existsSync, readdirSync } from 'node:fs';

const distDirectory = new URL('../dist/', import.meta.url);

if (!existsSync(distDirectory)) {
  console.error('No dist directory to check — this guard runs after `vite build`.');
  process.exit(1);
}

const sourceMaps = readdirSync(distDirectory, { recursive: true, encoding: 'utf8' }).filter(
  (entry) => entry.endsWith('.map'),
);

if (sourceMaps.length > 0) {
  console.error(
    `Source maps left in dist and would be deployed to players:\n${sourceMaps
      .map((entry) => `  dist/${entry}`)
      .join('\n')}`,
  );
  process.exit(1);
}

console.log('No source maps in dist.');
