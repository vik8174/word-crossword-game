import type { CSSObject, Theme } from '@mui/material/styles';

import { gapAt, inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
import {
  BAND,
  BAND_EDGE,
  BAND_EDGE_WIDTH,
  CONTROL,
  SCENE,
  SCENE_INK_DIM,
  SCENE_LINE,
} from './scene-palette';

/**
 * How the interface stands on the picture.
 *
 * The theme is still the design system and this does not replace any of it
 * (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`). It is the
 * one seam between two of them: the app is drawn in ink on paper, the garden is
 * a forest at the end of an afternoon, and these are the four places where
 * something has to be said about what happens when the first is put on top of
 * the second.
 *
 * It is written as descendant rules rather than as a prop threaded through
 * twenty components on purpose. What colour a line of text is on a band is one
 * decision, and a decision made twenty times is a decision that will be made
 * nineteen ways within two releases.
 */

/**
 * A band: the surface a list of words is held by.
 *
 * Given as a background rather than as a component, because it is not a panel.
 * Where the window is wide enough for the list to be a column of its own, the
 * band is that column and runs from the top of the window to the bottom (see
 * {@link fullHeightBandSx}); where it is not, the band is as tall as what
 * stands on it.
 */
export const BAND_SX: CSSObject = { backgroundColor: BAND };

/**
 * The band drawn out to the edges of the window, on the side it is on.
 *
 * The hairline is on the inner edge and nowhere else: it is what tells the
 * reader where the interface stops and the forest starts, and a box drawn all
 * the way round would be a panel, which is the thing this is not.
 *
 * Absolute rather than fixed, and against the room's own frame: while a shift
 * is running the screen is inside a `transform`, and anything fixed inside one
 * is fixed to the animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * @param side - Which edge of the window it runs down
 * @param width - How wide it is, as a CSS length
 * @returns The band, ready to be given to a decorative box
 *
 * @example
 * <Box aria-hidden sx={fullHeightBandSx('left', 'calc(15rem + 32px)')} />
 */
export const fullHeightBandSx = (side: 'left' | 'right', width: string): CSSObject => ({
  display: 'block',
  position: 'absolute',
  top: 0,
  bottom: 0,
  [side]: 0,
  width,
  backgroundColor: BAND,
  [side === 'left' ? 'borderRight' : 'borderLeft']: `${BAND_EDGE_WIDTH}px solid ${BAND_EDGE}`,
  pointerEvents: 'none',
});

/**
 * The strip a sentence stands on where there is no zone to hold it.
 *
 * The board's own lines — what the crossword is called, what the squares are
 * for, how the keyboard works, and the one word about an answer that was
 * refused — sit in the middle of the room rather than in a zone at its edge,
 * and what is behind them changes: lit paper on a desktop where the shoji is,
 * dark wood above and below it, and on a phone whatever the page has been
 * scrolled to. Cream is not readable off all three, so these stand on the same
 * band every other sentence in this app stands on.
 *
 * It is the material the interface is made of rather than a plate under a
 * caption: the general answer to reading text off a picture is still the veil,
 * and this is the band, which is what text stands on in every other part of the
 * room. Which is also the one rule about where it may be used — the middle of
 * the window and nowhere else. A zone already paints a band, and two of them
 * over each other are not a band but a darker rectangle in the middle of one. It takes no height from the board — the padding is along the line and
 * not above it — because the height of a square is what that would come out of
 * (`docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md`).
 */
export const SENTENCE_BAND_SX: CSSObject = {
  ...BAND_SX,
  paddingLeft: gapAt(2),
  paddingRight: gapAt(2),
};

/**
 * The name of a step, top left, with the temple's red run under it.
 *
 * The rule starts off the left edge of the window rather than under the first
 * letter, which is what anchors the title to the screen instead of leaving it
 * floating in from one. Its `left` is the negative of whatever padding the
 * frame around it has, so the caller says how far out to reach.
 *
 * Nothing about the lettering itself is here: the element is a `signage`
 * `Typography`, so the face, the capitals and the tracking are the theme's. All
 * this adds is where it sits, what colour it is on a forest, and the rule.
 *
 * @param theme - The theme the gap under it comes out of
 * @param outdent - How far left of the text the rule begins, as a CSS length
 * @returns The title's own styles, rule included
 *
 * @example
 * sx={(theme) => stepTitleSx(theme, '-16px')}
 */
export const stepTitleSx = (theme: Theme, outdent: string): CSSObject => ({
  position: 'relative',
  display: 'inline-block',
  fontSize: inRem(TEXT_LEVELS.body),
  paddingBottom: theme.spacing(3),
  color: SCENE.cream,
  // No band across the picture, so the letters carry their own darkness with
  // them and stay readable over a lit roof as well as over a shadow.
  textShadow: '0 1px 14px rgba(6, 20, 16, 0.9)',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: outdent,
    // Stops where the last letter does rather than where its box does: the
    // tracking is put after it as well as between, and a rule that ran to the
    // edge of the box would overshoot the word by half a letter.
    right: SIGN_TRACKING,
    bottom: 0,
    height: '2px',
    backgroundColor: SCENE.vermilion,
  },
});

