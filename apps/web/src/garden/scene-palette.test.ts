import { describe, expect, it } from 'vitest';

import { CLOTH } from './cloth';
import { INK, TONES } from './petals';
import {
  BAND,
  CONTROL,
  SCENE,
  SCENE_EDGE,
  SCENE_INK_DIM,
  SHOJI_PAPER,
  VEIL_STOPS,
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

/** A colour that may be translucent, laid over what is behind it. */
const laidOver = (paint: { readonly rgb: Rgb; readonly alpha: number }, behind: Rgb): Rgb =>
  over(paint.rgb, paint.alpha, behind);

/**
 * A surface as the reader sees it: the paint, with one stop of the veil's
 * gradient over it.
 *
 * `VEIL` is a gradient now (issue #190) and has no single alpha a test could
 * pull back out of its CSS string, so this reads the three named stops
 * ({@link VEIL_STOPS}) directly instead of parsing it. Every claim below takes
 * whichever stop is worst for it: `'thin'`, the lightest, for anything that
 * cannot be shown to stand within the top 28% of the window — which is
 * everything a band or a petal falls across — and `'top'` only for a step
 * title, which always does (`stepTitleSx`, `scene-surface.ts`).
 *
 * @param paint - The picture underneath
 * @param stop - Which of the veil's three stops is over it; `'thin'` unless said otherwise
 */
const veiled = (paint: string, stop: keyof typeof VEIL_STOPS = 'thin'): Rgb =>
  laidOver(asRgba(VEIL_STOPS[stop]), asRgb(paint));

/** The same surface with a band over it, which is what text stands on. */
const banded = (behind: Rgb): Rgb => laidOver(asRgba(BAND), behind);

/** Cream at the weight a secondary line is written in, over what it lands on. */
const dimOver = (surface: Rgb): Rgb => laidOver(asRgba(SCENE_INK_DIM), surface);

/**
 * The brightest petal, at its fullest ink — the worst case for what a petal
 * leaves behind it, over whatever is already standing there.
 *
 * Read from where the app reads them ({@link INK}, {@link TONES}) rather than
 * written down again: a guard holding its own copy of a ceiling goes on
 * passing after somebody raises the real one, and this is the guard that
 * ceiling exists for. `TONES[0]`, `#F7D3B8`, is confirmed the lightest of the
 * three by its own WCAG luminance, which is also why it leaves the least
 * contrast behind it.
 */
const PETAL = { tone: TONES[0], ink: INK.most } as const;

/**
 * A petal laid over whatever is behind it — above the veil and below a band,
 * exactly where the picture stands it (`canvas-layer.ts`'s `LAYERS`).
 *
 * @param behind - The surface the petal falls across, veil already applied
 */
const petalledOver = (behind: Rgb): Rgb =>
  laidOver({ rgb: asRgb(PETAL.tone), alpha: PETAL.ink }, behind);

/** Every surface the name of a step can land on, which has no band under it. */
const UNBANDED = [SCENE.bark, SCENE.barkDeep, SCENE.night, SCENE.deep] as const;

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

/**
 * The flat paint behind the worst dim-ink window this issue found on the
 * running page — not one of {@link SURFACES}, which are synthetic worst
 * cases nobody's band actually stands on, but a real screenshot.
 *
 * Measured on `lobby` (the doors), 834 x 1112, the RoomShell zone column with
 * the host alone (no invite panel showing): off real screenshots at the
 * veil's thinnest stop, text and the petal canvas hidden with
 * `visibility: hidden`, no petal behind the band, across nine points of the
 * 26 s Ken Burns push — the worst of every zone column on `lobby` and
 * `playing`, at 375, 834 and 1440 (`handoffs/verdicts/190/`, round 2
 * corrected in round 3 after the Inspector found the round 2 figure, the
 * hall at 834, was not in fact the worst). The worst 180 x 22 window, at the
 * start of the push, read `rgb(79.6, 77.8, 58.7)` once banded; this is that
 * reading inverted back through {@link veiled} and {@link banded} to the
 * flat paint that reproduces it — the inversion is clean here (it lands
 * inside 0-255, and recomposites to dim 5.104:1), which the strip under the
 * board's own readings below do not.
 */
const PAGE_WORST_SURFACE = '#B29C74';

describe('what the garden writes on', () => {
  it('reads every sentence off the band, whatever the band is standing on', () => {
    // The band is what a sentence stands on everywhere in this app, and this is
    // why: over the brightest surface in the picture it is still dark enough to
    // read cream off, and the picture goes on showing through it. Measured at
    // the veil's thinnest stop, which is the worst case: a band can stand
    // anywhere down the window, and the middle of it is where the veil now
    // dims least (issue #190).
    //
    // Dim ink is checked once, below, against {@link PAGE_WORST_SURFACE}
    // rather than inside this loop: {@link SURFACES}' own brightest entry
    // reads worse than any band a player's screen actually paints (the next
    // guard records that), so holding dim ink to it here would be testing a
    // surface nobody stands on rather than the one this app draws.
    for (const surface of SURFACES) {
      const behind = banded(veiled(surface.paint));

      expect(contrast(asRgb(SCENE.cream), behind), `cream on ${surface.name}`).toBeGreaterThan(
        SMALL_TEXT,
      );
    }

    const worstPageWindow = banded(veiled(PAGE_WORST_SURFACE));

    expect(
      contrast(dimOver(worstPageWindow), worstPageWindow),
      'dim ink at the worst zone-column window measured on the page',
    ).toBeGreaterThan(SMALL_TEXT);
  });

  it('names the reason dim ink is not used on the bands at the gate', () => {
    // SHOJI_PAPER[0], SURFACES' own brightest entry, is a worst case nobody's
    // band stands on (the guard above measures the page instead) — but it is
    // still the reason the gate's bands read full cream rather than .78: a
    // future band that does stand this close to raw lit paper would fail
    // here first, in a test, rather than in a player's eyes.
    const behind = banded(veiled(SHOJI_PAPER[0]));

    expect(contrast(dimOver(behind), behind), 'dim ink on the lit paper of the doors').toBeLessThan(
      SMALL_TEXT,
    );
  });

  it('records the strip under the board at 1440 as known below the small-text bar', () => {
    // The strip under the board (`SENTENCE_BAND_SX`, `scene-surface.ts`) is
    // not a zone column and is not what the guards above stand for: it only
    // carries text once a game is running, and at 1440 it is 915px wide
    // between the two zone columns, wide enough to reach the brightest,
    // most central part of the hall's lit floor. Off real screenshots, the
    // same method as PAGE_WORST_SURFACE above, both of its lines read below
    // 4.5 there:
    //
    // - "The arrow keys move around the whole grid…" — 2.59-3.23:1 across the
    //   push on this branch, and already 3.10-3.84:1 on `main` before this
    //   issue's veil. No ink this app has clears it there: full cream only
    //   reaches 3.25-4.22:1.
    // - "Two of your words cross…" — 4.72-5.23:1 on `main`, falling to
    //   4.23-4.54:1 on this branch from 13s into the push on. Full cream
    //   holds it at 5.80-6.62:1.
    //
    // Recorded rather than fixed: the look of the strip under the board is
    // Viktor's to choose (full cream, a darker surface under it, or left as
    // it is) and goes into the template and the game-room issue (#139, item
    // 14), not into #190. Both constants below are the worst reading's
    // background already banded and veiled — not a flat paint run through
    // {@link veiled}/{@link banded} like {@link PAGE_WORST_SURFACE}, because
    // that inversion does not hold here: the real photograph behind this
    // strip, at its brightest, reads lighter than any paint a .55 band could
    // produce from (the arithmetic asks for a red channel above 255).
    const arrowKeysWorst: Rgb = [176.14, 117.55, 56.81];
    const twoWordsWorst: Rgb = [134.8, 75.61, 32.85];

    expect(
      contrast(dimOver(arrowKeysWorst), arrowKeysWorst),
      'dim ink on the strip under the board, "The arrow keys" line, at 1440',
    ).toBeLessThan(SMALL_TEXT);
    expect(
      contrast(dimOver(twoWordsWorst), twoWordsWorst),
      'dim ink on the strip under the board, "Two of your words cross" line, at 1440',
    ).toBeLessThan(SMALL_TEXT);
  });

  it('reads the name of a step off the picture itself, which has no band under it', () => {
    // The ticket allows no band behind a step title (issue #115), so the scene
    // has to be dark wherever one is put — which is what the walls of the hall
    // and the leaves hanging into the corners of every frame are for. Measured
    // at the veil's top stop rather than its thinnest: `stepTitleSx` always
    // places a title within the top 28% of the window, so this is the stop
    // that is actually over it rather than a worst case borrowed from
    // somewhere else on the page.
    for (const paint of UNBANDED) {
      expect(contrast(asRgb(SCENE.cream), veiled(paint, 'top')), paint).toBeGreaterThan(SMALL_TEXT);
    }
  });

  it('reads a band with the brightest petal crossing behind it, over the brightest surface behind that', () => {
    // Viktor's decision (2026-09-13, issue #190): the template's petals are
    // shown everywhere they fall, including over an unbanded step title, where
    // one now falls to 1.4-3.0:1 rather than clearing 4.5 as the app's own
    // dimmer petals did. That case is accepted rather than held here — see the
    // comment beside `INK` in `petals.ts`, which is where the ceiling on a
    // petal's ink is explained now.
    //
    // What still has to hold is the band every other sentence in this app
    // actually stands on: a petal is drawn above the veil and below every band
    // (`canvas-layer.ts`'s `LAYERS`), so a band's own translucency lets a
    // petal crossing behind it tint what the band is read against. Checked at
    // the brightest tone and the fullest ink over every surface a band can
    // stand on, which is the combination that leaves the least contrast —
    // cream still clears 4.5 there, at 4.55 on the worst of them.
    for (const surface of SURFACES) {
      const behind = banded(petalledOver(veiled(surface.paint)));

      expect(
        contrast(asRgb(SCENE.cream), behind),
        `cream on ${surface.name} with a petal behind the band`,
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
    //
    // The lit paper of the doors — `SURFACES[0]`, the brightest of them — is
    // left out of this loop rather than made to fail it: the guard below
    // records that one separately, at the figure it actually reads.
    for (const surface of SURFACES.slice(1)) {
      const behind = banded(veiled(surface.paint));

      expect(
        contrast(laidOver(asRgba(SCENE_EDGE), behind), behind),
        `the edge of a field on ${surface.name}`,
      ).toBeGreaterThan(COMPONENT_EDGE);
    }
  });

  it('says plainly that a field edge falls under three on the lit paper of the doors', () => {
    // Recorded rather than left to be rediscovered, the same way the guard
    // below this one is: `SCENE_EDGE` at .55 already falls under 3:1 on a
    // band standing over the lit paper of the doors, under the template's
    // veil (issue #190) — 2.64:1, not 3. Two things keep this from being a
    // silent regression rather than a recorded one:
    //
    // #193, already written, replaces this outline with the template's own
    // opaque field fill everywhere on the gate, so the figure below stops
    // describing anything a player sees there the day it merges. The one
    // place this outline survives #193 is the invite link in the lobby,
    // which stands on this same band and keeps `SCENE_EDGE` until the lobby
    // issue gives it its own field styling.
    const surface = SURFACES[0];
    const behind = banded(veiled(surface.paint));

    expect(
      contrast(laidOver(asRgba(SCENE_EDGE), behind), behind),
      `the edge of a field on ${surface.name}`,
    ).toBeLessThan(COMPONENT_EDGE);
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
