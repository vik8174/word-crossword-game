/**
 * The two rows this interface is measured with, and the three faces it is set
 * in.
 *
 * They are here rather than inside the theme for the same reason the colours
 * are written down as tokens: a size that is chosen at the place it is used is
 * a size nobody can check. The theme
 * (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`) hands these
 * to MUI and adds nothing of its own, so every size and every gap in the app
 * comes out of this file.
 *
 * Nothing here knows about MUI, which is what lets the crossword and the garden
 * read a face or a level without going through a theme they are not drawn by:
 * the scene of issue #115 paints its text onto a canvas, and canvas has no
 * variants.
 */

/**
 * The smallest size text is set in, and the size everything larger is worked
 * out from.
 *
 * Thirteen pixels is where a hint, a counter or a caption stops being body text
 * and starts being an aside, and it is the floor because it is the smallest of
 * the four that stays comfortable on the paper this app is drawn on.
 */
const SMALLEST_LEVEL = 13;

/**
 * How far apart two neighbouring levels are.
 *
 * A third again, which is large enough that two levels beside each other read
 * as a hierarchy rather than as a mistake — the interface had `body1` and
 * `subtitle1` in it, two names for sixteen pixels, and no reader could tell
 * them apart because there was nothing to tell.
 */
const RATIO = 1.33;

/** The size a level lands on, `steps` of the ratio above the smallest. */
const levelAt = (steps: number): number => Math.round(SMALLEST_LEVEL * RATIO ** steps);

/**
 * The four sizes text is set in, and there are no others.
 *
 * Four covers an app of four screens: a page or a room is named once, the
 * blocks inside it are named, the blocks hold text, and the text has asides.
 * Anything that seems to need a fifth is one of these four in the wrong place.
 *
 * They are worked out rather than written down, so the ratio is the thing that
 * can be argued with and the numbers cannot drift away from it.
 */
export const TEXT_LEVELS = {
  /** 31px — the name of the game, and the name of a room. */
  title: levelAt(3),
  /** 23px — what a panel is called, and what the board is called. */
  heading: levelAt(2),
  /** 17px — what is read: sentences, fields, the words of an index. */
  body: levelAt(1),
  /** 13px — hints, counters, and anything the eye passes over on its way. */
  aside: levelAt(0),
} as const;

/**
 * A level as a share of the reader's own text size rather than as pixels.
 *
 * Somebody who has made text larger in their browser has said something, and a
 * size in pixels ignores it. Sixteen is the size a browser is set to out of the
 * box, so on an untouched one these come out as the numbers above.
 *
 * @param level - One of {@link TEXT_LEVELS}, in pixels
 */
export const inRem = (level: number): string => `${level / 16}rem`;

/**
 * The two weights the interface is set in.
 *
 * Two, because a third is a distinction nobody makes on purpose: what is not
 * ordinary text is a heading, and a heading is already a size. The display face
 * is fetched at one weight only and is not in this list at all — anything
 * asking it for bold would be handed a thickened imitation
 * (see {@link DISPLAY_FONT_FAMILY}).
 */
export const WEIGHTS = { regular: 400, semibold: 600 } as const;

/**
 * Every gap in the interface, and there are no others.
 *
 * Read as an index rather than as a multiplier — `mt: 5` is the fifth step and
 * so twenty-four pixels, not five of anything. Four at the bottom is the
 * smallest gap that is still a gap; the steps double, then widen, so a hint
 * sitting under its field and two blocks standing apart are told apart by their
 * distance and not only by what is in them.
 *
 * Handed to MUI as `theme.spacing`, so `mt`, `gap`, `spacing` and every other
 * spacing prop in the app take their numbers from this row. A row rather than a
 * multiplier is the point: multiplied, every number in between is available and
 * the row is only a habit; indexed, the seven steps are all there is.
 */
export const SPACING_STEPS: readonly number[] = [0, 4, 8, 12, 16, 24, 32, 48];

