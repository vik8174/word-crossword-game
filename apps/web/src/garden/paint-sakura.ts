import { foliage, type SceneBrush, stroke, topOf, trunk } from './brushwork';
import { spreadOf } from './colour-spread';
import { SCENE } from './scene-palette';
import { inFrame, type Rect } from './world';

/**
 * The cherry trees, and the one thing they are for: giving the petals
 * somewhere to fall from.
 *
 * Petals had been falling over this app since before there was a garden behind
 * them, and once there was one they were falling out of nothing — a forest with
 * no cherry in it, dropping blossom. One tree in the frame the gate stands in
 * and one beside the temple is the whole fix, and it turns an effect into a
 * consequence.
 *
 * **The blossom is made of the reds the temple is painted in, taken most of the
 * way to paper.** The scene has twenty-two colours and no pink among them
 * (`scene-palette.ts`), and this ticket adds none: what a cherry needs is a
 * pale warm mass against dark green, and `vermilion` mixed two-thirds into
 * `cream` is exactly that. The trunk is the same bark as every other tree here,
 * kept dark, because the contrast between a black trunk and a pale crown is
 * most of what says *cherry* rather than *a light patch*.
 */

/**
 * The reds of the temple, taken most of the way to paper: what a blossom is.
 *
 * Exported because it is the brightest thing anybody in this app writes on.
 * `scene-palette.test.ts` keeps a list of every surface a sentence can land on
 * and holds both inks to what small text is owed over each of them, and the
 * blossom went straight to the top of that list — brighter than the lit paper
 * of the temple's own doors, which had held the record.
 */
export const BLOSSOM = [
  SCENE.vermilionDeep,
  SCENE.vermilion,
  SCENE.vermilionLit,
  SCENE.cream,
] as const;

/** How far towards paper, how flat, and by how much one flower may differ. */
export const BLOSSOM_SHIFT = {
  towards: SCENE.cream,
  haze: 0.62,
  contrast: 0.52,
  jitter: 0.05,
} as const;

/** One cherry: where it stands, how big, and how much of the distance is on it. */
interface Cherry {
  readonly x: number;
  readonly base: number;
  readonly top: number;
  readonly width: number;
  readonly seed: number;
  readonly rise: number;
  readonly across: number;
  readonly down: number;
  readonly count: number;
  readonly gaps: number;
  /** How much of its colour the air has left it, 0 to 1. */
  readonly near: number;
}

/**
 * The two of them: one in the frame the gate stands in, one beside the temple.
 *
 * The first is the one that matters. The gate is where a visitor arrives and
 * where the petals are most seen, so the tree they come off has to be in that
 * window rather than somewhere in the world that happens to have a cherry on
 * it.
 *
 * Neither of them may reach across the temple's doorway, and that is a rule
 * rather than an accident of where they were put. These are painted after the
 * temple, so blossom over the doorway would be blossom over the hall — and at
 * the magnification a game is played at the hall is the whole window
 * (`paint-sakura.test.ts`).
 */
const CHERRIES: readonly Cherry[] = [
  {
    x: 1560,
    base: 1276,
    top: 906,
    width: 44,
    seed: 2601,
    rise: 92,
    across: 232,
    down: 114,
    count: 158,
    gaps: 3,
    near: 0.94,
  },
  {
    x: 2620,
    base: 1210,
    top: 880,
    width: 36,
    seed: 2602,
    rise: 78,
    across: 200,
    down: 96,
    count: 126,
    gaps: 3,
    near: 0.86,
  },
];

/**
 * One cherry: a dark trunk, two boughs leaving it, and the blossom on top.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param cherry - The tree
 */
const paintCherry = (brush: SceneBrush, frame: Rect, cherry: Cherry): void => {
  const top = topOf(cherry);

  if (
    inFrame(frame, {
      x: cherry.x,
      y: (cherry.base + cherry.top) / 2,
      across: cherry.width * 2 + 40,
      down: (cherry.base - cherry.top) / 2 + cherry.width,
    })
  ) {
    trunk(brush, cherry, { lit: SCENE.bark, dark: SCENE.barkDeep }, 0.94);

    // The two boughs the crown sits on. A cherry with a straight stem under a
    // ball of blossom is a lollipop; the branches are what make it a tree.
    for (const side of [-1, 1]) {
      stroke(
        brush,
        {
          x: top + side * cherry.across * 0.34,
          y: cherry.top + cherry.width * 0.6,
          length: cherry.across * 0.9,
          width: cherry.width * 0.42,
          angle: side * 0.62,
        },
        SCENE.barkDeep,
        0.92,
      );
    }
  }

  if (
    inFrame(frame, {
      x: top,
      y: cherry.top - cherry.rise,
      across: cherry.across + 60,
      down: cherry.down + 60,
    })
  ) {
    foliage(brush, {
      x: top,
      y: cherry.top - cherry.rise,
      across: cherry.across,
      down: cherry.down,
      seed: cherry.seed,
      colours: spreadOf(BLOSSOM, BLOSSOM_SHIFT),
      count: cherry.count,
      size: 42,
      alpha: 0.55 + cherry.near * 0.34,
      gaps: cherry.gaps,
    });
  }
};

/**
 * The cherry trees the petals come off.
 *
 * Painted with the thicket, which is the plane they stand on: in front of the
 * temple and behind the leaves that hang into the top of every frame.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 *
 * @example
 * paintSakura(brush, frame);
 */
export const paintSakura = (brush: SceneBrush, frame: Rect): void => {
  for (const cherry of CHERRIES) {
    paintCherry(brush, frame, cherry);
  }
};
