/**
 * Lighthouse CI for `/` and `/create` (issue #290).
 *
 * Run through `pnpm test:lighthouse` at the repository root, which starts the
 * Firestore and Auth emulators (scripts/run-e2e.mjs), builds the `e2e` build and
 * runs `lhci autorun` once per preset (apps/web/scripts/run-lighthouse.mjs, which
 * sets LH_PRESET). A plain build cannot start without Firebase values and
 * `/create` is not a file in `dist`, so the server is `vite preview` on the
 * `e2e` build, as in the E2E job. The browser is the Playwright Chromium named
 * by CHROME_PATH, so its version is pinned with Playwright.
 *
 * THRESHOLDS come from CI runs only, never from a Mac. Each is the lowest
 * median-run score of five runs of the Lighthouse job on one unchanged commit,
 * minus 5 points. A threshold is changed only by a pull request that edits this
 * file with the new measurement beside it; LOWERING one needs Viktor's word on
 * that pull request (CONTRIBUTING.md, "Lighthouse").
 *
 * CALIBRATION. Five runs of the Lighthouse job on one unchanged commit,
 * abc3543 (2026-10-16, GitHub's ubuntu-latest runner, Playwright Chromium
 * 156.0.8078.4, Lighthouse 12.6.1 from @lhci/cli 0.15.1, the `e2e` build with
 * Sentry and Analytics off), the median-run score of each, as the job printed
 * them (`SCORES` lines) :
 *
 *   mobile  /        performance .92 .92 .92 .92 .92   accessibility 1 (x5)  best-practices .96 (x5)  seo .82 (x5)
 *   mobile  /create  performance .73 .73 .73 .74 .73   accessibility 1 (x5)  best-practices .96 (x5)  seo .82 (x5)
 *   desktop /        performance 1 (x5)                accessibility 1 (x5)  best-practices .96 (x5)  seo .82 (x5)
 *   desktop /create  performance .99 (x5)              accessibility 1 (x5)  best-practices .96 (x5)  seo .82 (x5)
 *
 * Each threshold below is the lowest of the five minus .05. The scores did not
 * move between runs, so the margin is the whole allowance. The best-practices
 * .96 includes a console error that is an artefact of the `e2e` build (the
 * Analytics SDK reaching Google with a placeholder key); it is not the app's.
 */
const preset = process.env.LH_PRESET === 'desktop' ? 'desktop' : 'mobile';
const port = Number(process.env.LHCI_PORT ?? 4175);
const origin = `http://127.0.0.1:${port}`;

/** Minimum median-run score per page and preset, 0 to 1. */
const THRESHOLDS = {
  mobile: {
    '/': { performance: 0.87, accessibility: 0.95, 'best-practices': 0.91, seo: 0.77 },
    '/create': { performance: 0.68, accessibility: 0.95, 'best-practices': 0.91, seo: 0.77 },
  },
  desktop: {
    '/': { performance: 0.95, accessibility: 0.95, 'best-practices': 0.91, seo: 0.77 },
    '/create': { performance: 0.94, accessibility: 0.95, 'best-practices': 0.91, seo: 0.77 },
  },
};

const assertMatrix = Object.entries(THRESHOLDS[preset]).map(([path, scores]) => ({
  matchingUrlPattern: `^${origin.replaceAll('.', '\\.')}${path}$`,
  assertions: Object.fromEntries(
    Object.entries(scores).map(([category, minScore]) => [
      `categories:${category}`,
      ['error', { minScore, aggregationMethod: 'median-run' }],
    ]),
  ),
}));

module.exports = {
  ci: {
    collect: {
      url: [`${origin}/`, `${origin}/create`],
      numberOfRuns: 3,
      // The build is made by run-lighthouse.mjs, once for both presets.
      startServerCommand: `pnpm exec vite preview --mode e2e --outDir dist-lhci --host 127.0.0.1 --port ${port} --strictPort`,
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 60000,
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: { assertMatrix },
    upload: { target: 'filesystem', outputDir: `.lighthouseci/${preset}` },
  },
};
