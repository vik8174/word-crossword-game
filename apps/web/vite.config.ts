import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import {
  type FetchedFile,
  FIRST_VISIT_CEILING_BYTES,
  firstVisitWeight,
  preloadedHrefs,
  tooHeavyReport,
} from './build/first-visit-weight.ts';
import { readGitRevision, readPackageVersion, resolveReleaseName } from './build/release-name.ts';
import {
  type BundleChunk,
  reachableChunks,
  routeChunkFor,
  routeChunks,
  routePreloadScript,
} from './build/route-preload.ts';
import { shouldUploadSourceMaps } from './build/source-map-upload.ts';
import { ROOM_ROUTE_PATTERN } from './src/rooms/room-link.ts';

/**
 * Where the maps go. Neither is a secret, and there is one project for both
 * deployments: stage and production report into it and are told apart by the
 * environment their events carry (ADR 0020).
 */
const SENTRY_ORG = 'kurysh-labs';
const SENTRY_PROJECT = 'word-crossword-game';

/**
 * The routes that have to stay loaded on demand, and the build fails without.
 *
 * Both of them are what keeps Firestore and Anonymous Auth off the landing
 * page: `/create` reaches the SDKs through `room-service.ts` exactly as the
 * room does. Turning either back into an ordinary import would put them there
 * again — with every test still passing, since nothing a test renders can see
 * which chunk a module ended up in.
 */
const LAZY_ROUTE_MODULES = ['src/pages/CreateRoomPage.tsx', 'src/pages/RoomPage.tsx'];

/** The module the room route is loaded from. */
const ROOM_PAGE_MODULE = 'src/pages/RoomPage.tsx';

/** The addresses it is loaded for: `/room/:roomId` as far as its first parameter. */
const ROOM_PATH_PREFIX = ROOM_ROUTE_PATTERN.slice(0, ROOM_ROUTE_PATTERN.indexOf(':'));

/**
 * The chunk a route was built into, insisted upon.
 *
 * @param chunks - All chunks the build produced
 * @param module - Path of the route module
 * @returns The chunk built for it
 * @throws When the route has no chunk of its own, i.e. it is no longer lazy
 */
const lazyRouteChunk = (chunks: readonly BundleChunk[], module: string): BundleChunk => {
  const chunk = routeChunkFor(chunks, module);

  if (chunk === undefined) {
    throw new Error(
      `${module} is not a chunk of its own, so that route is no longer loaded on demand. ` +
        'Restore its lazy import in App.tsx, or take it out of LAZY_ROUTE_MODULES here.',
    );
  }

  return chunk;
};

/**
 * Names the room route's chunks in the HTML, so an invite link does not pay a
 * round trip the single-file build never charged.
 *
 * Why it is worth doing at all is in `build/route-preload.ts`. The plugin's own
 * part is small: find the chunk the room page ends up in, work out what it
 * needs beyond the first load, and hand the list to a script that only acts on
 * the addresses it belongs to.
 *
 * It also fails the build if any of {@link LAZY_ROUTE_MODULES} is not a chunk
 * of its own, which is what a route quietly ceasing to be lazy looks like from
 * here. This is the only place that can see it: the preload would merely become
 * an empty list, and no test renders a chunk.
 */
const preloadRoomRoute = (): Plugin => {
  let base = '/';

  return {
    name: 'preload-room-route',
    apply: 'build',

    configResolved(config) {
      base = config.base;
    },

    transformIndexHtml: {
      order: 'post',

      handler(html, { bundle, chunk }) {
        if (bundle === undefined || chunk === undefined) {
          return;
        }

        const chunks: BundleChunk[] = Object.values(bundle).filter(
          (output) => output.type === 'chunk',
        );

        for (const module of LAZY_ROUTE_MODULES) {
          lazyRouteChunk(chunks, module);
        }

        const roomPage = lazyRouteChunk(chunks, ROOM_PAGE_MODULE);
        const hrefs = routeChunks(chunks, roomPage.fileName, chunk.fileName).map(
          (fileName) => `${base}${fileName}`,
        );
        const script = routePreloadScript([{ prefix: ROOM_PATH_PREFIX, hrefs }]);

        return script === ''
          ? undefined
          : { html, tags: [{ tag: 'script', children: script, injectTo: 'head' as const }] };
      },
    },
  };
};

/** The one file a visitor asks for by name, and everything else follows from it. */
const HTML_FILE = 'index.html';

/**
 * Fails the build when a first visit to the landing page has got too heavy.
 *
 * Why there is a ceiling at all, and what counts as a first visit, is in
 * `build/first-visit-weight.ts`. The plugin's own part is small: it is the only
 * place in the project that can see both what was built and what the HTML asks
 * for up front, which is what the measurement needs — the chunks come off the
 * bundle, and the font comes off a `<link rel="preload">` written by hand,
 * because a file copied out of `public/` is in no bundle at all.
 *
 * It runs after the files are written rather than while they are being made, so
 * what it weighs is what a browser would actually be sent.
 */
