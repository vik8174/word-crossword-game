import { seeded } from './brushwork';
import { CLOTH, clothBand, closed, dimming } from './cloth';
import type { Rect, Viewport } from './world';

/**
 * The cloth being laid, painted into the window a finished game is looking at.
 *
 * Two halves grow in from the two edges and meet in the middle. What is printed
 * on them was printed before either of them moved: the pattern is worked out
 * once for the whole banner and the halves are windows onto it, so it runs
 * through the seam without a join and a half that has only half arrived shows
 * exactly the part of the pattern it has uncovered. A pattern drawn per half
 * would meet itself in the middle, which is the one thing a cloth does not do.
 *
 * Nothing about the words is here. They are letters somebody may want read
 * aloud and a button somebody has to be able to press, so they are the DOM's
 * ({@link RewardCloth}) and this paints only what they stand on.
 */

/**
 * The part of a canvas the cloth draws through, and nothing else.
 *
 * Narrowed rather than taken as a whole `CanvasRenderingContext2D`, for the
 * reason {@link PetalBrush} is: a browser context satisfies it without being
 * told to, and so does an object a test can read back.
 *
 * `clearRect` is the one call here that is not drawing, and it is the reason
 * this is not {@link SceneBrush}. The scene never clears anything, because the
 * first thing it lays down is an opaque sky; this lays down a half-transparent
 * dimming over a room that has to go on showing through it, and a canvas that
 * is not cleared would deepen that dimming by half again on every frame — a
 * room going quiet for the first few frames and then simply black.
 */
export interface ClothBrush {
  clearRect(x: number, y: number, width: number, height: number): void;
  save(): void;
  restore(): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
  ): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  globalAlpha: number;
  lineWidth: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
}

/** How many places on the banner are considered for a cluster of rings. */
const TRIES = 260;

/** How much of the banner is left clear in the middle, as the pattern falls off. */
const FALL_OFF = 1.25;

/** The two weights a cluster is drawn at, and how likely the heavier one is. */
const HEAVY = { chance: 0.62, alpha: 0.5, light: 0.26 } as const;

/** How wide a cluster of rings can be, in pixels. */
const CLUSTER = { least: 12, most: 52 } as const;

/** Where the chrysanthemums sit on the banner, as shares of it. */
const KIKU = [
  { across: 0.08, down: 0.16 },
  { across: 0.2, down: 0.78 },
  { across: 0.76, down: 0.86 },
  { across: 0.86, down: 0.13 },
  { across: 0.63, down: 0.9 },
] as const;

/** Where the one solid disc is, and how big, as shares of the banner. */
const DISC = { across: 0.9, down: 0.78, radius: 0.2 } as const;

/** The seed the whole banner is laid out from, so it is the same cloth every time. */
const SEED = 3131;

/** A circle, which is the one shape this whole pattern is made of. */
const ring = (brush: ClothBrush, x: number, y: number, radius: number): void => {
  brush.beginPath();
  brush.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2);
};

/** One cluster: circles inside circles, out to a radius. */
const rings = (brush: ClothBrush, x: number, y: number, radius: number): void => {
  const step = Math.max(3.5, radius * 0.17);

  for (let across = radius; across > radius * 0.16; across -= step) {
    brush.lineWidth = across > radius * 0.7 ? 1.2 : 0.8;
    ring(brush, x, y, across);
    brush.stroke();
  }
};

/**
 * A chrysanthemum: many thin petals off one centre, drawn rather than filled.
 *
 * @param brush - What it is drawn through
 * @param x - Its middle, across the window
 * @param y - Its middle, down the window
 * @param radius - How far its petals reach
 * @param seed - Which flower it is, so every one of them is its own
 */
const kiku = (brush: ClothBrush, x: number, y: number, radius: number, seed: number): void => {
  const random = seeded(seed);
  const petals = 22 + Math.floor(random() * 8);

  brush.lineWidth = Math.max(0.7, radius * 0.045);

  for (let index = 0; index < petals; index += 1) {
    const angle = (index / petals) * Math.PI * 2;

    brush.beginPath();
    brush.ellipse(
      x + Math.cos(angle) * radius * 0.6,
      y + Math.sin(angle) * radius * 0.6,
      radius * 0.42,
      radius * 0.12,
      angle,
      0,
      Math.PI * 2,
    );
    brush.stroke();
  }

  for (const heart of [0.2, 0.08]) {
    ring(brush, x, y, radius * heart);
    brush.stroke();
  }
};

