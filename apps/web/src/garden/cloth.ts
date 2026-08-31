import { eased } from './camera';
import { SHOJI_PAPER } from './paint-hall';
import { CONTROL, SCENE } from './scene-palette';
import type { Rect, Viewport } from './world';

/**
 * The cloth a finished game is answered with: how long it takes, where it
 * hangs, and what it is made of.
 *
 * It is the whole of the reward, and that is a change from what was written
 * down before it. The greeting used to be the petals coming back over the
 * finished board (`docs/decisions/0030-where-movement-is-allowed.md`); a
 * finished game now stands at the table it was played at, inside the temple's
 * doorway, and the weather does not come indoors — so the petals it asked for
 * had no sky to fall in and the end of a game had gone silent
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * Everything here is arithmetic and colour with no canvas and no DOM, because
 * two very different things need the same numbers: {@link paintCloth} lays the
 * paper down, and {@link RewardCloth} stands the words on it in real letters
 * that can be read out and a real button that can be pressed.
 */

/** How long the whole thing takes, from a bare table to a cloth with words on it. */
export const CLOTH_MS = 1900;

/** The share of that in which the two halves travel and meet. */
export const CLOSED_AT = 0.58;

/** The share of it after which the words begin to show. */
export const GREETING_FROM = 0.64;

/** How dark the room behind the cloth goes, and how far into the event it gets there. */
const DIMMING = { most: 0.5, by: 0.25 } as const;

/** The tallest the cloth hangs, and the least air left above and below it. */
const BAND = { tallest: 360, shortest: 220, air: 160 } as const;

/**
 * What the cloth is made of.
 *
 * The temple's own paper and the temple's own red, and nothing that is not
 * already in the place. That is the point of the reward rather than a saving:
 * an ending made out of interface — a dialog, a card, a colour off the theme —
 * would be the application congratulating somebody, and what is wanted is the
 * room they played in doing it. The paper is literally the paper of the doors
 * they walked through ({@link SHOJI_PAPER}).
 */
export const CLOTH = {
  /** The paper, from where the light lands on it to where it does not. */
  paper: SHOJI_PAPER,
  /** What is written on it. */
  ink: SCENE.barkDeep,
  /** A second line, said more quietly, at the weight the scene dims its own ink to. */
  inkDim: 'rgba(28, 26, 26, 0.78)',
  /** The rule under the greeting: cinnabar, and decoration rather than text. */
  rule: SCENE.vermilion,
  /** The lit edge of a half that is still travelling. */
  edge: SCENE.vermilionDeep,
  /** The rings and the chrysanthemums printed on it. */
  pattern: { strong: SCENE.vermilionDeep, soft: SCENE.vermilion },
  /** The one action, opaque because paper lets nothing through. */
  action: { fill: SCENE.vermilionDeep, ink: CONTROL.ink },
} as const;

/**
 * How far each half of the cloth has come, at a moment of the event.
 *
 * The two halves are done before the whole is: they meet at
 * {@link CLOSED_AT} and the rest of the time belongs to the words. What
 * that gap is for is the order of the moment — the picture is given to the
 * reader first and the sentence second, which is the difference between a
 * cloth being laid and a message being displayed on one.
 *
 * @param time - How far through the event, 0 to 1
 * @returns The share of its own half-width each side has crossed, 0 to 1
 *
 * @example
 * closed(0.58); // 1 — the halves have met
 */
export const closed = (time: number): number =>
  eased(Math.min(Math.max(time, 0), CLOSED_AT) / CLOSED_AT);

/**
 * How much of the greeting is showing.
 *
 * @param time - How far through the event, 0 to 1
 * @returns The opacity the words are drawn at
 *
 * @example
 * showingWords(0.64); // 0 — the cloth is down and the words have not started
 */
export const showingWords = (time: number): number =>
  time <= GREETING_FROM ? 0 : Math.min((time - GREETING_FROM) / (1 - GREETING_FROM), 1);

/**
 * How dark the room behind the cloth has gone.
 *
 * @param time - How far through the event, 0 to 1
 * @returns The opacity of the dimming over everything else
 */
export const dimming = (time: number): number =>
  DIMMING.most * Math.min(Math.max(time, 0) / DIMMING.by, 1);

/**
 * Where the cloth hangs in a window of this size.
 *
 * It runs the full width and is given a height rather than a share of one, so
 * that a tall window does not answer a finished game with a banner half a storey
 * high. Its own two limits are what a short window is held to: enough air above
 * and below to read as hanging, and never so little cloth that the words on it
 * have to be stacked to fit.
 *
 * @param viewport - How big the window is
 * @returns The band it occupies, in CSS pixels
 *
 * @example
 * const band = clothBand({ width: 1440, height: 900 }); // 360 tall, centred
 */
export const clothBand = (viewport: Viewport): Rect => {
  const height = Math.min(BAND.tallest, Math.max(BAND.shortest, viewport.height - BAND.air));
  const top = Math.max(0, (viewport.height - height) / 2);

  return { x: 0, y: top, width: viewport.width, height };
};
