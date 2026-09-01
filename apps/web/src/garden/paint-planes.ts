import { foliage, type SceneBrush, stroke } from './brushwork';
import { spreadOf } from './colour-spread';
import { AIR, AIR_MIDDLE, BARK, type Crossing, type Plane, type PlaneTree } from './forest-planes';
import { SCENE } from './scene-palette';
import { inFrame, type Rect, WORLD } from './world';
import { trunk, trunkOf } from './trunks';

/**
 * How one step of the stairs is put down: its trees, their crowns, the boughs
 * that leave them, and the sheet of air over the lot.
 *
 * The order inside a plane is the order light reaches it — trunks, then the
 * crowns that hang on them, then the sheet — and the order between planes is
 * `PLANES` itself. Nothing here decides how deep anything is; the numbers are
 * `forest-planes.ts` and this only reads them.
 */

/** How far past the window the sheet of air is drawn, in world units. */
const BLEED = 2;

/**
 * The air of the place, as a colour that runs from the top of the world to the
 * bottom of it.
 *
 * The one gradient behind both the sky and every sheet laid between one plane
 * and the next. Measured down the whole world rather than down the window, so
 * it is the same air wherever the camera is standing — a haze mixed for the
 * window would change colour while a camera was travelling.
 *
 * @param brush - What is being drawn through
 * @returns The air, top to bottom
 */
export const airOf = (brush: SceneBrush): CanvasGradient => {
  const air = brush.createLinearGradient(0, 0, 0, WORLD.height);

  air.addColorStop(0, AIR.top);
  air.addColorStop(AIR_MIDDLE, AIR.middle);
  air.addColorStop(1, AIR.bottom);

  return air;
};

/**
 * Where a plane's leaves reach, so that a crown just off the window is not
 * painted and one just on it is.
 *
 * @param tree - The tree the crown hangs on
 * @param top - Where its trunk came out
 * @param size - How big one leaf on this plane is
 * @returns The box the crown is inside
 */
const crownBounds = (tree: PlaneTree, top: number, size: number) => ({
  x: top,
  y: tree.top - tree.rise,
  across: tree.across + size,
  down: tree.down + size,
});

/**
 * One tree of a plane: the trunk, and the crown that hangs where it came out.
 *
 * The crown is put at the top of the trunk rather than at a place of its own,
 * and that is the whole of what "a tree" means here as against "a mass of
 * leaves". Where the top lands is worked out whether or not the trunk is inside
 * the window, so a crown does not move when the camera does.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param plane - The plane it stands on
 * @param tree - The tree
 * @param leaves - The tones its crown is drawn from
 */
const paintTree = (
  brush: SceneBrush,
  frame: Rect,
  plane: Plane,
  tree: PlaneTree,
  leaves: ReturnType<typeof spreadOf>,
): void => {
  const shape = trunkOf(tree);
  const top = shape.top;

  if (
    inFrame(frame, {
      x: tree.x,
      y: (tree.base + tree.top) / 2,
      across: tree.width * 2 + 30,
      down: (tree.base - tree.top) / 2 + tree.width,
    })
  ) {
    const bark = spreadOf([BARK.dark, BARK.lit], { towards: plane.air, haze: 1 - plane.bark });

    trunk(
      brush,
      shape,
      { dark: bark[0]?.[0] ?? BARK.dark, lit: bark[1]?.[0] ?? BARK.lit },
      0.55 + plane.bark * 0.41,
    );
  }

  if (inFrame(frame, crownBounds(tree, top, plane.size))) {
    foliage(brush, {
      x: top,
      y: tree.top - tree.rise,
      across: tree.across,
      down: tree.down,
      seed: tree.seed,
      colours: leaves,
      count: tree.count,
      size: plane.size,
      alpha: plane.alpha,
      gaps: tree.gaps,
    });
  }
};

/**
 * A sheet of the colour of the air, laid over everything painted so far.
 *
 * This is what makes the planes planes. The four ramps a plane is written with
 * say what a mass at that distance is made of; the sheet says there is air
 * between it and the next one, and it is the only part of the depth that also
 * reaches the things that are not leaves — the ridge behind the temple is
 * dimmed by the same sheet that dims the trees standing on it.
 *
 * It is one rectangle over the window, which is why six planes cost what three
 * used to: the whole of the aerial perspective in this picture is five fills.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param depth - How thick the sheet is, 0 to 1
 */
export const paintVeil = (brush: SceneBrush, frame: Rect, depth: number): void => {
  if (depth <= 0) {
    return;
  }

  brush.save();
  brush.globalAlpha = depth;
  brush.fillStyle = airOf(brush);
  brush.fillRect(
    frame.x - BLEED,
    frame.y - BLEED,
    frame.width + BLEED * 2,
    frame.height + BLEED * 2,
  );
  brush.restore();
};

/**
 * The boughs that cross from one plane into the next.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param crossings - The boughs
 */
const paintCrossings = (brush: SceneBrush, frame: Rect, crossings: readonly Crossing[]): void => {
  for (const crossing of crossings) {
    const reach = crossing.length / 2 + crossing.width;

    if (!inFrame(frame, { x: crossing.x, y: crossing.y, across: reach, down: reach })) {
      continue;
    }

    const bark = spreadOf([SCENE.barkDeep], { towards: AIR.bottom, haze: 1 - crossing.bark });

    stroke(brush, crossing, bark[0]?.[0] ?? SCENE.barkDeep, 0.6 + crossing.bark * 0.35);
  }
};

/**
 * One plane, and the air in front of it.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param plane - Which step of the stairs
 *
 * @example
 * paintPlane(brush, frame, PLANES[0]);
 */
export const paintPlane = (brush: SceneBrush, frame: Rect, plane: Plane): void => {
  const leaves = spreadOf(plane.ramp, {
    towards: plane.air,
    haze: plane.haze,
    contrast: plane.contrast,
    jitter: plane.jitter,
  });

  for (const tree of plane.trees) {
    paintTree(brush, frame, plane, tree, leaves);
  }

  paintVeil(brush, frame, plane.veil);
  paintCrossings(brush, frame, plane.crossings ?? []);
};
