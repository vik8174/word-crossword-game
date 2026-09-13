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
 * The paper of the temple's doors, from where the light hits it to where it
 * does not.
 *
 * Used by the greeting cloth (`cloth.ts`) rather than by anything painted on a
 * canvas: the doors and the hall are both raster pictures now (issue #152), so
 * this is no longer the gradient a procedurally-drawn shoji screen was filled
 * with. It stays a value in this file because it is still a colour the scene
 * is made of — the cloth is "literally the paper of the doors they walked
 * through" (`cloth.ts`), and that claim is about the temple's own material, not
 * about how any particular picture of it was produced.
 */
export const SHOJI_PAPER = ['#E4D8B6', '#D6C9A3', '#C3B48D'] as const;

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

/**
 * The same shadow, deepened further: the surface a message stands on.
 *
 * Darker than {@link BAND} because a message is read against whatever the band
 * itself is standing on — the picture, or another band already over it — and a
 * warning is not owed the same translucency as a list of words. Taken from the
 * template unchanged (`design/templates/state-tree.html`'s `--band-solid`; see
 * `components/Message.tsx`).
 */
export const BAND_SOLID = 'rgba(6, 20, 16, 0.82)';

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

/** Cream thinned to a rule: a divider, a mark beside a line, anything decorative. */
export const SCENE_LINE = 'rgba(243, 236, 217, 0.28)';

/**
 * Cream at the weight the edge of a control is drawn at.
 *
 * A heavier line than {@link SCENE_LINE} and a different job: the box around a
 * field is what says there is a field, so it has to be seen rather than merely
 * sensed. Fifty-five per cent is where it clears three to one on every surface
 * this place has, the band over the lit paper of the temple's doors included,
 * which is the threshold a control's boundary is owed
 * (`scene-palette.test.ts`). A rule between two paragraphs is owed nothing and
 * stays quiet.
 */
export const SCENE_EDGE = 'rgba(243, 236, 217, 0.55)';

/**
 * The one control that carries an action, in the one colour that carries one.
 *
 * Opaque now, and that is a correction rather than a preference. It used to be
 * translucent, on the reasoning that a forest going on behind it says the
 * control is standing in the picture rather than on it — but the control is
 * painted with this fill over the veiled picture wherever it stands, so a
 * translucent value put the background under the label at a different colour
 * on every pixel of the pill, on every one of the three scenes it stands on
 * (issue #149). Opaque means one figure covers the gate, the doors and the
 * hall alike, and nothing here has to be re-measured per scene
 * (`theme.test.ts`).
 *
 * The resting fill is the temple's own red, unchanged: at rest is the state a
 * player looks at longest — the start of a game is a button that waits for the
 * other player — so it keeps the colour the control was always drawn in
 * rather than a fresh one entering the palette for it. `litFill` is new,
 * picked for margin rather than reused, since nothing already in the palette
 * cleared 3:1 under this label between `vermilion` and `vermilionLit` (issue
 * #149's PRD comment, #145).
 *
 * Extended by issue #184 for the template's full set of kinds and states —
 * `components/Button.tsx` is the one place every value below is read. The
 * primary figures above (`fill`, `litFill`, `ink`, `mark`, `edge`,
 * `restingFill`, `restingInk`) are unchanged from issue #149; `lift` is
 * corrected to the template's own inset (it was `rgba(255, 246, 230, 0.35)`,
 * a figure this ticket found does not match `design/templates/state-tree.html`
 * line 484 and no longer measures anything real now that the template has
 * been redrawn since #149 shipped) and everything else here is new.
 */
export const CONTROL = {
  /** The temple's own red, opaque: the same value as {@link SCENE.vermilion}. */
  fill: SCENE.vermilion,
  /** The same, brighter, under a finger — new, and not {@link SCENE.vermilionLit}. */
  litFill: '#E45926',
  /** What is written on it. Not translucent: this is the part that is read. */
  ink: '#FFF3E2',
  /**
   * The sun dot drawn before the label — white on cream rather than the
   * paper's own {@link SCENE.cream}, so the mark reads as a small light of its
   * own rather than as another line of text.
   */
  mark: '#FFF6E6',
  /** The ring round the primary dot, at rest and while loading alike. */
  markRing: 'rgba(255, 246, 230, 0.18)',
  /**
   * The 1.5 px edge round the pill: gold, decorative, and never the same
   * colour as {@link SCENE.vermilionLit} — that stays the forest's own lit
   * edge and never carries a word (issue #149). This one is not read off the
   * scene's own palette at all; it belongs to the control alone.
   */
  edge: 'rgba(201, 162, 39, 0.85)',
  /**
   * The lift that separates the pill from the picture behind it — sampled just
   * outside the pill on all three scenes, the gold edge alone reads close to
   * 1:1 against the art over most of its perimeter, so this shadow is doing
   * the actual work of the boundary and is not decoration to be tidied away.
   */
  lift: '0 10px 24px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  /** The lift under a finger: the same shadow with a gold bloom added. */
  hoverLift:
    '0 12px 28px -10px rgba(0, 0, 0, 0.7), 0 0 22px -4px rgba(201, 162, 39, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
  /** The gold the keyboard-focus ring is drawn in — the template's `--gold`. */
  focusOutline: '#C9A227',
  /** A control that cannot be pressed yet: the temple's shadowed side, opaque. */
  restingFill: SCENE.vermilionDeep,
  /**
   * What is written on a control that cannot be pressed yet, unchanged by this
   * ticket: it was already seventy-eight per cent, not fifty-five as issue
   * #149's own PRD comment describes it — a translucent label is read off the
   * fill it sits on, and the two only agree once the fill above is opaque
   * (`theme.test.ts`).
   */
  restingInk: 'rgba(243, 236, 217, 0.78)',
  /** The edge of a control that cannot be pressed yet — thinner than at rest. */
  restingEdge: 'rgba(242, 118, 47, 0.3)',
  /** The edge of a control that is loading — a different thinning again. */
  loadingEdge: 'rgba(242, 118, 47, 0.5)',
  /**
   * The dot's own colour while loading, and while carrying a danger edge — the
   * two states that read it off {@link SCENE.vermilionLit} rather than off the
   * primary {@link mark}.
   */
  litDot: SCENE.vermilionLit,
  /** The hollow ring a dot is drawn with once its control cannot be pressed. */
  disabledDotRing: 'rgba(243, 236, 217, 0.42)',
} as const;

/**
 * The control's `quiet` kind — a translucent surface standing directly on the
 * picture, for an action that is not this scene's one loud thing (issue
 * #184): copying a link, ending a game. Read off the same template lines as
 * {@link CONTROL} (`design/templates/state-tree.html`, `.btn.quiet` and
 * `.btn.danger`), and a sibling of it rather than a field on it, since nothing
 * here is a further derivation of the primary kind's own figures — a quiet
 * button never becomes a primary one by adding an opacity.
 */
export const QUIET_CONTROL = {
  fill: 'rgba(14, 20, 16, 0.62)',
  hoverFill: 'rgba(14, 20, 16, 0.74)',
  edge: 'rgba(243, 236, 217, 0.46)',
  /** The edge under a finger — the same cream the label and the dot are drawn in. */
  hoverEdge: SCENE.cream,
  ink: SCENE.cream,
  mark: SCENE.cream,
  markRing: 'rgba(243, 236, 217, 0.14)',
  /** The `danger` modifier — `.btn.danger` over a `.btn.quiet` surface only. */
  dangerEdge: 'rgba(218, 70, 32, 0.7)',
  dangerInk: '#F6C9B6',
  dangerHoverFill: 'rgba(147, 41, 15, 0.72)',
  dangerHoverEdge: SCENE.vermilionLit,
} as const;
