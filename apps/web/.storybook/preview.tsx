import type { Preview } from '@storybook/react-vite';

import { withGround, withMemoryRouter, withTheme } from './decorators';

/**
 * The three latin faces `preview-head.html` declares, in the exact weight and
 * style strings `FontFaceSet.load` needs to match a `@font-face`. The latin-ext
 * faces are left out on purpose: `load` asks for a space, which they do not
 * cover, and they are fetched when a story draws a letter in them (`BoardDiacritics`).
 *
 * `<link rel="preload">` fetches the bytes but a preloaded face is not
 * "loaded" in `document.fonts` until something actually renders with it —
 * Chrome will not parse and register a face nothing on the page asks for.
 * Not every story draws the italic, and no story but a heading draws the 700.
 * Loading all three explicitly, once, is what lets any single story report
 * every face as `loaded` (issue #182, AC 3) rather than only the ones its own
 * render happens to touch.
 */
const FACES = [
  '400 1em "Alegreya Sans"',
  '700 1em "Alegreya Sans"',
  'italic 400 1em "Alegreya Sans"',
];

if (typeof document !== 'undefined') {
  // Errors are swallowed rather than surfaced: a face that failed to load
  // would already be visible as a fallback system font on the picture,
  // which is the whole reason `preview-head.html` exists.
  void Promise.all(FACES.map((face) => document.fonts.load(face))).catch(() => {});
}

/**
 * What every story in this project renders inside, so a story file only says
 * which component — not the theme, the router, or the ground behind it. #184 (the button) and #185 (the message) build their own
 * stories on top of exactly this.
 *
 * Order among the three does not matter: none of them depends on being inside
 * or outside another, since a decorator only has to sit somewhere above the
 * story in the tree, which every entry here does by construction.
 */
const preview: Preview = {
  decorators: [withTheme, withMemoryRouter, withGround],

  parameters: {
    // No `backgrounds` addon is installed, and none is needed: every story
    // already stands on `duck`, which is a background addon's own job done by
    // the decorator.
    layout: 'fullscreen',
  },
};

export default preview;
