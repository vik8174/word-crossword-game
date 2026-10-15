import { LATIN_EXT_RANGE, LATIN_RANGE } from 'shared';

/**
 * The two ranges the face is declared in. They are written once, in
 * `packages/shared/src/font-ranges/font-ranges.ts`, because the word list's
 * alphabet, the build's weight check and the HTML all read them.
 *
 * Every `@font-face` of the app carries one of them as its `unicode-range`, in
 * `index.html` and in the workshop's `.storybook/preview-head.html`. Those two
 * are static HTML and cannot import this module, so `font-faces.test.ts` reads
 * both and fails when either one stops matching.
 */
export { LATIN_EXT_RANGE, LATIN_RANGE };

/** The family name every `@font-face` declares. */
export const FONT_FAMILY_NAME = 'Alegreya Sans';

/**
 * The six files behind the face: what each is, where it is served from, which
 * range it is declared for and whether `index.html` preloads it. Alegreya Sans
 * (SIL OFL, `public/fonts/OFL.txt`), woff2, in three styles and two ranges.
 *
 * The latin 400 and 700 are preloaded. The latin italic is declared and not
 * preloaded: `/` draws no italic, so it is fetched when a screen first draws
 * italic text, and the first-visit check does not count it
 * (`NOT_ON_FIRST_VISIT` in `build/first-visit-weight.ts`, #263).
 *
 * The three latin-ext files are declared and never preloaded: a browser fetches
 * one only when a page draws a letter of `LATIN_EXT_RANGE` in its weight and
 * style, and `/` draws none. The build counts them under a ceiling of their
 * own, by their range (#232, ADR 0032's addendum).
 */
export const FONT_FILES = [
  {
    weight: 400,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-400.woff2',
    preloaded: true,
    range: LATIN_RANGE,
  },
  {
    weight: 700,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-700.woff2',
    preloaded: true,
    range: LATIN_RANGE,
  },
  {
    weight: 400,
    style: 'italic',
    href: '/fonts/alegreya-sans-v28-latin-400italic.woff2',
    preloaded: false,
    range: LATIN_RANGE,
  },
  {
    weight: 400,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-ext-400.woff2',
    preloaded: false,
    range: LATIN_EXT_RANGE,
  },
  {
    weight: 700,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-ext-700.woff2',
    preloaded: false,
    range: LATIN_EXT_RANGE,
  },
  {
    weight: 400,
    style: 'italic',
    href: '/fonts/alegreya-sans-v28-latin-ext-400italic.woff2',
    preloaded: false,
    range: LATIN_EXT_RANGE,
  },
] as const;
