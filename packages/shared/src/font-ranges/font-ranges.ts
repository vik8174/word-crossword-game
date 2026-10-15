/**
 * The two `unicode-range`s Alegreya Sans is served in, and the little parser
 * that reads one.
 *
 * This file imports nothing, and that is on purpose. `apps/web/vite.config.ts`
 * and `apps/web/build/` import it by its relative `.ts` path: Vite's config
 * loader hands `from 'shared'` to Node, and Node 22 cannot load the package's
 * `src/index.ts` (`ERR_UNSUPPORTED_DIR_IMPORT`). A file that stands alone, in
 * syntax Node can strip the types from, loads there and everywhere else.
 */

/**
 * Google's stock `latin` range for Alegreya Sans, exactly as the Fonts CSS API
 * serves it (`fonts.googleapis.com/css2?family=Alegreya+Sans`, 2026-10-14).
 *
 * Every latin `@font-face` of the app declares this as its `unicode-range`, in
 * `index.html` and in the workshop's `.storybook/preview-head.html`. Those two
 * are static HTML and cannot import this module, so `font-faces.test.ts` reads
 * both and fails when either one stops matching it.
 */
export const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

/**
 * Google's stock `latin-ext` range for Alegreya Sans (the Fonts CSS API,
 * 2026-10-15), **less the seven code points it shares with
 * {@link LATIN_RANGE}**: U+0131, U+0152, U+0153, U+0304, U+0308, U+0329 and
 * U+2020. The latin files carry them, and a range that overlapped the latin one
 * would be counted with the first visit (`build/first-visit-weight.ts`).
 *
 * A latin-ext file is fetched only when a page draws one of these letters.
 */
export const LATIN_EXT_RANGE =
  'U+0100-0130, U+0132-0151, U+0154-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';

/** Code points `from` to `to`, both ends included. */
export interface CodePointSpan {
  readonly from: number;
  readonly to: number;
}

/** One entry of a `unicode-range`: `U+26`, `U+0-7F` or `U+4??`, in either case. */
const RANGE_ENTRY = /^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/i;

/**
 * Reads a CSS `unicode-range` into the spans of code points it names.
 *
 * Whitespace between the entries does not matter, so a range wrapped across
 * lines by the formatter, or squeezed by a minifier, reads the same.
 *
 * @param range - The value of a `unicode-range` descriptor
 * @returns Its spans, in the order written
 * @throws When an entry is not a unicode-range entry: a build that cannot read
 * a face's range cannot say which ceiling it counts against, so it stops
 *
 * @example
 * parseUnicodeRange('U+0041-005A, U+4??'); // [{ from: 65, to: 90 }, { from: 1024, to: 1279 }]
 */
export const parseUnicodeRange = (range: string): readonly CodePointSpan[] =>
  range.split(',').map((entry) => {
    const match = RANGE_ENTRY.exec(entry.trim());
    const start = match?.[1];

    if (start === undefined) {
      throw new Error(`Not a unicode-range entry: "${entry.trim()}" in "${range}".`);
    }

    if (start.includes('?')) {
      return {
        from: Number.parseInt(start.replaceAll('?', '0'), 16),
        to: Number.parseInt(start.replaceAll('?', 'f'), 16),
      };
    }

    const from = Number.parseInt(start, 16);

    return { from, to: match?.[2] === undefined ? from : Number.parseInt(match[2], 16) };
  });

/**
 * Whether one code point lies in any of the spans.
 *
 * @param spans - Spans from {@link parseUnicodeRange}
 * @param codePoint - The code point to look for
 */
export const spansContain = (spans: readonly CodePointSpan[], codePoint: number): boolean =>
  spans.some(({ from, to }) => from <= codePoint && codePoint <= to);

/**
 * Whether two ranges name at least one code point in common.
 *
 * @param one - A `unicode-range` value
 * @param other - Another one
 *
 * @example
 * rangesShareACodePoint('U+0000-00FF', 'U+0100-017F'); // false
 */
export const rangesShareACodePoint = (one: string, other: string): boolean => {
  const others = parseUnicodeRange(other);

  return parseUnicodeRange(one).some(({ from, to }) =>
    others.some((span) => from <= span.to && span.from <= to),
  );
};
