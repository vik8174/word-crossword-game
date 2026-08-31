import { describe, expect, it } from 'vitest';

import { CLOTH } from './cloth';
import { spreadOf } from './colour-spread';
import { SHOJI_PAPER } from './paint-hall';
import { BLOSSOM, BLOSSOM_SHIFT } from './paint-sakura';
import { BAND, CONTROL, SCENE, SCENE_EDGE, SCENE_INK_DIM, VEIL } from './scene-palette';

/**
 * What this file is for: the garden writes cream on a painting, and a painting
 * is not one colour.
 *
 * The theme measures ink on paper and refuses a palette the board cannot be
 * read from (`theme.test.ts`,
 * `docs/decisions/0015-explained-words-in-the-grid.md`). The scene needs the
 * same guard for the same reason and it is harder to eyeball, because what is
 * behind a line of text here is a forest, a temple wall, a wooden floor or a
 * sheet of lit paper — and only one of those is the difficult one.
 *
 * So the worst case is measured rather than assumed. Every surface a sentence
 * can land on is listed below, and the two inks this place writes in have to
 * clear the contrast small text is owed on all of them.
 */

/**
 * What small text has to reach to be read, and what the boundary of a control
 * has to reach to be seen.
 */
const SMALL_TEXT = 4.5;
const COMPONENT_EDGE = 3;

/** A colour, as the three numbers a contrast is worked out from. */
type Rgb = readonly [number, number, number];

/** `#RRGGBB` as three numbers. */
const asRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Either spelling of a colour — `#RRGGBB` or `rgba(...)` — as numbers and an alpha. */
const asRgba = (colour: string): { readonly rgb: Rgb; readonly alpha: number } => {
  if (colour.startsWith('#')) {
    return { rgb: asRgb(colour), alpha: 1 };
  }

  const parts = colour
    .slice(colour.indexOf('(') + 1, colour.indexOf(')'))
    .split(',')
    .map((part) => Number(part.trim()));

  return { rgb: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0], alpha: parts[3] ?? 1 };
};

/** One colour laid over another at an opacity, as a browser composites them. */
const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb => [
  alpha * top[0] + (1 - alpha) * bottom[0],
  alpha * top[1] + (1 - alpha) * bottom[1],
  alpha * top[2] + (1 - alpha) * bottom[2],
];

/** A channel, undone from the curve a screen applies to it. */
const straightened = (channel: number): number => {
  const share = channel / 255;

  return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
};

/** How much light a colour sends out, as WCAG counts it. */
const lightness = ([red, green, blue]: Rgb): number =>
  0.2126 * straightened(red) + 0.7152 * straightened(green) + 0.0722 * straightened(blue);

/** How far apart two colours are, as WCAG counts it. */
const contrast = (one: Rgb, other: Rgb): number => {
  const [brighter, darker] = [lightness(one) + 0.05, lightness(other) + 0.05].sort(
    (first, second) => second - first,
  );

  return (brighter ?? 1) / (darker ?? 1);
};

/**
 * The most ink a petal carries, and what colour it carries it in.
 *
 * Kept beside the surfaces rather than imported from `petals.ts`, because what
 * is asserted below is the ceiling itself: a hand that raises it has to raise
 * it here too, and will then watch the numbers move.
 */
const PETAL = { colour: '#F2D3DA', ink: 0.52 } as const;

/** Every surface the name of a step can land on, which has no band under it. */
const UNBANDED = [SCENE.bark, SCENE.barkDeep, SCENE.night, SCENE.deep] as const;

