import { defineConfig } from '@playwright/test';

/**
 * Visual regression: every workshop story, screenshotted at the app's three
 * widths and compared with a committed baseline (issue #293).
 *
 * Chromium serves `storybook-static` through `vite preview`, so `pnpm
 * build-storybook` must have run first (`pnpm test:visual` at the repository
 * root does both). The baselines are rendered only by CI, in the `Visual` job's
 * image on GitHub's amd64 runner, and taken from its artifact with `pnpm
 * test:visual:accept <run-id>`: a baseline rendered anywhere else fails every CI
 * run (a Mac's fonts differ, and an emulated amd64 image rendered without the
 * MUI styles at all).
 */
const port = Number(process.env.VISUAL_PORT ?? 4174);

/**
 * The largest share of pixels that may differ before a shot fails, one value
 * for every shot, with no per-pixel tolerance (`threshold: 0` below: Playwright's
 * default 0.2 would let a colour change of 8 in one channel through). Set from measurement, see CONTRIBUTING.md. `VISUAL_RATIO`
 * overrides it to take a diagnostic reading, never to pass a run.
 */
const maxDiffPixelRatio = Number(process.env.VISUAL_RATIO || 0.0002);

export default defineConfig({
  testDir: './visual',
  testMatch: '**/*.visual.ts',
  outputDir: './test-results-visual',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  snapshotDir: './visual/baselines',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // `none`: a missing baseline fails and leaves its `actual` image in the
  // artifact, which `pnpm test:visual:accept` turns into a baseline. Nothing
  // writes a baseline in place.
  updateSnapshots: 'none',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  expect: {
    toHaveScreenshot: { threshold: 0, maxDiffPixelRatio, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