/**
 * Everything printed on the banner, laid out across the whole of it.
 *
 * The middle is left clear and the corners are crowded, and that is not a
 * texture: the clear part is where the words are going to stand. It falls off
 * as the square of the distance from the nearer edge, so what a reader sees at
 * the moment the halves meet is a pattern opening out of the way.
 *
 * @param brush - What it is drawn through
 * @param band - The whole banner, both halves together
 */
const pattern = (brush: ClothBrush, band: Rect): void => {
  const random = seeded(SEED);

  for (let index = 0; index < TRIES; index += 1) {
    const x = band.x + random() * band.width;
    const y = band.y + random() * band.height;
    const across = Math.abs(x - (band.x + band.width / 2)) / (band.width / 2);
    const down = Math.abs(y - (band.y + band.height / 2)) / (band.height / 2);
    const fromEdge = Math.max(across, down);
    const radius = CLUSTER.least + random() * (CLUSTER.most - CLUSTER.least);
    const isHeavy = random() > HEAVY.chance;

    if (random() > fromEdge * fromEdge * FALL_OFF) {
      continue;
    }

    brush.strokeStyle = isHeavy ? CLOTH.pattern.strong : CLOTH.pattern.soft;
    brush.globalAlpha = (isHeavy ? HEAVY.alpha : HEAVY.light) * (0.45 + fromEdge * 0.55);
    rings(brush, x, y, radius);
  }

  brush.strokeStyle = CLOTH.pattern.strong;
  brush.globalAlpha = 0.5;

  KIKU.forEach((place, index) => {
    kiku(
      brush,
      band.x + band.width * place.across,
      band.y + band.height * place.down,
      16 + (index % 3) * 7,
      SEED + index * 17,
    );
  });

  // The one solid thing in a pattern of outlines, which is what the rest of it
  // is weighed against: without it the whole banner reads as a texture.
  brush.globalAlpha = 0.9;
  brush.fillStyle = CLOTH.pattern.strong;
  ring(
    brush,
    band.x + band.width * DISC.across,
    band.y + band.height * DISC.down,
    band.height * DISC.radius,
  );
  brush.fill();
  brush.globalAlpha = 1;
};

/** How wide the lit edge of a travelling half is, and how far it overhangs the cloth. */
const EDGE = { width: 5, overhang: 6 } as const;

/**
 * The cloth as it stands at one moment of the event.
 *
 * @param brush - What it is drawn through, in CSS pixels
 * @param viewport - The window it is being laid in
 * @param time - How far through the event, 0 to 1
 *
 * @example
 * paintCloth(context, { width: 1440, height: 900 }, 0.5);
 */
export const paintCloth = (brush: ClothBrush, viewport: Viewport, time: number): void => {
  const band = clothBand(viewport);
  const reached = closed(time);
  const half = (viewport.width / 2) * reached;

  brush.save();
  brush.clearRect(0, 0, viewport.width, viewport.height);
  brush.globalAlpha = 1;
  brush.fillStyle = `rgba(6, 17, 26, ${dimming(time)})`;
  brush.fillRect(0, 0, viewport.width, viewport.height);

  if (half < 1) {
    brush.restore();

    return;
  }

  // One clip of two rectangles rather than two of one. It is what makes the
  // pattern below a single pattern: it is laid out for the whole banner and
  // painted once, and the two halves are the parts of it that have arrived.
  brush.beginPath();
  brush.rect(0, band.y, half, band.height);
  brush.rect(viewport.width - half, band.y, half, band.height);
  brush.clip();

  const paper = brush.createLinearGradient(0, band.y, 0, band.y + band.height);

  paper.addColorStop(0, CLOTH.paper[0]);
  paper.addColorStop(0.5, CLOTH.paper[1]);
  paper.addColorStop(1, CLOTH.paper[2]);
  brush.fillStyle = paper;
  brush.fillRect(band.x, band.y, band.width, band.height);

  pattern(brush, band);
  brush.restore();

  if (reached >= 1) {
    return;
  }

  // The leading edge of each half, and only while there is one: a cloth that
  // has stopped is a cloth, and the line down the front of it belongs to the
  // moment it was still being drawn across.
  brush.save();
  brush.globalAlpha = 1;
  brush.fillStyle = CLOTH.edge;
  brush.fillRect(
    half - EDGE.width / 2,
    band.y - EDGE.overhang,
    EDGE.width,
    band.height + EDGE.overhang * 2,
  );
  brush.fillRect(
    viewport.width - half - EDGE.width / 2,
    band.y - EDGE.overhang,
    EDGE.width,
    band.height + EDGE.overhang * 2,
  );
  brush.restore();
};
