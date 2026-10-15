import { describe, expect, it } from 'vitest';

import {
  LATIN_EXT_RANGE,
  LATIN_RANGE,
  parseUnicodeRange,
  rangesShareACodePoint,
  spansContain,
} from './font-ranges';

/** Google's stock latin-ext range for Alegreya Sans, as the Fonts CSS API served it on 2026-10-15. */
const STOCK_LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';

/** The seven code points the latin and the stock latin-ext range both hold. */
const SHARED = [0x0131, 0x0152, 0x0153, 0x0304, 0x0308, 0x0329, 0x2020];

const everyCodePointOf = (range: string): Set<number> => {
  const points = new Set<number>();

  for (const { from, to } of parseUnicodeRange(range)) {
    for (let point = from; point <= to; point++) points.add(point);
  }

  return points;
};

describe('the two ranges Alegreya Sans is served in', () => {
  it('share not one code point, so a latin-ext file is never counted with the first visit', () => {
    expect(rangesShareACodePoint(LATIN_RANGE, LATIN_EXT_RANGE)).toBe(false);
  });

  it('are the stock latin-ext range less the seven code points it shares with latin', () => {
    const stock = everyCodePointOf(STOCK_LATIN_EXT);
    const ours = everyCodePointOf(LATIN_EXT_RANGE);
    const latin = everyCodePointOf(LATIN_RANGE);

    // The seven are exactly what the stock range and the latin range hold in common.
    expect([...stock].filter((point) => latin.has(point)).sort((a, b) => a - b)).toEqual(SHARED);
    // And ours is the stock range with those seven taken out, nothing else.
    expect(ours).toEqual(new Set([...stock].filter((point) => !SHARED.includes(point))));
  });
});

describe('parseUnicodeRange', () => {
  it('reads a single code point, a span and a wildcard', () => {
    expect(parseUnicodeRange('U+26, U+0-7F, U+4??')).toEqual([
      { from: 0x26, to: 0x26 },
      { from: 0x0, to: 0x7f },
      { from: 0x400, to: 0x4ff },
    ]);
  });

  it('reads the lower case a minifier may leave, with no space after the comma', () => {
    expect(parseUnicodeRange('u+0100-017f,u+1e00-1eff')).toEqual([
      { from: 0x100, to: 0x17f },
      { from: 0x1e00, to: 0x1eff },
    ]);
  });

  it('refuses an entry it cannot read rather than guessing which ceiling it is for', () => {
    expect(() => parseUnicodeRange('U+0000-00FF, banana')).toThrow(/banana/);
    expect(() => parseUnicodeRange('')).toThrow();
  });
});

describe('spansContain', () => {
  const spans = parseUnicodeRange('U+0100-017F, U+1E9E');

  it('finds a code point at either end of a span and in a single-point entry', () => {
    expect(spansContain(spans, 0x100)).toBe(true);
    expect(spansContain(spans, 0x17f)).toBe(true);
    expect(spansContain(spans, 0x1e9e)).toBe(true);
  });

  it('does not find one just outside', () => {
    expect(spansContain(spans, 0xff)).toBe(false);
    expect(spansContain(spans, 0x180)).toBe(false);
  });
});

describe('rangesShareACodePoint', () => {
  it('is true when the ranges touch at one end', () => {
    expect(rangesShareACodePoint('U+0000-00FF', 'U+00FF-0100')).toBe(true);
  });

  it('is false for neighbours that do not touch', () => {
    expect(rangesShareACodePoint('U+0000-00FF', 'U+0100-017F')).toBe(false);
  });

  it('sees a shared code point inside a long range', () => {
    expect(rangesShareACodePoint('U+1EA0-1EF9', LATIN_EXT_RANGE)).toBe(true);
    expect(rangesShareACodePoint('U+1EA0-1EF9', LATIN_RANGE)).toBe(false);
  });
});
