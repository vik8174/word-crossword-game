import { alpha, createTheme, darken, type PaletteColor } from '@mui/material/styles';

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
 * The typeface of the interface: whatever the reader's own system draws best.
 *
 * Nothing is fetched for it, so the first screen is drawn the moment its HTML
 * arrives and there is no flash of one font being replaced by another on the
 * page a visitor lands on.
 */
const SYSTEM_FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(', ');

/**
 * The one typeface this app fetches: the letters of the crossword, and the
 * headings large enough to be looked at rather than read past.
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
 * Only weight 400 is fetched. Anything asking for bold in this family would be
 * given a slanted, thickened imitation of it instead, so every variant that
 * uses it says 400 below and the crossword's numbers stay in the interface
 * font, where a bold small numeral is a numeral rather than a smudge.
 */
export const DISPLAY_FONT_FAMILY = [
  '"Zen Old Mincho"',
  '"Hiragino Mincho ProN"',
  '"Iowan Old Style"',
  'Georgia',
  'serif',
].join(', ');

/** Heading sizes are the display face at a single weight, sizes doing the work. */
const displayHeading = { fontFamily: DISPLAY_FONT_FAMILY, fontWeight: 400 } as const;

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

  typography: {
    fontFamily: SYSTEM_FONT_FAMILY,
    h1: displayHeading,
    h2: displayHeading,
    h3: displayHeading,
    h4: displayHeading,
    // Below h4 a heading is a label on a panel rather than something to look
    // at, and a label is read fastest in the font the reader's system draws.
    button: { textTransform: 'none', fontWeight: 500 },
  },

  // Ink on paper has edges. Four pixels of rounding on every corner is the
  // house style of a control panel, which is the thing this palette is not.
  shape: { borderRadius: 2 },

  components: {
    // A raised button casts a shadow onto the paper, and nothing in this design
    // is above the page.
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