/** A surface with a petal on it, which is what the weather does to any of them. */
const petalled = (paint: string): string => {
  const mixed = over(asRgb(PETAL.colour), PETAL.ink, asRgb(paint));

  return `#${mixed.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
};

/** A surface as the reader sees it: the paint, with the veil over it. */
const veiled = (paint: string): Rgb => {
  const veil = asRgba(VEIL);

  return over(veil.rgb, veil.alpha, asRgb(paint));
};

/** The same surface with a band over it, which is what text stands on. */
const banded = (paint: string): Rgb => {
  const band = asRgba(BAND);

  return over(band.rgb, band.alpha, veiled(paint));
};

/** A colour that may be translucent, laid over what is behind it. */
const laidOver = (paint: { readonly rgb: Rgb; readonly alpha: number }, behind: Rgb): Rgb =>
  over(paint.rgb, paint.alpha, behind);

/** Cream at the weight a secondary line is written in, over what it lands on. */
const dimOver = (surface: Rgb): Rgb => laidOver(asRgba(SCENE_INK_DIM), surface);

/**
 * The lightest tone a cherry is painted in.
 *
 * Worked out from the ramp and the shift the tree is actually drawn with rather
 * than written down here, because a blossom is not a token — it is the temple's
 * own reds taken most of the way to paper ({@link paintSakura}), and a hand
 * that later moves it a further tenth towards `cream` should fail here rather
 * than in somebody's eyes.
 */
const lightestBlossom = (): string => {
  const tones = spreadOf(BLOSSOM, BLOSSOM_SHIFT).flat();

  return tones.reduce(
    (brightest, tone) => (lightness(asRgb(tone)) > lightness(asRgb(brightest)) ? tone : brightest),
    tones[0] ?? SHOJI_PAPER[0],
  );
};

/**
 * Every surface a sentence can land on, brightest first.
 *
 * The blossom of the cherry trees is the brightest of them, and the lit paper
 * of the temple's doors — which had held that place — is second. Both are the
 * reason for the list: they are brighter than the rest of the picture by a long
 * way, the paper is what the crossword stands against, and the blossom hangs in
 * the window a visitor arrives in.
 */
const SURFACES = [
  { name: 'the blossom of a cherry', paint: lightestBlossom() },
  { name: 'the lit paper of the doors', paint: SHOJI_PAPER[0] },
  { name: 'the same paper further down', paint: SHOJI_PAPER[2] },
  { name: 'the wall of the hall', paint: SCENE.bark },
  { name: 'the roof of the temple', paint: SCENE.roof },
  { name: 'the near canopy', paint: SCENE.night },
] as const;

describe('what the garden writes on', () => {
  it('reads every sentence off the band, whatever the band is standing on', () => {
    // The band is what a sentence stands on everywhere in this app, and this is
    // why: over the brightest surface in the picture it is still dark enough to
    // read cream off, and the picture goes on showing through it.
    for (const surface of SURFACES) {
      const behind = banded(surface.paint);

      expect(contrast(asRgb(SCENE.cream), behind), `cream on ${surface.name}`).toBeGreaterThan(
        SMALL_TEXT,
      );
      expect(contrast(dimOver(behind), behind), `dim ink on ${surface.name}`).toBeGreaterThan(
        SMALL_TEXT,
      );
    }
  });

  it('reads the name of a step off the picture itself, which has no band under it', () => {
    // The ticket allows no band behind a step title (issue #115), so the scene
    // has to be dark wherever one is put — which is what the walls of the hall
    // and the leaves hanging into the corners of every frame are for.
    for (const paint of UNBANDED) {
      expect(contrast(asRgb(SCENE.cream), veiled(paint)), paint).toBeGreaterThan(SMALL_TEXT);
    }
  });

  it('goes on reading it with a petal in front of it', () => {
    // Petals are lighter than the forest now and there are twice as many of
    // them (issue #120), so one of them landing on a step title lifts what that
    // title is standing on. This is the measurement the ceiling on a petal's
    // ink was set from, and the reason it is a number rather than a taste: at
    // 0.52 the darkest surfaces still carry cream at better than four and a
    // half to one, and at 0.56 they do not.
    for (const paint of UNBANDED) {
      const behind = veiled(petalled(paint));

      expect(
        contrast(asRgb(SCENE.cream), behind),
        `cream under a petal on ${paint}`,
      ).toBeGreaterThan(SMALL_TEXT);
    }
  });

  it('reads the label off every control, in both of the states a control has', () => {
    // A control is not text on a surface but a surface of its own with text on
    // it, so what has to clear the threshold is its label against its own fill —
    // and its fill lets the picture through, which means the picture is part of
    // the measurement. The resting state is here for the same reason the pressed
    // one is not: waiting for the other player is the state somebody looks at
    // longest.
    const states = [
      { name: 'the one action', fill: CONTROL.fill, ink: CONTROL.ink },
      { name: 'a control that is waiting', fill: CONTROL.restingFill, ink: CONTROL.restingInk },
    ];

    for (const surface of SURFACES) {
      for (const state of states) {
        const control = laidOver(asRgba(state.fill), banded(surface.paint));
        const label = laidOver(asRgba(state.ink), control);

        expect(contrast(label, control), `${state.name} on ${surface.name}`).toBeGreaterThan(
          SMALL_TEXT,
        );
      }
    }
  });

  it('shows the edge of a field, which is the whole of what says there is one', () => {
    // A box around a field is a boundary rather than decoration, so it is owed
    // three to one and not nothing. The first screen a guest ever sees is a
    // nickname field on this band, and it arrives already focused.
    for (const surface of SURFACES) {
      const behind = banded(surface.paint);

      expect(
        contrast(laidOver(asRgba(SCENE_EDGE), behind), behind),
        `the edge of a field on ${surface.name}`,
      ).toBeGreaterThan(COMPONENT_EDGE);
    }
  });

  it('says plainly that lit paper is not something to write on unbanded', () => {
    // Recorded rather than left to be rediscovered: this is the measurement the
    // hall was resized around, and a future release that grows the paper back
    // over the whole window will fail here rather than in somebody's eyes.
    expect(contrast(asRgb(SCENE.cream), veiled(SHOJI_PAPER[0]))).toBeLessThan(COMPONENT_EDGE);

    // And the same about a control standing straight on it, which is why every
    // control in this app is either in a band or in the shade of the forest.
    const bare = laidOver(asRgba(CONTROL.fill), veiled(SHOJI_PAPER[0]));

    expect(contrast(laidOver(asRgba(CONTROL.ink), bare), bare)).toBeLessThan(SMALL_TEXT);
  });
});

/**
 * The cloth is the one surface in this place that is not a picture with an
 * interface over it, so it is measured on its own.
 *
 * Nothing standing on it is under the veil: the cloth is laid over the whole
 * window at the end of a game, above everything the app draws, and it is opaque
 * paper. What is written on it is therefore ink straight onto paper, at the
 * three tones the paper runs through from its lit edge to its shaded one — and
 * the bottom of that gradient is the surface every claim below has to survive.
 */
describe('what the cloth writes on', () => {
  it('reads both of its inks off the paper, at every tone of it', () => {
    for (const paper of CLOTH.paper) {
      const behind = asRgb(paper);

      expect(contrast(asRgb(CLOTH.ink), behind), `ink on ${paper}`).toBeGreaterThan(SMALL_TEXT);
      expect(
        contrast(laidOver(asRgba(CLOTH.inkDim), behind), behind),
        `dim ink on ${paper}`,
      ).toBeGreaterThan(SMALL_TEXT);
    }
  });

  it('reads the label off the one action, and shows the edge of the button it is on', () => {
    // The control is opaque here and translucent everywhere else in this app,
    // and this is why. Every other one stands on a forest and lets it through;
    // this one stands on paper, which lets nothing through, and the same fill
    // laid on it carries its label at 3.9 to one.
    const control = asRgb(CLOTH.action.fill);

    expect(contrast(laidOver(asRgba(CLOTH.action.ink), control), control)).toBeGreaterThan(
      SMALL_TEXT,
    );

    for (const paper of CLOTH.paper) {
      expect(contrast(control, asRgb(paper)), `the button on ${paper}`).toBeGreaterThan(
        COMPONENT_EDGE,
      );
    }
  });

  it('is made of the temple, and of nothing that is not already in the place', () => {
    // Not a saving. An ending made out of interface — a card, a dialog, a
    // colour off the theme — would be the application congratulating somebody,
    // and what is wanted is the room they played in doing it.
    expect(CLOTH.paper).toEqual(SHOJI_PAPER);

    for (const colour of [CLOTH.ink, CLOTH.rule, CLOTH.edge, CLOTH.action.fill]) {
      expect(Object.values<string>(SCENE)).toContain(colour);
    }
  });
});
