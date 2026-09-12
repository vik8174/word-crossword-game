/**
 * The two rows this interface is measured with, and the four roles a face
 * plays in it.
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
 *
 * There used to be three faces and a serif among them (issue #124): a display
 * face for the crossword and the two large levels, a sign face for lettering,
 * and a text face for everything read. Issue #147 dropped the serif — the
 * board's letters run 11px to 24px, and a face that spends its quality on
 * stroke contrast loses that contrast first at the sizes this board actually
 * draws at. What was left of its job, once the board moved off it, was four
 * short panel headings and one `h1` nobody sees rendered — fifteen and a half
 * kibibytes for that is not a trade this app makes. See
 * `docs/decisions/0034-one-text-family-and-a-logotype.md`.
 *
 * Four roles now, not three: a **logotype** ({@link LOGOTYPE_FONT_FAMILY}),
 * fetched for eight glyphs and one route; a **sign** ({@link
 * SIGN_FONT_FAMILY}) for lettering; a **text** ({@link TEXT_FONT_FAMILY}) for
 * everything read, including the board's letters now; and a **heading** —
 * the same family as text, told apart from it by weight alone
 * ({@link WEIGHTS}), and nothing else.
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
 * weight the text family actually ships — 400 and 700 — rather than asking a
 * browser to imitate one it does not have. Only 300 (the sign face's own),
 * 400 and 700 are ever fetched; a rule naming 500 or 600 would be a weight
 * nobody chose, matched to whichever real file the browser judges closest.
 *
 * `bold` used to be requested as 600 and matched by the browser to the 700
 * file that was the only thing present above 400 — a working trick, but one
 * that named a weight nothing in the family is. Issue #147 made the board's
 * heading role a real, deliberate 700 (`docs/decisions/
 * 0034-one-text-family-and-a-logotype.md`), so the number here now says what
 * is actually drawn rather than what a browser used to be left to guess at.
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
 * The one family two of the four roles below name, with what to draw while it
 * is on its way.
 *
 * It is written once and read twice, and that is a saving of one list rather
 * than a claim that the two roles are one thing: the sign face and the text
 * face were chosen separately and happen to have been chosen the same. A ticket
 * that changes either of them splits this constant in two rather than editing
 * it in place — otherwise renaming the face over the gates would silently
 * restyle every sentence in the app.
 */
const ZEN_KAKU_GOTHIC = ['"Zen Kaku Gothic New"', '"Hiragino Sans"', '"Yu Gothic"'].join(', ');

/**
 * The logotype: the name of the game, over the gates, and nowhere else.
 *
 * A display face chosen for one word standing eight glyphs tall rather than for
 * reading — `WORD GARDEN` is `W O R D G A E N`, and the file behind this
 * constant is subset to exactly those letters plus a space, weighing well
 * under a kibibyte (measured in the pull request that added it,
 * `docs/decisions/0034-one-text-family-and-a-logotype.md`). Preloaded in
 * `index.html`, the same way the sign face is: issue #148 put the name of
 * the game over the gates in this face, the one thing the first screen is
 * lettered in, so a request that only started after first paint would swap
 * it out from under somebody already reading it (issue #115).
 *
 * Where the name stands and at what size is `HomePage.tsx`'s, not this
 * file's — this constant is only the face and the subset.
 */
export const LOGOTYPE_FONT_FAMILY = ['"Dela Gothic One"', SYSTEM_FONT_FAMILY].join(', ');

/** The one weight the logotype is fetched at, and the only one it has. */
export const LOGOTYPE_FONT_WEIGHT = 400;

/**
 * How far apart the logotype's own letters stand — settled on real renders in
 * PRD #145, not the sign face's {@link SIGN_TRACKING}: the two were chosen on
 * two different faces at two different sizes and only happen to be close.
 *
 * A centred line counts the space this puts after the last letter as part of
 * its own width, which would sit the visible letters left of the middle by
 * half of it. Issue #148's own lockup takes that space off the right rather
 * than leaving it in, the same correction {@link SIGN_TRACKING} already gets
 * for the button below the gate.
 */
export const LOGOTYPE_TRACKING = '0.34em';

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
export const SIGN_FONT_FAMILY = [ZEN_KAKU_GOTHIC, SYSTEM_FONT_FAMILY].join(', ');

/** The one weight the sign face is fetched at: light, as a sign is lettered. */
export const SIGN_FONT_WEIGHT = 300;

/**
 * The text face: everything that is read rather than looked at, and now the
 * board's letters as well.
 *
 * Fields, hints, counters, the labels on buttons, the names of panels, the
 * names of players — all of it, on the two small levels, and on the four
 * heading levels above them told apart by weight alone
 * ({@link WEIGHTS}). Issue #147 moved the crossword's letters onto it too:
 * a serif that spent its quality on stroke contrast lost that contrast first
 * at the sizes the board draws its letters at (11px to 24px), so the board now
 * reads in the same 400 that already shipped for every sentence in the app —
 * no new file, no new bytes.
 *
 * It is the same family as the sign face and a different job. The garden
 * letters that family at 300 with the letters held apart, which is lettering;
 * this is the same family set as text, at 400 and at the bold below. Two files,
 * 19.0 KB together, and they are what put a first visit over the ceiling that
 * was there before — see `apps/web/build/first-visit-weight.ts`.
 *
 * Chosen against three others on real screens of the game (issue #124). The
 * measurement that decided the shape of the choice rather than the winner: a
 * face with two weights costs about twenty kilobytes and there were twelve to
 * spend, so every candidate but one was a decision about the ceiling and not
 * about a typeface.
 *
 * The system stack is still the tail of it. Nothing on the landing page is set
 * in this face — the name of the game and the one button there are lettering —
 * so the first screen is drawn without waiting for these files. `/create` is
 * where it is first read, which is why they are preloaded rather than merely
 * declared: fetched late, the face lands on a screen already laid out and moves
 * a paragraph somebody is reading by a line of it.
 */
export const TEXT_FONT_FAMILY = [ZEN_KAKU_GOTHIC, SYSTEM_FONT_FAMILY].join(', ');

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
