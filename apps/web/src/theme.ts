import { alpha, createTheme } from '@mui/material/styles';
import { FRAME_HEADER_HEIGHT } from './components/frame-height';
import { MOTION_DURATIONS_MS, MOTION_EASING } from './motion';
import { inRem, SPACING_STEPS } from './scale';
import { STREET, STREET_TYPOGRAPHY } from './street';
import { TYPOGRAPHY } from './typography';

/**
 * The system setting that means no movement at all, as the CSS `@media` rule
 * the browser re-evaluates on its own the moment the setting changes. The rules
 * in `motion-styles.ts` ask the opposite question (`no-preference`) and so are
 * not applied at all when this one holds.
 */
const REDUCED_MOTION_MEDIA = '@media (prefers-reduced-motion: reduce)';

/**
 * The surfaces one square of the crossword can be drawn on.
 *
 * They are here rather than in `GridSquare.tsx` because they are the part of
 * the board a palette can break: a player who cannot tell the word they are
 * explaining from one the group has answered stops explaining it, and the game
 * stalls with both of them waiting
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). Written down as
 * values, they can be held to that in a test; composed inside the component out
 * of an accent and an opacity, they could not be.
 */
export interface GridSurfaces {
  /** A square nothing of this player's runs through, and nothing has been answered in. */
  readonly empty: string;
  /** A square a word the group has answered runs through. */
  readonly guessed: string;
  /** A square of a word this player explains — on their screen alone. */
  readonly explained: string;
  /** A square this player may type into. */
  readonly own: string;
  /** One of the word they are filling in right now. */
  readonly ownFilling: string;
  /** One holding an answer that is full and does not spell itself. */
  readonly refused: string;
  /** The line a square is ruled with. */
  readonly rule: string;
}

/**
 * The board's surfaces: the drawing's squares, by the tokens that name them
 * (`design/templates/state-tree.html`, `.cell` and its kinds, lines 192-205).
 *
 * An empty square and one this player types into are both `tile`; the word
 * being filled is `wash`; an answered square is `sage`; one this player
 * explains is `paper`; a refused one is `rose`; the rule round a square is
 * `ink`. The fills alone do not tell the kinds apart (sage and paper are 1.28
 * apart in lightness), and are not asked to: every kind also carries an outline
 * or a mark of its own, drawn in `GridSquare`, and `theme.test.ts` holds the
 * kinds apart by those.
 */
const GRID: GridSurfaces = {
  empty: STREET.tile,
  guessed: STREET.sage,
  own: STREET.tile,
  explained: STREET.paper,
  ownFilling: STREET.wash,
  refused: STREET.rose,
  rule: STREET.ink,
};

declare module '@mui/material/styles' {
  interface Palette {
    grid: GridSurfaces;
  }

  interface PaletteOptions {
    grid?: GridSurfaces;
  }
}

/**
 * The roles a face plays, the four levels and the row of gaps this app is
 * drawn with are in `scale.ts`, and the typography below is nothing but those
 * handed to MUI. One of them leaves again through this module: the crossword
 * reads the text face here (its letters and its numbers alike, since issue
 * #147 dropped the serif that used to set them apart), so the theme stays the
 * one thing a component asks about how the app looks
 * (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`).
 */
export { TEXT_FONT_FAMILY } from './scale';

/**
 * The app's design system: the street's palette, its roles, and the typography
 * drawn with it.
 *
 * Declared as a colour scheme rather than as a bare palette. There is exactly
 * one scheme and no dark one in this release, and the two spellings cost the
 * same to write — but they do not cost the same to move between later, since
 * `palette` and `colorSchemes` differ in what every component reading a colour
 * has to say. A dark scheme, when there is one, is a second object here and
 * nothing else.
 *
 * The colours are `street.ts`'s, and this is the only other place any colour is
 * written down. The MUI roles are not a second palette: each of them points at
 * a token, so `Button`, `Dialog`, `Chip` and `CircularProgress` are drawn in
 * these colours without being told about them.
 *
 * - `primary`, `secondary` and `success` are spruce, the action
 * - `error` is brick, with the darker shade MUI works out from it as `dark`
 * - `warning` is ochre, which is a fill and never a text colour, so its
 *   `contrastText` is ink
 * - `info` is slate
 * - text is ink, secondary text is slate, a rule is `line`, the page is `duck`
 *   and a card is `tile`
 *
 * @example
 * <Box sx={{ bgcolor: 'street.tile', color: 'street.ink' }} />
 */
