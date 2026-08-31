/**
 * The colours the garden itself is painted in.
 *
 * A layer beside the theme rather than inside it, and that is the whole point
 * of the file. The theme is the interface: paper, ink, and two accents somebody
 * reads text off (`docs/decisions/0028-a-design-system-inside-the-mui-theme.md`).
 * This is the picture behind the interface — a forest at the end of an
 * afternoon — and a forest has colours no form ever wants: eight greens between
 * night and a leaf with the sun through it, three teals for water, three reds
 * for a temple.
 *
 * Putting them in the theme would mean every component completing `night` and
 * `lime` beside `washi` and `sumi`, and sooner or later a button drawn in the
 * colour of a pond. They are two palettes because they are two jobs, and the
 * only place they meet is where the interface sits on the picture — which is
 * {@link BAND} and {@link VEIL} below, and nowhere else.
 *
 * Twenty-two tokens, from the darkest thing in the picture to the brightest.
 * The values are not adjustable: they were taken off the reference the whole
 * scene was drawn against, and a scene painted in half of one palette and half
 * of another stops being a place.
 */

/**
 * The scene's own colours, dark to light within each family.
 *
 * @example
 * brush.fillStyle = SCENE.vermilion;
 */
export const SCENE = {
  /** Under the canopy where no light reaches. */
  night: '#0A231F',
  /** The green of distance. */
  deep: '#123A32',
  /** Shade with air in it. */
  shade: '#17544A',
  /** Moss on the near side of a trunk. */
  moss: '#1F7A5A',
  /** A leaf in ordinary daylight. */
  leaf: '#3E9B57',
  /** A new leaf. */
  fresh: '#6FBB43',
  /** A leaf with the sun coming through the back of it. */
  lime: '#A9D147',
  /** The edge of a leaf the sun is directly on. */
  glow: '#DCE9A0',
  /** Still water in shadow. */
  teal: '#1E9E9C',
  /** The same water where the light lands on it. */
  tealLit: '#63D8CE',
  /** Water moving. */
  water: '#2FBDB6',
  /** The temple, and every action the interface offers. */
  vermilion: '#DA4620',
  /** Its lit edge: the brushed highlight along a beam. */
  vermilionLit: '#F2762F',
  /** Its shadowed side. */
  vermilionDeep: '#93290F',
  /** Roof tile. */
  roof: '#A9B0AD',
  /** Roof tile with the sun on it. */
  roofLit: '#EFE2B6',
  /** Cut stone. */
  stone: '#93A09A',
  /** Stone in shadow. */
  stoneDark: '#5B6863',
  /** Bark. */
  bark: '#33302F',
  /** Bark against the light, which is nearly black. */
  barkDeep: '#1C1A1A',
  /** Paper, and what is written on the picture. */
  cream: '#F3ECD9',
  /** The light itself. */
  sun: '#FBF3C9',
} as const;

/** One of the scene's colours, by name. */
export type SceneColour = (typeof SCENE)[keyof typeof SCENE];

/**
 * How much the picture is put down by, everywhere the interface stands on it.
 *
 * This is the general answer to legibility, and it is one answer rather than a
 * backing behind every sentence: a plate under each line of text would cut the
 * scene into pieces, while a single dimming leaves it a picture and takes the
 * fight out of it. Twenty-six per cent was measured against the busiest part of
 * the scene — the near canopy — and it is the point at which cream text is read
 * without the greens going grey.
 *
 * It is not the whole answer, because it cannot be: the veil dims the picture
 * and the picture has a sheet of lit paper in it, which stays lighter than any
 * ink this place writes in. What text stands on there is {@link BAND}, and
 * `scene-palette.test.ts` is what holds both of them to a number.
 */
export const VEIL = 'rgba(6, 17, 26, 0.26)';

/**
 * The band a list of words is held by: the shadow under the canopy, deepened.
 *
 * Not a panel and not a card. It runs the whole height of the window, so the
 * words stand on something that belongs to the frame rather than floating in
 * the picture, and it is translucent because the forest going on behind it is
 * what says the interface is standing in a place rather than over it.
 */
export const BAND = 'rgba(6, 20, 16, 0.55)';

/** The line down a band's inner edge: the temple's own red, a hair wide. */
export const BAND_EDGE = SCENE.vermilion;

/** How wide that line is, in pixels. */
export const BAND_EDGE_WIDTH = 1.5;

/**
 * Cream at the weight a secondary line of text is read at on the band.
 *
 * Seventy-eight per cent rather than a rounder number, and it is measured. The
 * worst surface in this place is the band laid over the lit paper of the
 * temple's doors: at 0.72 a thirteen-pixel line reads there at 4.28 to one,
 * which is under the 4.5 small text is owed, and at 0.78 it reads at 4.71.
 * Everywhere else in the scene it is between seven and nine to one.
 */
export const SCENE_INK_DIM = 'rgba(243, 236, 217, 0.78)';

/** Cream thinned to a rule, a border, the edge of a field. */
export const SCENE_LINE = 'rgba(243, 236, 217, 0.28)';
