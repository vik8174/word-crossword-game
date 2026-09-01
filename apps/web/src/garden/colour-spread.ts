/**
 * The colours a stroke may take, worked out once instead of once a stroke.
 *
 * A ramp of leaf colours is not painted as it is written. Distance lays air
 * over it, a mass far enough away loses the contrast inside itself, and no two
 * leaves in one crown are the same tone — so what a stroke actually wants is a
 * ramp already shifted for the plane it belongs to and already spread into a
 * few tones around each step. Working that out where the stroke is drawn means
 * building a colour string per mark, and a browser parses a colour string more
 * slowly than it fills the shape the string was for.
 *
 * So it is done here, keyed by the ramp and the shift, and the result is held.
 * The scene has a fixed table of planes, which means the whole set is built
 * during the first painting of a tab and every frame after it is lookups. That
 * is the whole reason the picture can afford six planes instead of three: the
 * cost of depth is strokes, and none of it needed to be colour arithmetic.
 *
 * Values are plain numbers over plain strings with no canvas anywhere, for the
 * same reason `world.ts` and `petals.ts` are: this half can be held to
 * something.
 */

import { seeded } from './brushwork';

/** How many tones one step of a ramp is spread into. */
const VARIANTS = 8;

/** Which spread this is, so the same one comes out every load. */
const SPREAD_SEED = 5150;

/** A ramp shifted for one plane: a set of tones for each of its steps. */
export type Spread = readonly (readonly string[])[];

/**
 * What distance does to a ramp on its way to one plane of the picture.
 *
 * Three of the four things that change with depth are here — lightness towards
 * the air, contrast inside the mass, and how far one leaf may fall from its
 * tone. The fourth, the size of the mark, is not a colour and belongs to the
 * mass itself.
 */
export interface Shift {
  /** The colour the distance is made of, which for a forest is its air. */
  readonly towards?: string;
  /** How much of that air lies between the reader and this plane, 0 to 1. */
  readonly haze?: number;
  /**
   * How much of the ramp's own range survives, 0 to 1.
   *
   * One is the ramp as written. Towards zero every step is pulled in to the
   * middle of the ramp, until a mass is one flat tone — which is what a mass
   * of leaves a long way off actually looks like.
   */
  readonly contrast?: number;
  /** How far a single leaf may fall either side of its step, 0 to 1. */
  readonly jitter?: number;
}

/** A colour as three numbers. */
type Rgb = readonly [number, number, number];

/** `#RRGGBB` as three numbers. */
const asRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Three numbers back as `#RRGGBB`, which is the cheapest thing a canvas parses. */
const asHex = (rgb: Rgb): string =>
  `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** One colour part of the way to another. */
const mix = (from: Rgb, to: Rgb, at: number): Rgb => [
  from[0] + (to[0] - from[0]) * at,
  from[1] + (to[1] - from[1]) * at,
  from[2] + (to[2] - from[2]) * at,
];

/** The middle of a ramp, which is what contrast is lost towards. */
const middleOf = (ramp: readonly Rgb[]): Rgb =>
  ramp.reduce<Rgb>(
    (sum, colour) => [
      sum[0] + colour[0] / ramp.length,
      sum[1] + colour[1] / ramp.length,
      sum[2] + colour[2] / ramp.length,
    ],
    [0, 0, 0],
  );

/** Every spread asked for so far, by the ramp and the shift it came from. */
const SPREADS = new Map<string, Spread>();

/**
 * A ramp, shifted for one plane and spread into tones a stroke can pick from.
 *
 * Asked for by name rather than built by the caller so that the same ramp and
 * the same shift are one array however many masses want them, and so that a
 * plane costs its strokes and nothing else on every frame after the first.
 *
 * @param ramp - The colours of the plane, dark to light, as `#RRGGBB`
 * @param shift - What distance does to them; nothing by default, which returns the ramp as written
 * @returns The tones, by step of the ramp
 *
 * @example
 * const tones = spreadOf(FAR_LEAF, { towards: SCENE.shade, haze: 0.55, contrast: 0.4, jitter: 0.06 });
 */
export const spreadOf = (ramp: readonly string[], shift: Shift = {}): Spread => {
  const haze = shift.haze ?? 0;
  const contrast = shift.contrast ?? 1;
  const jitter = shift.jitter ?? 0;
  const towards = shift.towards ?? '#000000';
  const key = `${ramp.join('')}|${towards}|${haze}|${contrast}|${jitter}`;
  const held = SPREADS.get(key);

  if (held !== undefined) {
    return held;
  }

  const random = seeded(SPREAD_SEED);
  const colours = ramp.map(asRgb);
  const middle = middleOf(colours);
  const air = asRgb(towards);

  const spread: Spread = colours.map((colour) => {
    const flattened = mix(colour, middle, 1 - contrast);
    const hazed = mix(flattened, air, haze);

    // A ramp with nothing shifting it is one tone per step rather than eight of
    // the same string: an unshifted spread is what the picture is painted in
    // wherever a mass is near enough to keep its own colours, and holding one
    // copy of each is what makes that free.
    if (jitter === 0) {
      return [asHex(hazed)];
    }

    return Array.from({ length: VARIANTS }, () => {
      const away = (random() - 0.5) * 2 * jitter;

      return asHex(mix(hazed, away > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(away)));
    });
  });

  SPREADS.set(key, spread);

  return spread;
};
