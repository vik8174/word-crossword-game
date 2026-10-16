import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/**
 * One screenshot per story per width, compared with `visual/baselines/`.
 *
 * Stories are read from `storybook-static/index.json`, so a new story is
 * covered the moment it exists, and fails until its baseline is committed.
 */

/** The app's three widths. */
const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 834, height: 1112 },
  { width: 375, height: 812 },
] as const;

/** The one instant every story believes it is, so `Date.now()` is the same in every run. */
const FIXED_TIME = new Date('2026-01-15T12:00:00.000Z');

/** `ENTER_MS` of `src/motion.ts`, with a margin: a screen's enter mark is on for this long. */
const ENTER_MS = 2000;

/** Poll on an interval: the default polls on animation frames, which the fake clock holds back. */
const POLL = { polling: 50 };

interface IndexEntry {
  readonly id: string;
  readonly type: string;
}

const readStoryIds = (): string[] => {
  const file = resolve(process.cwd(), 'storybook-static/index.json');
  let raw: string;

  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`${file} is missing: run \`pnpm build-storybook\` first`, { cause: error });
  }

  const entries = (JSON.parse(raw) as { entries: Record<string, IndexEntry> }).entries;

  return Object.values(entries)
    .filter((entry) => entry.type === 'story')
    .map((entry) => entry.id)
    .sort();
};

/** Storybook's own signal that the story rendered and its play function finished. */
const waitForStoryRendered = (page: Page) =>
  page.waitForFunction(
    () => {
      const preview = (
        window as unknown as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } }
      ).__STORYBOOK_PREVIEW__;
      const phase = preview?.currentRender?.phase;

      return phase === 'finished' || phase === 'errored' || phase === 'aborted';
    },
    undefined,
    POLL,
  );

/** Refuses to write a baseline anywhere but inside the Playwright image. */
const refuseOutsideImage = (updateSnapshots: string) => {
  if (updateSnapshots !== 'none' && !process.env.VISUAL_CONTAINER) {
    throw new Error(
      'Baselines are made only inside the Playwright image: run `pnpm test:visual:update`',
    );
  }
};

for (const id of readStoryIds()) {
  for (const { width, height } of WIDTHS) {
    test(`${id} at ${width}`, async ({ page }, testInfo) => {
      refuseOutsideImage(testInfo.config.updateSnapshots);
      await page.setViewportSize({ width, height });
      // Anything that is not the local preview is refused: a story has no
      // business reaching out.
      await page.route(
        (url) => url.hostname !== '127.0.0.1',
        (route) => route.abort(),
      );
      await page.clock.install({ time: FIXED_TIME });
      await page.goto(`/iframe.html?id=${id}&viewMode=story`);
      await waitForStoryRendered(page);
      await page.evaluate(() => document.fonts.ready);
      // Run the screen-enter timer out, then hold the clock still.
      await page.clock.runFor(ENTER_MS + 500);
      await page.waitForFunction(() => document.querySelector('.enter') === null, undefined, POLL);
      await page.clock.setFixedTime(FIXED_TIME);
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${id}--${width}.png`);
    });
  }
}
