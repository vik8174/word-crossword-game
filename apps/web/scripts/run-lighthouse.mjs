#!/usr/bin/env node
/**
 * Builds the `e2e` build once and runs Lighthouse CI for the mobile and the
 * desktop preset (see ../lighthouserc.cjs). Both presets always run, so one
 * failure does not hide the other. Prints the median-run scores of every page
 * and preset, which is what the thresholds are calibrated from.
 *
 * The build runs with `ENVIRONMENT=production`. With `ENVIRONMENT` unset the
 * build is the stage site, which carries `noindex` on purpose (#289), and the
 * SEO audit `is-crawlable` then fails on every page. Lighthouse must measure
 * the page a crawler is meant to index, so this build is the production one
 * and the SEO threshold stays where it is. Only this build changes: the E2E
 * job's own build stays stage.
 *
 * Expects the emulator ports in VITE_EMULATOR_* (scripts/run-e2e.mjs sets them)
 * and CHROME_PATH.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const web = resolve(import.meta.dirname, '..');
const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { cwd: web, stdio: 'inherit', env: { ...process.env, ...env } }).status ?? 1;

rmSync(resolve(web, '.lighthouseci'), { recursive: true, force: true });

if (!process.env.CHROME_PATH) {
  console.error('CHROME_PATH is not set: the browser must be the Playwright Chromium.');
  process.exit(1);
}

if (
  run(
    'pnpm',
    ['exec', 'vite', 'build', '--mode', 'e2e', '--outDir', 'dist-lhci', '--emptyOutDir'],
    { ENVIRONMENT: 'production' },
  ) !== 0
) {
  process.exit(1);
}

let status = 0;
for (const preset of ['mobile', 'desktop']) {
  // Not `status ||= run(...)`: that skips the run once an earlier preset has failed.
  const failed = run('pnpm', ['exec', 'lhci', 'autorun', '--config=./lighthouserc.cjs'], {
    LH_PRESET: preset,
  });
  if (failed) status = 1;
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(web, `.lighthouseci/${preset}/manifest.json`), 'utf8'),
    );
    for (const run of manifest.filter((entry) => entry.isRepresentativeRun)) {
      const { performance, accessibility, 'best-practices': bp, seo } = run.summary;
      const path = new URL(run.url).pathname;
      console.log(
        `SCORES ${preset} ${path} performance=${performance} accessibility=${accessibility} best-practices=${bp} seo=${seo}`,
      );
    }
  } catch (error) {
    console.error(`no manifest for ${preset}:`, error.message);
    status = 1;
  }
}
process.exit(status);
