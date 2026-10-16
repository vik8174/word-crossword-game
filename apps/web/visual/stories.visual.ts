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

/** How long a story may take to render and style before the test says which step stalled. */
const STEP_TIMEOUT_MS = 15_000;

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
    { ...POLL, timeout: STEP_TIMEOUT_MS },
  );

/** Refuses `--update-snapshots`: a baseline is only ever one CI rendered. */
const refuseUpdate = (updateSnapshots: string) => {
  if (updateSnapshots !== 'none') {
    throw new Error(
      'Baselines are rendered only by CI: take them with `pnpm test:visual:accept <run-id>`',
    );
  }
};

/**
 * The Emotion classes on the story that have no rule in any stylesheet.
 *
 * MUI marks each styled element with a `css-<hash>` class, and Emotion inserts
 * the rule for it into a `<style data-emotion>` sheet. `css-0` is the class
 * Emotion gives an empty style (a `Box` with no props): it has no rule and
 * never will, so it is not a missing one.
 */
const classesWithoutRule = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const rules: string[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        rules.push(Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n'));
      } catch {
        // A cross-origin sheet cannot be read, and holds no Emotion rules.
      }
    }

    const css = rules.join('\n');
    const missing = new Set<string>();

    document.querySelectorAll('#storybook-root *').forEach((element) => {
      element.classList.forEach((name) => {
        if (/^css-/.test(name) && name !== 'css-0' && !css.includes(`.${name}`)) {
          missing.add(name);
        }
      });
    });

    return Array.from(missing);
  });

/**
 * Waits until every Emotion class on the story has its rule in a stylesheet.
 *
 * A shot taken when an element carries the class and the sheet does not hold
 * the rule is a shot of an unstyled element, which is what an emulated, slow
 * CPU produced (no padding, no radius). Checking the rule for the very class on
 * the element, rather than a fixed delay or one known element, covers every
 * story, and a story with no Emotion class (the SVG-only ones) passes at once.
 * It fails after `STEP_TIMEOUT_MS`, naming the classes that never got a rule,
 * rather than holding the test until the test timeout.
 */
const waitForStylesApplied = async (page: Page) => {
  const deadline = Date.now() + STEP_TIMEOUT_MS;
  let missing = await classesWithoutRule(page);

  while (missing.length > 0 && Date.now() < deadline) {
    // Real time, not the page's fake clock: the wait is for the browser, not the story.
    await new Promise((done) => setTimeout(done, 50));
    missing = await classesWithoutRule(page);
  }

  if (missing.length > 0) {
    throw new Error(
      `${missing.length} Emotion class(es) have no rule after ${STEP_TIMEOUT_MS} ms: ${missing.join(', ')}`,
    );
  }
};

for (const id of readStoryIds()) {
  for (const { width, height } of WIDTHS) {
    test(`${id} at ${width}`, async ({ page }, testInfo) => {
      refuseUpdate(testInfo.config.updateSnapshots);
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
      await waitForStylesApplied(page);
      await page.evaluate(() => document.fonts.ready);
      // Run the screen-enter timer out, then hold the clock still.
      await page.clock.runFor(ENTER_MS + 500);
      await page.waitForFunction(() => document.querySelector('.enter') === null, undefined, {
        ...POLL,
        timeout: STEP_TIMEOUT_MS,
      });
      await page.clock.setFixedTime(FIXED_TIME);
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${id}--${width}.png`);
    });
  }
}
