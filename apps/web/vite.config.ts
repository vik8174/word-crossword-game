import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import { readGitRevision, resolveReleaseName } from './build/release-name.ts';

/** Where the maps go. Neither is a secret; both are stage-only (ADR 0007). */
const SENTRY_ORG = 'kurysh-labs';
const SENTRY_PROJECT = 'word-crossword-game';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Deliberately not `VITE_`-prefixed. Vite embeds every `VITE_` variable into
  // the client bundle in plain text, and this bundle is served from public
  // hosting out of a public repository — a `VITE_SENTRY_AUTH_TOKEN` would be a
  // published Sentry token. Read here on the Node side and nowhere else.
  const { SENTRY_AUTH_TOKEN } = loadEnv(mode, import.meta.dirname, 'SENTRY_');

  // Resolved once and handed to both sides: the upload files the maps under
  // this name, and the bundle reports its errors under it. Two names would
  // leave Sentry holding maps and events it cannot match.
  const release = resolveReleaseName(readGitRevision);

  // Uploading is what deletes the maps again, so a build that cannot upload
  // must not generate them either: nothing would clean them out of `dist`, and
  // Firebase Hosting publishes `dist` whole. No token, no maps at all — the
  // build still succeeds, exactly as the app runs without a DSN.
  //
  // A build that could not name itself does not upload either, and that is the
  // point of saying it here rather than leaving `release.name` undefined: left
  // to itself the plugin looks for a revision of its own, in CI variables this
  // config never read, and would file the maps under a name the bundle has no
  // idea about. Maps and events would both arrive and never meet.
  const uploadsSourceMaps = Boolean(SENTRY_AUTH_TOKEN) && release !== undefined;

  return {
    plugins: [
      react(),
      ...(uploadsSourceMaps
        ? [
            sentryVitePlugin({
              org: SENTRY_ORG,
              project: SENTRY_PROJECT,
              authToken: SENTRY_AUTH_TOKEN,
              release: { name: release },
              sourcemaps: {
                // The maps are for Sentry, not for players. Deleted from `dist`
                // once uploaded, and `apps/web/scripts/assert-no-source-maps.mjs`
                // fails the build if any survive.
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
              // Build-machine telemetry about this plugin's own runs. Off for
              // the same reason the browser sends as little as it does: the
              // project sends what it needs and says so (ADR 0014).
              telemetry: false,
            }),
          ]
        : []),
    ],

    // `hidden` rather than `true`: the maps are written for the upload, but no
    // `sourceMappingURL` comment points a browser at files that will not be
    // there.
    build: {
      sourcemap: uploadsSourceMaps ? ('hidden' as const) : false,
    },

    // The one way the release name reaches the running app: `main.tsx` hands
    // `import.meta.env` to `initializeErrorReporting`, and this key is part of
    // it. Empty when the build could not name itself, which reads the same as
    // absent.
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release ?? ''),
    },
  };
});