export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',

        street: STREET,
        grid: GRID,

        primary: { main: STREET.spruce, contrastText: STREET.onAccent },
        secondary: { main: STREET.spruce, contrastText: STREET.onAccent },
        error: { main: STREET.brick, contrastText: STREET.onAccent },
        // A fill under ink, never writing: ochre on the ground reads 1.4:1.
        warning: { main: STREET.ochre, contrastText: STREET.ink },
        info: { main: STREET.slate, contrastText: STREET.onAccent },
        success: { main: STREET.spruce, contrastText: STREET.onAccent },

        background: { default: STREET.duck, paper: STREET.tile },
        text: {
          primary: STREET.ink,
          secondary: STREET.slate,
          disabled: STREET.disabledLabel,
        },
        divider: STREET.line,

        // The greys MUI reaches for on its own — a hover, a disabled control —
        // are thinned ink rather than black, so nothing in the app is a colour
        // the ground does not have under it.
        action: {
          active: alpha(STREET.ink, 0.6),
          hover: alpha(STREET.ink, 0.04),
          selected: alpha(STREET.ink, 0.08),
          disabled: STREET.disabledLabel,
          disabledBackground: STREET.disabledSurface,
          focus: alpha(STREET.ink, 0.12),
        },
      },
    },
  },

  // Every gap in the app, read as an index into the row rather than as a
  // multiplier — `mt: 5` is the fifth step and so twenty-four pixels.
  spacing: [...SPACING_STEPS],

  typography: { ...TYPOGRAPHY, ...STREET_TYPOGRAPHY },

  // Four pixels of rounding on every corner is the house style of a control
  // panel; the screens that are redrawn for the street set their own.
  shape: { borderRadius: 2 },

  // The row this interface moves on (`motion.ts`), and every one of MUI's own
  // duration and easing slots pointed at it rather than left at what MUI ships
  // with: all four easings are `--out`, so MUI's components use no third curve. Every component below reads its motion from this object without
  // being told about it — `Button`, `TextField`, `Dialog`, `Chip`, `Alert` and
  // everything else `theme.transitions.create()` is called for — which is what
  // makes this the widest-reaching change in the ticket that wrote it.
  transitions: {
    duration: {
      shortest: MOTION_DURATIONS_MS.quick,
      shorter: MOTION_DURATIONS_MS.quick,
      short: MOTION_DURATIONS_MS.quick,
      standard: MOTION_DURATIONS_MS.settle,
      complex: MOTION_DURATIONS_MS.settle,
      enteringScreen: MOTION_DURATIONS_MS.settle,
      leavingScreen: MOTION_DURATIONS_MS.quick,
    },
    easing: {
      easeInOut: MOTION_EASING,
      easeOut: MOTION_EASING,
      easeIn: MOTION_EASING,
      sharp: MOTION_EASING,
    },
  },

  components: {
    // `MuiFormHelperText` used to be styled here — the hint under a field,
    // moved three pixels closer than MUI's own default. Issue #193 moved
    // every field that rendered one, `WordListForm`'s nickname and words,
    // onto `components/Field.tsx`, which draws its own help line
    // (`components/field-styles.ts`'s `fieldHelpSx`) rather than MUI's
    // component. `components/RoomInvitePanel.tsx` was the one `TextField`
    // left in the app until issue #199 moved it onto `Field.tsx` too, so
    // nothing renders a `FormHelperText` any more and the override is gone
    // rather than kept for a component nothing instantiates.

    // The page. `CssBaseline` paints the body in `background.default` (duck) and
    // `text.primary` (ink) from the palette above; what it does not know is the
    // size of the street's body text, 18px on a line of 1.5
    // (`design/templates/state-tree.html`, lines 57-60). It is set on the body
    // alone and not on the `body1` variant, so the text that sets its own size,
    // which is all of it on the screens that have not been redrawn yet, does not
    // move.
    //
    // `prefers-reduced-motion` is answered here rather than inside each
    // component, so that nothing drawn by MUI can opt back into motion with an
    // `sx` of its own. `!important` is not decoration: an `sx` prop compiles to
    // a class of equal specificity to this one, and only `!important` inside a
    // media query is guaranteed to outrank whichever of the two happens to be
    // declared later. `*` is the whole document rather than a list of MUI's own
    // classes, because the rule this is answering
    // (`docs/decisions/0039-the-street-wakes-up.md`) is about every control in
    // the app, not only the ones this file happens to style.
    //
    // It zeroes delays as well as durations. A duration of 0.01 ms with the
    // delay left alone would hold every element that waits for its turn (a
    // card for 1250 ms, the last piece of confetti for 1.7 s) in the state it
    // starts from, invisible, for the whole of that wait. The rules in
    // `motion-styles.ts` are inside `no-preference` and so are not applied at
    // all under reduced motion; this keeps whatever MUI draws, and anything
    // added later, from waiting either.
    //
    // `CircularProgress` is named out of it on purpose. The rule turns off
    // movement that disorients, and a spinner is not that: it is the one way
    // this app says "wait" while a route's chunk arrives (`PageLoading.tsx`),
    // where it is the only thing on the page. Frozen by
    // `animation-iteration-count: 1`, it turns once and stops, which reads as
    // broken rather than calm, a promise of "something is happening" that stops
    // being true. So it keeps spinning under reduced motion; nothing else does.
    //
    // The button's loading dot (`components/button-styles.ts`) is not named
    // out: `design/templates/state-tree.html` line 95 stops it under reduced
    // motion, so it stands still and says "busy" by being there (issue #224).
    //
    // Nor is the waiting line's dot on `connecting`
    // (`components/WaitingMark.tsx`): it is the button's dot, and the template
    // stops it under reduced motion too (`.wait-line .dot`, line 258). The three
    // rings that kept turning here until issue #226 are gone with the drawing
    // they belonged to.
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontSize: inRem(18), lineHeight: 1.5 },
        // A square the keyboard moves to is scrolled into view below the frame's
        // sticky header and not under it (issue #245).
        html: { scrollPaddingTop: FRAME_HEADER_HEIGHT },
        [REDUCED_MOTION_MEDIA]: {
          ['*:not(.MuiCircularProgress-root):not(.MuiCircularProgress-circle), *::before, *::after']:
            {
              animationDelay: '0s !important',
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDelay: '0s !important',
              transitionDuration: '0.01ms !important',
            },
        },
      },
    },
  },
});
