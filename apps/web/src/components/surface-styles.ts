import type { CSSObject } from '@mui/material/styles';

import { gapAt, inRem } from '../scale';
import { STREET } from '../street';

/**
 * The surfaces the interface stands on, and the name of a step.
 *
 * The page is `duck` and every surface laid on it is a `tile` with a 1.5px
 * `line` outline (`design/templates/state-tree.html`, the legend at lines
 * 27-44). They were bands of the garden's shadow until issue #222, and a band
 * only ever existed to make writing readable over a picture. There is no
 * picture now, so what is left of a band is the surface and its edge.
 *
 * The outline is drawn with `outline` and an offset that pulls it inside the
 * box, not with `border`. A surface is exactly the size it was when it was a
 * band, and its content does not move by a pixel; a screen is redrawn to the
 * template on its own issue (#224 to #229), and until then its layout is the
 * old one.
 */

/** How thick the outline of a surface is, in pixels. */
export const OUTLINE_WIDTH = 1.5;

/** The hairline of a surface, as `border` and `outline` take it. */
const LINE = `${OUTLINE_WIDTH}px solid ${STREET.line}`;

/**
 * A tile: the surface a zone, a panel, a message and the strip under the board
 * are drawn on.
 *
 * The outline is inside the box (`outline-offset` of minus its own width), so
 * it takes no room from what is on the tile.
 */
export const TILE_SX: CSSObject = {
  backgroundColor: STREET.tile,
  outline: LINE,
  outlineOffset: `-${OUTLINE_WIDTH}px`,
};

/** Where in its frame a full-height band stands. */
export type BandPlace = 'left' | 'right' | 'centre';

/**
 * How a band is held against its frame, and which of its edges face the page.
 *
 * A band down a side runs off the edge of the frame, so it has one edge facing
 * the ground and one that never does. A band down the middle has the ground on
 * both sides of it, so it has two. That is the whole of the difference between
 * the three, and it is why the hairline is not a property of a band but of an
 * edge (see {@link fullHeightBandSx}). Only the middle one is drawn by anything
 * in the app since issue #199 gave a room's zones a surface of their own; the
 * two side places stay because they are the same rule said for the other two
 * cases, and `surface-styles.test.ts` holds them.
 *
 * The middle one is held by its own margins between both edges of the frame
 * rather than by a `transform`. A transform makes a containing block of its
 * own, and `docs/decisions/0030-where-movement-is-allowed.md` says nothing in
 * this app may be fixed inside one.
 */
const BAND_PLACES: Record<BandPlace, CSSObject> = {
  left: { left: 0, borderRight: LINE },
  right: { right: 0, borderLeft: LINE },
  centre: {
    left: 0,
    right: 0,
    marginInline: 'auto',
    borderLeft: LINE,
    borderRight: LINE,
  },
};

/**
 * How wide the not-found page's own band is allowed to be.
 *
 * Also the width at which the band stops being narrower than the window, and so
 * the width its hairlines vanish at: one number doing both jobs, which is the
 * only way the two can be kept from drifting apart (see
 * {@link fullHeightBandSx}). On a phone the band is therefore the whole width
 * of the window with no line down either side.
 *
 * In `rem`, so that it grows with the size the reader has set their own text
 * in, and as one term rather than a sum, so that the threshold can be said in
 * the same units without arithmetic in a media query.
 */
export const GATE_BAND_WIDTH = '34rem';

/**
 * A tile drawn out to the top and the bottom of its frame, where it stands in
 * it.
 *
 * The hairline goes on an edge that has the ground beyond it, and on no other:
 * a band down a side carries one line, a band down the middle carries two, and
 * a band as wide as the frame it is in carries none, because there is no ground
 * left beside it for a line to be the beginning of.
 *
 * The width it may not exceed is also the width at which the lines go: one
 * number, written once and used twice. The threshold is read off the window
 * while the width is read off the frame, which is the same length in both
 * places this is used.
 *
 * Absolute rather than fixed, and against whatever frame the screen puts round
 * it: while a shift is running the screen is inside a `transform`, and anything
 * fixed inside one is fixed to the animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * @param place - Which edge of the frame it runs down, or the middle of it
 * @param atMost - The widest it is allowed to be, as a CSS length
 * @returns The band, ready to be given to a decorative box
 *
 * @example
 * <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />
 */
export const fullHeightBandSx = (place: BandPlace, atMost: string): CSSObject => ({
  display: 'block',
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: `min(${atMost}, 100%)`,
  backgroundColor: STREET.tile,
  pointerEvents: 'none',
  ...BAND_PLACES[place],
  [`@media (max-width: ${atMost})`]: { border: 'none' },
});

/**
 * The strip a sentence stands on where there is no zone to hold it.
 *
 * The board's own lines (what the crossword is called, what the squares are
 * for, how the keyboard works, and the one word about an answer that was
 * refused) sit in the middle of the room rather than in a zone at its edge.
 * They stand on a tile of their own, which is also the one rule about where it
 * may be used: the middle of the window and nowhere else. A zone already
 * paints a tile, and two of them over each other are a darker rectangle in the
 * middle of one.
 *
 * It takes no height from the board, the padding being along the line and not
 * above it, because the height of a square is what that would come out of
 * (`docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md`).
 */
export const SENTENCE_BAND_SX: CSSObject = {
  ...TILE_SX,
  paddingLeft: gapAt(2),
  paddingRight: gapAt(2),
};

/**
 * What a screen adds to the name of a step: the 6px under it, and its colour.
 *
 * The name is the template's `.step-title` (`design/templates/state-tree.html`,
 * line 112): the theme's `stepTitle` variant, which is sentence case as
 * written, 700 at 34px, a line height of 1.1, no capitals and no tracking
 * (issue #244). It is one drawing shared by `/create` inside its panel, and
 * join, the lobby, `finished` ("Finished") and `closed-early` ("Game ended") at
 * the top of their frame. The game room itself has no step title: `RoomGame`
 * gives `RoomShell` none, so it takes the unseen heading instead.
 *
 * It is ink, on a tile or on the ground, with no shadow under the letters: the
 * shadow was there to carry cream letters over a picture. The 6px stays until
 * each screen is redrawn to its template (#224 to #229).
 *
 * @returns The title's own styles
 *
 * @example
 * <Typography component="h1" variant="stepTitle" sx={stepTitleSx()}>New game</Typography>
 */
export const stepTitleSx = (): CSSObject => ({
  margin: `0 0 ${inRem(6)}`,
  color: STREET.ink,
});

/**
 * A heading that is there to be read aloud and not to be looked at.
 *
 * Written out rather than taken from `visuallyHidden`: that lives in
 * `@mui/utils`, which this app does not depend on and would have to start
 * depending on for six properties of CSS. Used by the screens that show no
 * title of their own (the game room, the screens at a room's door) and by the
 * lobby, whose visible "Lobby" is gone but whose page keeps its `h1`.
 */
export const UNSEEN_HEADING: CSSObject = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
