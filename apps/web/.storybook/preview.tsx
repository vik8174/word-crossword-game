import type { Preview } from '@storybook/react-vite';

import { withMemoryRouter, withScene, withTheme } from './decorators';

/**
 * The four faces `preview-head.html` declares, in the exact weight strings
 * `FontFaceSet.load` needs to match a `@font-face`.
 *
 * `<link rel="preload">` fetches the bytes but a preloaded face is not
 * "loaded" in `document.fonts` until something actually renders with it —
 * Chrome will not parse and register a face nothing on the page asks for.
 * `HomePage` alone renders three of the four (the sign face at 300, the text
 * face at 400, and the logotype); the fourth, the text face at 700, is the
 * heading weight `CreateRoomPage`'s own step title uses, not anything on the
 * gate. Loading all four explicitly, once, is what lets any single story —
 * `HomePage`'s included — report every face as `loaded` (issue #182, AC 3)
 * rather than only the ones its own render happens to touch.
 */
const FACES = [
  '300 1em "Zen Kaku Gothic New"',
  '400 1em "Zen Kaku Gothic New"',
  '700 1em "Zen Kaku Gothic New"',
  '400 1em "Dela Gothic One"',
];

if (typeof document !== 'undefined') {
  // Errors are swallowed rather than surfaced: a face that failed to load
  // would already be visible as a fallback system font on the picture,
  // which is the whole reason `preview-head.html` exists.
  void Promise.all(FACES.map((face) => document.fonts.load(face))).catch(() => {});
}

/**
 * What every story in this project renders inside, so a story file only says
 * which component and which scene — not the theme, the router, or the
 * picture behind it. #184 (the button) and #185 (the message) build their own
 * stories on top of exactly this.
 *
 * Order among the three does not matter: none of them depends on being inside
 * or outside another, since a decorator only has to sit somewhere above the
 * story in the tree, which every entry here does by construction.
 */
const preview: Preview = {
  decorators: [withTheme, withMemoryRouter, withScene],

  parameters: {
    // No `backgrounds` addon is installed, and none is needed: every story
    // already stands on one of the garden's three photographs, which is a
    // background addon's own job done by the app's real code instead.
    layout: 'fullscreen',
  },
};

export default preview;
