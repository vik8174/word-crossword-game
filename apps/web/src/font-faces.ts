/**
 * Google's stock `latin` range for Alegreya Sans, exactly as the Fonts CSS API
 * serves it (`fonts.googleapis.com/css2?family=Alegreya+Sans`, 2026-10-14).
 *
 * Every `@font-face` of the app carries this as its `unicode-range`, in
 * `index.html` and in the workshop's `.storybook/preview-head.html`. Those two
 * are static HTML and cannot import this module, so `font-faces.test.ts` reads
 * both and fails when either one stops matching it. The latin-ext range is
 * counted apart (#232).
 */
export const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

/** The family name every `@font-face` declares. */
export const FONT_FAMILY_NAME = 'Alegreya Sans';

/**
 * The three files behind the face: what each is, where it is served from, and
 * whether `index.html` preloads it. Alegreya Sans (SIL OFL,
 * `public/fonts/OFL.txt`), latin subset, woff2.
 *
 * The italic is declared and not preloaded: `/` draws no italic, so it is
 * fetched when a screen first draws italic text, and the first-visit check
 * does not count it (`NOT_ON_FIRST_VISIT` in `build/first-visit-weight.ts`,
 * #263).
 */
export const FONT_FILES = [
  {
    weight: 400,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-400.woff2',
    preloaded: true,
  },
  {
    weight: 700,
    style: 'normal',
    href: '/fonts/alegreya-sans-v28-latin-700.woff2',
    preloaded: true,
  },
  {
    weight: 400,
    style: 'italic',
    href: '/fonts/alegreya-sans-v28-latin-400italic.woff2',
    preloaded: false,
  },
] as const;
