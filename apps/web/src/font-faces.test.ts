import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FONT_FAMILY_NAME, FONT_FILES, LATIN_RANGE } from './font-faces';

const WEB_ROOT = resolve(__dirname, '..');

/** The two static documents that declare the face: the app's, and the workshop's. */
const DECLARATIONS = [
  { name: 'index.html', path: resolve(WEB_ROOT, 'index.html') },
  { name: '.storybook/preview-head.html', path: resolve(WEB_ROOT, '.storybook/preview-head.html') },
] as const;

/** Whitespace folded, so a range wrapped across lines by the formatter still compares. */
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe.each(DECLARATIONS)('the face as $name declares it', ({ path }) => {
  const html = readFileSync(path, 'utf8');
  const blocks = html.match(/@font-face\s*{[^}]*}/g) ?? [];

  it('declares exactly the three Alegreya Sans files, and nothing else', () => {
    expect(blocks).toHaveLength(FONT_FILES.length);

    for (const file of FONT_FILES) {
      const block = blocks.find((candidate) => candidate.includes(file.href));

      expect(block, file.href).toBeDefined();
      expect(block).toContain(`font-family: '${FONT_FAMILY_NAME}'`);
      expect(block).toContain(`font-weight: ${file.weight}`);
      expect(block).toContain(`font-style: ${file.style}`);
    }
  });

  it('gives every face the latin range, and the same one', () => {
    for (const block of blocks) {
      const range = /unicode-range:([^;]*);/.exec(block)?.[1] ?? '';

      expect(squash(range)).toBe(LATIN_RANGE);
    }
  });

  it('preloads the 400 and the 700 as woff2 fonts, and the italic not at all', () => {
    for (const file of FONT_FILES) {
      const preload = new RegExp(
        `<link\\s+rel="preload"\\s+href="${file.href}"\\s+as="font"\\s+type="font/woff2"\\s+crossorigin\\s*/>`,
      );

      if (file.preloaded) {
        expect(html).toMatch(preload);
      } else {
        expect(html).not.toMatch(preload);
        expect(html).not.toMatch(new RegExp(`rel="preload"[^>]*${file.href}`));
      }
    }
  });

  it('names no other family and no font host', () => {
    expect(html).not.toMatch(/Zen Kaku|Dela Gothic|zen-kaku|dela-gothic/i);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});

describe('the files behind the face', () => {
  it.each(FONT_FILES)('serves $href as a woff2 from this origin', ({ href }) => {
    const file = resolve(WEB_ROOT, 'public', href.slice(1));

    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  it('keeps the licence of the face beside the files', () => {
    const licence = readFileSync(resolve(WEB_ROOT, 'public/fonts/OFL.txt'), 'utf8');

    expect(licence).toContain('The Alegreya Sans Project Authors');
    expect(licence).not.toMatch(/Zen Kaku|Dela Gothic/);
  });
});
