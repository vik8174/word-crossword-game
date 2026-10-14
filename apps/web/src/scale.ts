/**
 * The two rows this interface is measured with, and the roles a face plays in
 * it.
 *
 * They are here rather than inside the theme for the same reason the colours
 * are written down as tokens: a size that is chosen at the place it is used is
 * a size nobody can check. The theme
 * (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`) hands these
 * to MUI and adds nothing of its own, so every size and every gap in the app
 * comes out of this file.
 *
 * Nothing here knows about MUI, which is what lets a module read a face or a
 * level without going through a theme it is not drawn by.
 *
 * There is one face: Alegreya Sans, in design v2 (`design/templates/
 * state-tree.html`, `--face`; issue #244). It replaced a text face and a
 * logotype that were two families (issues #124, #147), so the roles below are
 * told apart by weight and size and no longer by family. The **text** role
 * ({@link TEXT_FONT_FAMILY}) is everything read, the board's letters
 * included; the **heading** role is the same family at 700 ({@link WEIGHTS}).
 * The old **sign** role went with the garden's cloth (#222). The name of the
 * game is the heading weight with its own tracking ({@link
 * LOGOTYPE_TRACKING}), until its screen is redrawn (#224).
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
 * How big the name of the game stands over the gates, on a window wide
 * enough to hold it.
 *
 * Not a fifth text level — `context.md` says there is no fifth, and this is
 * not text, it is a sign standing in the world: the one thing the first
 * screen introduces the game with, and the only place a sign is allowed to
 * outgrow the four levels above it (issue #125). It still lives on their
 * ladder rather than a number written down at the place it is used, because
 * a size chosen there is a size nobody can check — the whole reason this
 * file exists. One step above `title`, on a narrower window the name still
 * reads at `body` or `heading`.
 */
export const GATE_NAME_SIZE = levelAt(4);

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
 * ordinary text is a heading, and a heading is already a size. Both name a
 * weight the face actually ships (Alegreya Sans 400 and 700, `index.html`)
 * rather than asking a browser to imitate one it does not have. A rule naming
 * 500 or 600 would be a weight nobody chose, matched to whichever real file
 * the browser judges closest.
 */
export const WEIGHTS = { regular: 400, bold: 700 } as const;

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
 * Whatever the reader's own system draws best, and the last thing every face
 * here falls back to.
 *
 * It is not a face of its own any more. It was the text face until issue #124 —
 * chosen by nobody, which was the whole complaint: two of the three faces had
 * been picked and this one was what the operating system happened to hold. What
 * it is now is the ground under the other two: the thing drawn on the first
 * frame, before a file has arrived, and the thing drawn instead if one never
 * does.
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
 * Alegreya Sans, the one face of Across the Street, and what to draw while its
 * files are on their way.
 *
 * Self-hosted: three latin files (400, 700 and 400 italic) declared and
 * preloaded in `index.html`, and in the workshop's `preview-head.html`. The
 * system stack is the tail of it, drawn on the first frame and instead of the
 * face if a file never arrives.
 */
const ALEGREYA_SANS = ['"Alegreya Sans"', SYSTEM_FONT_FAMILY].join(', ');

/**
 * How far apart the letters of the name of the game stand, as a share of their
 * own size, on the landing page.
 *
 * Settled on real renders in PRD #145 and kept until the screen is redrawn
 * (#224). A centred line counts the space this puts after the last letter as
 * part of its own width, which would sit the visible letters left of the
 * middle by half of it, so `HomePage.tsx` takes the space off the right.
 */
export const LOGOTYPE_TRACKING = '0.34em';

/**
 * The text face: everything that is read rather than looked at, and the
 * board's letters as well.
 *
 * Fields, hints, counters, the labels on buttons, the names of panels, the
 * names of players, and on the heading levels the same family at 700
 * ({@link WEIGHTS}). Preloaded in `index.html` so the face does not land on a
 * screen already laid out and move a paragraph somebody has begun reading
 * (issue #124).
 */
export const TEXT_FONT_FAMILY = ALEGREYA_SANS;