const capFirstVisit = (): Plugin => {
  let outDir = 'dist';
  let base = '/';

  /** What one built file weighs over the wire. */
  const weigh = (fileName: string): FetchedFile => ({
    fileName,
    gzipBytes: gzipSync(readFileSync(resolve(outDir, fileName))).length,
  });

  return {
    name: 'cap-first-visit',
    apply: 'build',

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      base = config.base;
    },

    writeBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const chunks: BundleChunk[] = outputs.filter((output) => output.type === 'chunk');
      const entry = outputs.find((output) => output.type === 'chunk' && output.isEntry);
      const html = bundle[HTML_FILE];

      if (entry === undefined || html === undefined || html.type !== 'asset') {
        this.error(
          `Nothing to weigh: the build produced no ${HTML_FILE} with an entry chunk behind it.`,
        );

        return;
      }

      const page =
        typeof html.source === 'string' ? html.source : Buffer.from(html.source).toString('utf8');
      const preloaded = preloadedHrefs(page).map((href) =>
        href.startsWith(base) ? href.slice(base.length) : href.replace(/^\//, ''),
      );
      const files: readonly FetchedFile[] = [
        { fileName: HTML_FILE, gzipBytes: gzipSync(page).length },
        ...reachableChunks(chunks, entry.fileName).map(weigh),
        ...preloaded.map(weigh),
      ];
      const complaint = tooHeavyReport(files, FIRST_VISIT_CEILING_BYTES);

      if (complaint !== null) {
        this.error(complaint);

        return;
      }

      console.log(
        `First visit: ${(firstVisitWeight(files) / 1024).toFixed(1)} KiB gzipped, of ${(
          FIRST_VISIT_CEILING_BYTES / 1024
        ).toFixed(1)} KiB allowed.`,
      );
    },
  };
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Deliberately not `VITE_`-prefixed. Vite embeds every `VITE_` variable into
  // the client bundle in plain text, and this bundle is served from public
  // hosting out of a public repository — a `VITE_SENTRY_AUTH_TOKEN` would be a
  // published Sentry token. Read here on the Node side and nowhere else.
  const { SENTRY_AUTH_TOKEN } = loadEnv(mode, import.meta.dirname, 'SENTRY_');

  // Resolved once and handed to both sides: the upload files the maps under
  // this name, and the bundle reports its errors under it. Two names would
  // leave Sentry holding maps and events it cannot match. Always a name — the
  // version comes from a file, so there is no build that cannot say what it is.
  const release = resolveReleaseName(readPackageVersion, readGitRevision);

  // Either the build writes maps and sends them, or it writes none at all. A
  // build without a token still succeeds, exactly as the app runs without a DSN.
  const uploadsSourceMaps = shouldUploadSourceMaps(SENTRY_AUTH_TOKEN);

  return {
    plugins: [
      react(),
      preloadRoomRoute(),
      capFirstVisit(),
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

      // What the app is cut into, and it is cut along two different lines.
      //
      // The routes that open a room are loaded on demand (`App.tsx`), which is
      // what takes Firestore, Auth and the crossword generator off the landing
      // page. That is the split that makes the first screen smaller.
      //
      // These groups are the other one, and they change nothing about how much
      // a first visit costs: they keep the libraries out of the chunk the app's
      // own code lives in. The app changes every week and the libraries do not,
      // so a release that would otherwise hand every returning player half a
      // megabyte again hands them a few kilobytes instead.
      //
      // Ordered by priority rather than by listing, because a group takes the
      // dependencies of what it captures with it: React is claimed first so
      // that MUI, which is built on it, does not swallow it.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
                priority: 30,
              },
              // Grouped by which routes actually use it rather than all in one
              // chunk: the room uses components the landing page does not, and
              // a single MUI chunk would put those on the landing page too —
              // which is the very cost this ticket is about.
              {
                name: 'mui',
                test: /node_modules[\\/](@mui|@emotion)[\\/]/,
                priority: 20,
                entriesAware: true,
              },
              { name: 'sentry', test: /node_modules[\\/]@sentry(-internal)?[\\/]/, priority: 20 },
              // Firebase comes in two halves and they belong on opposite sides
              // of the split. The core and the analytics run on every page, so
              // they are claimed first — otherwise the group below takes them
              // along as dependencies and drags the whole of Firestore onto the
              // landing page with them.
              {
                name: 'firebase-core',
                test: /node_modules[\\/]@firebase[\\/](app|analytics|installations|component|logger|util)[\\/]/,
                priority: 25,
              },
              // The other half is only reached from the room routes, so this
              // chunk is fetched when a room is opened and never on the landing
              // page. Kept out of the room's own chunk for the same reason as
              // the rest: the SDK is the largest thing here and the one least
              // likely to change.
              {
                name: 'firebase-room',
                test: /node_modules[\\/]@firebase[\\/](firestore|auth|webchannel-wrapper)/,
                priority: 20,
              },
            ],
          },
        },
      },
    },

    // The one way the release name reaches the running app: `main.tsx` hands
    // `import.meta.env` to `initializeErrorReporting`, and this key is part of
    // it.
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release),
    },
  };
});