/**
 * A gap of the row as a CSS length, for the places MUI's spacing props cannot
 * reach.
 *
 * `mt` and `gap` take an index into the row; a `calc()`, a pseudo-element or a
 * canvas takes a length. This is the same row said the other way, so a value
 * off it cannot get in through the back door.
 *
 * @param step - Which of the steps, counted from nought
 * @returns It in pixels
 *
 * @example
 * gapAt(4); // '16px'
 */
export const gapAt = (step: number): string => `${SPACING_STEPS[step] ?? 0}px`;

/**
 * The text face: whatever the reader's own system draws best.
 *
 * Nothing is fetched for it, so the first screen is drawn the moment its HTML
 * arrives and there is no flash of one font being replaced by another on the
 * page a visitor lands on.
 */
export const SYSTEM_FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(', ');

/**
 * The display face: the letters of the crossword, and the two largest levels.
 *
 * A letter in the grid is the single thing a player looks at for twenty minutes
 * together, which is the whole of why it is worth any bytes at all. It costs
 * 15.9 KB: one weight, latin only, declared in `index.html`.
 *
 * Served from this app's own origin rather than linked from a font host, and
 * that is a measurement rather than a preference: the stylesheet a font host
 * answers with for this family is 58 KB gzipped, because it lists every
 * Japanese subset of the face — a third of what a first visit to the landing
 * page costs in total, spent before a byte of the font itself is fetched. The
 * word list refuses anything but latin anyway (`word-list-validator`,
 * `word-not-latin`), so the `unicode-range` in `index.html` says latin and the
 * file behind it is the latin subset alone.
 *
 * `font-display: swap` is set with it, so the board is ruled and readable in
 * the system font while the face is still on its way.
 *
 * It is on the two large levels and on the grid, and it is kept off everything
 * smaller on purpose: it is a latin face at one weight, and at thirteen or
 * seventeen pixels it is read more slowly than whatever the reader's own system
 * would have drawn.
 */
export const DISPLAY_FONT_FAMILY = [
  '"Zen Old Mincho"',
  '"Hiragino Mincho ProN"',
  '"Iowan Old Style"',
  'Georgia',
  'serif',
].join(', ');

/**
 * The sign face: what is painted onto a sign rather than written on paper.
 *
 * A modern Japanese gothic at its lightest weight, set in capitals with the
 * letters held apart — which is a lettering job and not a text one. It names
 * the game over the gates of the garden and names the steps inside it (issue
 * #115), where the words are drawn onto a canvas and there is no such thing as
 * a variant to reach for. That is why the family is declared here: the scene
 * takes its face from the same place the interface does, rather than naming a
 * font of its own that nothing else in the app could be held to.
 *
 * Declared in `index.html` and preloaded there. It was not, when it arrived,
 * and that was right at the time: nothing in the interface was set in it. The
 * garden changed it — the landing page is a gate with the name of the game
 * lettered over it, so the one thing on the first screen is set in this face,
 * and a face fetched after the first paint would swap that name out from under
 * somebody reading it (issue #115). The 9.4 KB behind it is counted against the
 * ceiling either way (`apps/web/build/first-visit-weight.ts`).
 */
export const SIGN_FONT_FAMILY = [
  '"Zen Kaku Gothic New"',
  '"Hiragino Sans"',
  '"Yu Gothic"',
  SYSTEM_FONT_FAMILY,
].join(', ');

/** The one weight the sign face is fetched at: light, as a sign is lettered. */
export const SIGN_FONT_WEIGHT = 300;

/**
 * How far apart the letters of a sign are held, as a share of their own size.
 *
 * Forty-two per cent, which is a great deal — and it is the number the whole
 * look was chosen against (issue #115). It is one number rather than two,
 * because lettering is one job: the name over the gates and the name of a step
 * inside them are the same sign at two sizes, and a tracking that changed
 * between them would be the same distinction this file exists to refuse, made
 * in a second place. The tracked line is also half a letter wider than it
 * looks — the space is added after the last letter too — so anything centring
 * one takes this back off the right of it.
 */
export const SIGN_TRACKING = '0.42em';
