import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests: a real Chromium against the `e2e` build of the app, served
 * by `vite preview`, which talks to the Firestore and Auth emulators.
 *
 * Run through `pnpm test:e2e` at the repository root, which starts the emulators
 * and passes the ports in the environment. The preview port has its own number
 * and `--strictPort`, and no server is reused, so a run can never land on a dev
 * server built from a real `.env`.
 */
const previewPort = Number(process.env.E2E_PREVIEW_PORT ?? 4173);
/** Keyed by the preview port, so two runs from one worktree do not share a build. */
const outDir = `dist-e2e-${previewPort}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `pnpm exec vite build --mode e2e --outDir ${outDir} --emptyOutDir && pnpm exec vite preview --mode e2e --outDir ${outDir} --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