/**
 * What is written on the picture: every colour the theme would otherwise take
 * off the paper, taken off the forest instead.
 *
 * Every rule here is one of two things — text the theme would have drawn in ink
 * on a surface that is no longer paper, or a control whose one action is the
 * temple's own red. Anything with a sheet of its own is left alone, and that is
 * why the first rule says `inherit` rather than a colour: a heading inside an
 * alert inherits the alert, which is still a pale sheet with a warning on it
 * wherever that sheet happens to be standing.
 */
export const ON_SCENE_SX: CSSObject = {
  color: SCENE.cream,

  '& .MuiTypography-root': { color: 'inherit' },
  '& .MuiTypography-body2': { color: SCENE_INK_DIM },
  '& .MuiDivider-root': { borderColor: SCENE_LINE },

  // A row of the index, which is a button the whole width of the band.
  '& .MuiListItemButton-root:hover': { backgroundColor: 'rgba(243, 236, 217, 0.08)' },

  // A chip beside a name says something small about it, and here it says it in
  // an outline rather than in a colour the forest does not have.
  '& .MuiChip-root': { color: SCENE.cream, borderColor: SCENE_LINE },
  '& .MuiChip-filled': { backgroundColor: 'rgba(243, 236, 217, 0.12)' },

  // A field somebody types into: the letters, the box round them, and the two
  // lines that explain it.
  '& .MuiInputBase-input': { color: SCENE.cream },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: SCENE_LINE },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: SCENE.cream },
  '& .MuiInputLabel-root': { color: SCENE_INK_DIM },
  '& .MuiFormHelperText-root': { color: SCENE_INK_DIM },

  // The one action, in the one colour that carries an action anywhere in this
  // place. Translucent, so the forest goes on behind it and the control is
  // standing in the picture rather than on it — but the edge and the label are
  // not, because those are the parts that have to be read.
  '& .MuiButton-contained': {
    backgroundColor: CONTROL.fill,
    color: CONTROL.ink,
    border: `1.5px solid ${CONTROL.edge}`,
    '&:hover': { backgroundColor: CONTROL.litFill },
    '&.Mui-disabled': {
      backgroundColor: CONTROL.restingFill,
      color: CONTROL.restingInk,
      borderColor: CONTROL.restingEdge,
    },
  },
  '& .MuiButton-outlined': {
    color: SCENE.cream,
    borderColor: SCENE_LINE,
    '&:hover': { borderColor: SCENE.cream, backgroundColor: 'rgba(243, 236, 217, 0.06)' },
  },
  '& .MuiButton-text': { color: SCENE.cream },
};
