import { alpha, createTheme, darken, type PaletteColor } from '@mui/material/styles';
import { MOTION_DURATIONS_MS, MOTION_EASING } from './motion';
import { inRem, SPACING_STEPS, TEXT_LEVELS } from './scale';
import { TYPOGRAPHY } from './typography';

/**
 * The system setting that means no movement at all, spelled out again rather
 * than imported.
 *
 * `components/screen-shift.ts` declares the same string for the camera, the
 * screen shift and the garden's canvases to read with `useMediaQuery` — a
 * check that runs in JavaScript, once, at the moment each of those decides
 * whether to move. A style block cannot ask a hook a question; what it can do
 * is hold the same query as a CSS `@media` rule, which the browser
 * re-evaluates on its own the moment the setting changes, with nothing to
 * import and nothing to grow stale. The two are the same query written for
 * two different readers, not two sources of truth.
 */
const REDUCED_MOTION_MEDIA = '@media (prefers-reduced-motion: reduce)';

/**
 * The colours the app is drawn in, and the only place any of them is written
 * down.
 *
 * Four of them are named rather than numbered, because a name is what survives
 * being read six months later: `washi` is the paper, `sumi` is the ink on it,
 * and `sakura` and `matcha` are the two accents. They are declared into the MUI
 * palette below (`theme.palette.washi`, and so on), so anything reading a
 * colour reads it from the theme with the editor completing the name — there is
 * no second table of hex values anywhere in this app.
 *
 * The other three are not brand colours but statements: something went wrong,
 * something needs care, something is worth knowing. They are muted into the
 * same family so a refused answer is an alarm on this paper rather than a
 * warning light borrowed from somewhere else.
 *
 * Every value here has been measured — see `theme.test.ts`, which fails the
 * build if the ink stops standing off the paper or if two squares of the
 * crossword stop being told apart with the colour taken out.
 */
const TOKENS = {
  /** Warm paper: the page, a card, a square of the crossword. */
  washi: { light: '#FFFDF7', main: '#F4EFE3', dark: '#DED4BB' },
  /** Ink: what is read, and the lines a crossword is ruled with. */
  sumi: { light: '#5B534A', main: '#2B2620', dark: '#14110D' },
  /** Cherry blossom, the accent of the room around the board. */
  sakura: { light: '#F2D3DA', main: '#A54460', dark: '#7C2E46' },
  /** Tea green, the one accent the board itself carries. */
  matcha: { light: '#DCE8C6', main: '#3F5A2E', dark: '#2C3F20' },
  /** Vermilion: an answer the room refused, and nothing else. */
  vermilion: { light: '#E29880', main: '#B03A24', dark: '#83280F' },
  /** Ochre: something a player should look at before it costs them. */
  ochre: { light: '#F1DDB0', main: '#8A6113', dark: '#63450B' },
  /** Indigo: something the room is saying, that is neither good nor bad. */
  indigo: { light: '#CBD7E5', main: '#3D5A80', dark: '#2A3F5C' },
} as const;

/**
 * What is written on a dark accent. Paper rather than pure white, so nothing in
 * the app is a colour the rest of it does not contain.
 */
const ON_ACCENT = TOKENS.washi.light;

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
 *
 * Every one of them is a step of a token or a stated derivation of one, so the
 * board cannot drift away from the rest of the app.
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

const GRID: GridSurfaces = {
  // The brightest paper there is, and what a board nobody has written on yet is
  // made of end to end.
  empty: TOKENS.washi.light,
  // The page's own tone, ruled into a square and holding a letter: a word the
  // group has answered has been written in, and stops being a blank to fill.
  guessed: TOKENS.washi.main,
  own: TOKENS.matcha.light,
  explained: TOKENS.washi.dark,
  // A shade of the same wash rather than a colour of its own: the word being
  // filled in is the same word, further along.
  ownFilling: darken(TOKENS.matcha.light, 0.14),
  refused: TOKENS.vermilion.light,
  // Ink thinned until a grid of it reads as ruling rather than as eighty boxes.
  rule: alpha(TOKENS.sumi.main, 0.55),
};

declare module '@mui/material/styles' {
  interface Palette {
    washi: PaletteColor;
    sumi: PaletteColor;
    sakura: PaletteColor;
    matcha: PaletteColor;
    grid: GridSurfaces;
  }

  interface PaletteOptions {
    washi?: PaletteColor;
    sumi?: PaletteColor;
    sakura?: PaletteColor;
    matcha?: PaletteColor;
    grid?: GridSurfaces;
  }
}

/**
 * The three faces, the four levels and the row of gaps this app is drawn with
 * are in `scale.ts`, and the typography below is nothing but those handed to
 * MUI. Two of them leave again through this module — the crossword reads the
 * display face here, and the scene of issue #115 reads the sign face out of
 * `theme.typography.signage` — so the theme stays the one thing a component
 * asks about how the app looks
 * (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`).
 */
export { DISPLAY_FONT_FAMILY, SIGN_FONT_FAMILY } from './scale';

