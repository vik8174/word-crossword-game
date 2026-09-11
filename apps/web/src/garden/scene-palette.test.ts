import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { CLOTH } from './cloth';
import { INK } from './petals';
import {
  BAND,
  CONTROL,
  SCENE,
  SCENE_EDGE,
  SCENE_INK_DIM,
  SHOJI_PAPER,
  VEIL,
} from './scene-palette';

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
 * Both read from where the app reads them rather than written down again. A
 * guard holding its own copy of a ceiling goes on passing after somebody raises
 * the real one, and this is the guard that ceiling exists for
 * ({@link PetalLayer}, `petals.ts`).
 */
const PETAL = { colour: theme.palette.sakura.light, ink: INK.most } as const;

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
 * Every surface a sentence can land on, brightest first.
 *
 * The lit paper of the temple's doors is the brightest of them by a long way —
 * it is what the crossword stands against, and every claim this file makes
 * about text being readable is, at bottom, a claim about that one surface. The
 * scene stopped being painted stroke by stroke in issue #152, so a cherry
 * blossom's exact tone is no longer a ramp this file can compute; the paper
 * remains a value in code (`scene-palette.ts`'s `SHOJI_PAPER`) because the
 * greeting cloth is still drawn from it, unlike the rest of the scene.
 */
const SURFACES = [
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

  // The control's own three states used to be measured here, laid over every
  // surface in {@link SURFACES}, because a translucent fill let the picture
  // through and the picture was part of what had to be measured. Issue #149
  // made every one of `CONTROL`'s fills opaque precisely so that this would
  // stop being true: the label now reads the same figure against its fill on
  // the gate, the doors and the hall alike, and re-measuring it against every
  // surface a scene can paint behind it would only prove the same number six
  // times over. That figure now lives in `theme.test.ts`, beside the label
  // size it is held to, and this file goes back to what it is for — the
  // picture, not the interface standing on it.

  it('paints the control opaque, in the three reds issue #149 settled on', () => {
    // Written down as exact values rather than only as a contrast figure,
    // because the same ratio can be reached by an opaque colour or by a
    // translucent one with the picture behind it — and the whole point of this
    // ticket was that the second of those reads differently at every pixel of
    // the pill, on every scene it stands on (`scene-surface.ts`).
    expect(CONTROL.fill).toBe('#DA4620');
    expect(CONTROL.litFill).toBe('#E45926');
    expect(CONTROL.restingFill).toBe('#93290F');
    expect(CONTROL.restingInk).toBe('rgba(243, 236, 217, 0.78)');
  });

  it('never lets the control read a word off its own lit edge', () => {
    // `vermilionLit` used to be the control's hover fill — the very thing this
    // ticket found at 2.50:1, the worst figure anywhere in the app. Issue #149
    // retires it from carrying text for good: it stays a decorative highlight
    // elsewhere (`CrosswordGrid.tsx`, `AnsweredMark.tsx`) and the control's own
    // edge is a gold that is not read out of the scene's palette at all, so
    // the two can never be reunited by a later hand reaching for the same
    // token out of habit.
    for (const colour of [CONTROL.fill, CONTROL.litFill, CONTROL.ink, CONTROL.restingFill]) {
      expect(colour).not.toBe(SCENE.vermilionLit);
    }
    expect(CONTROL.edge).not.toBe(SCENE.vermilionLit);
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
    //
    // A control standing straight on the lit paper used to be measured here
    // too, back when its fill was translucent and the paper showed through it.
    // Issue #149 made the fill opaque, which is the whole point of opacity: a
    // control's label no longer depends on what is behind the control, so
    // there is nothing left of that case for this file to hold — `theme.test.ts`
    // now measures the label against its own fill directly, with no surface
    // in the question at all.
    expect(contrast(asRgb(SCENE.cream), veiled(SHOJI_PAPER[0]))).toBeLessThan(COMPONENT_EDGE);
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
