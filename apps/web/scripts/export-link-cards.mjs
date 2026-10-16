#!/usr/bin/env node
/**
 * Exports the two link cards (issue #289) from the template, so they can be made
 * again when the drawing changes.
 *
 *   node scripts/export-link-cards.mjs
 *
 * Writes `link-card/production.png` from the template's `link-card` state and
 * `link-card/stage.png` from `link-card/stage`, each 1200 x 630 at a device scale
 * factor of 1. The template asks Google Fonts for Alegreya Sans; this script
 * answers that request from the faces in `public/fonts/` instead, so an export
 * needs no network and the same bytes draw the card as draw the app.
 *
 * Needs a Playwright Chromium (`pnpm exec playwright install chromium`).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const web = resolve(import.meta.dirname, '..');
const template = pathToFileURL(resolve(web, '../../design/templates/state-tree.html')).href;
const fonts = resolve(web, 'public/fonts');

const CARDS = [
  { state: 'link-card', file: 'link-card/production.png' },
  { state: 'link-card/stage', file: 'link-card/stage.png' },
];

/** The faces the template asks Google for, as local data URLs (latin range). */
const faceCss = () =>
  [
    ['normal', 400, 'latin-400'],
    ['normal', 700, 'latin-700'],
    ['italic', 400, 'latin-400italic'],
  ]
    .map(([style, weight, name]) => {
      const data = readFileSync(resolve(fonts, `alegreya-sans-v28-${name}.woff2`)).toString(
        'base64',
      );
      return `@font-face{font-family:'Alegreya Sans';font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
    })
    .join('\n');

const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: faceCss() }),
  );
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());

  for (const { state, file } of CARDS) {
    const page = await context.newPage();
    await page.goto(`${template}?bare&state=${state}`);
    await page.waitForSelector('.card .title');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const loaded = await page.evaluate(() => document.fonts.check('700 40px "Alegreya Sans"'));

    if (!loaded) {
      throw new Error(`Alegreya Sans did not load for ${state}; the card would use a fallback.`);
    }

    writeFileSync(resolve(web, file), await page.screenshot({ type: 'png' }));
    console.log(`Wrote ${file}`);
    await page.close();
  }
} finally {
  await browser.close();
}