/**
 * The app's design system: a palette of named tokens, and the typography drawn
 * with it.
 *
 * Declared as a colour scheme rather than as a bare palette. There is exactly
 * one scheme and no dark one in this release, and the two spellings cost the
 * same to write — but they do not cost the same to move between later, since
 * `palette` and `colorSchemes` differ in what every component reading a colour
 * has to say. A dark scheme, when there is one, is a second object here and
 * nothing else.
 *
 * The MUI roles are not a second palette: each of them points at a token, so
 * `Button`, `Alert`, `Chip` and `Dialog` are drawn in these colours without
 * being told about them. `primary` is sakura and lives everywhere except the
 * board; `secondary` is matcha and is the one accent the board carries. That
 * split is deliberate and is the trap this ticket was written around: a refused
 * answer is drawn in vermilion, so squares of the player's own words being pink
 * too would leave "mine" and "wrong" differing by a shade of the same colour,
 * and a player would go on believing an answer the room had already thrown out.
 *
 * @example
 * <Box sx={{ bgcolor: 'washi.main', color: 'sumi.main' }} />
 */
export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',

        washi: { ...TOKENS.washi, contrastText: TOKENS.sumi.main },
        sumi: { ...TOKENS.sumi, contrastText: ON_ACCENT },
        sakura: { ...TOKENS.sakura, contrastText: ON_ACCENT },
        matcha: { ...TOKENS.matcha, contrastText: ON_ACCENT },
        grid: GRID,

        primary: { ...TOKENS.sakura, contrastText: ON_ACCENT },
        secondary: { ...TOKENS.matcha, contrastText: ON_ACCENT },
        error: { ...TOKENS.vermilion, contrastText: ON_ACCENT },
        warning: { ...TOKENS.ochre, contrastText: ON_ACCENT },
        info: { ...TOKENS.indigo, contrastText: ON_ACCENT },
        // The same green the board's own squares carry: a finished crossword and
        // a square being filled in are the same good news at two moments.
        success: { ...TOKENS.matcha, contrastText: ON_ACCENT },

        background: { default: TOKENS.washi.main, paper: TOKENS.washi.light },
        text: {
          primary: TOKENS.sumi.main,
          secondary: TOKENS.sumi.light,
          disabled: alpha(TOKENS.sumi.main, 0.38),
        },
        divider: alpha(TOKENS.sumi.main, 0.16),

        // The greys MUI reaches for on its own — a hover, a disabled control —
        // are thinned ink rather than black, so nothing in the app is a colour
        // the paper does not have under it.
        action: {
          active: alpha(TOKENS.sumi.main, 0.6),
          hover: alpha(TOKENS.sumi.main, 0.04),
          selected: alpha(TOKENS.sumi.main, 0.08),
          disabled: alpha(TOKENS.sumi.main, 0.26),
          disabledBackground: alpha(TOKENS.sumi.main, 0.12),
          focus: alpha(TOKENS.sumi.main, 0.12),
        },
      },
    },
  },

  // Every gap in the app, read as an index into the row rather than as a
  // multiplier — `mt: 5` is the fifth step and so twenty-four pixels.
  spacing: [...SPACING_STEPS],

  typography: TYPOGRAPHY,

  // Ink on paper has edges. Four pixels of rounding on every corner is the
  // house style of a control panel, which is the thing this palette is not.
  shape: { borderRadius: 2 },

  // The row this interface moves on (`motion.ts`), and every one of MUI's own
  // duration and easing slots pointed at it rather than left at what MUI ships
  // with. Every component below reads its motion from this object without
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
    // A raised button casts a shadow onto the paper, and nothing in this design
    // is above the page.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // A large button is larger in what surrounds its label, not in the
        // label: MUI sets fifteen pixels here, which is a fifth size and half a
        // step off the one above it.
        sizeLarge: { fontSize: inRem(TEXT_LEVELS.body) },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        // The hint under a field, which MUI puts three pixels below it — close
        // enough to read as part of the box rather than as a line about it, and
        // the one gap on this form that was not on the row.
        root: ({ theme }) => ({ marginTop: theme.spacing(2) }),
      },
    },

    // `prefers-reduced-motion` is answered here rather than inside each
    // component, so that nothing drawn by MUI can opt back into motion with an
    // `sx` of its own. `!important` is not decoration: an `sx` prop compiles to
    // a class of equal specificity to this one, and only `!important` inside a
    // media query is guaranteed to outrank whichever of the two happens to be
    // declared later. `*` is the whole document rather than a list of MUI's own
    // classes, because the rule this is answering
    // (`docs/decisions/0030-where-movement-is-allowed.md`) is about every
    // control in the app, not only the ones this file happens to style.
    //
    // The four consumers of `REDUCED_MOTION_QUERY` — the camera, the screen
    // shift, the petals and the garden's cloth — already ask the same question
    // themselves and skip their own `requestAnimationFrame` loops when it is
    // answered, so this rule and theirs never race: theirs stops a canvas from
    // being painted, and this one stops a `transition` or `animation` CSS
    // property from doing anything once painted.
    MuiCssBaseline: {
      styleOverrides: {
        [REDUCED_MOTION_MEDIA]: {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
  },
});
