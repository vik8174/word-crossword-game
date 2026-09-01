import type { SceneBrush } from './brushwork';
import { PLANES, SAKURA_ON, TEMPLE_AFTER } from './forest-planes';
import { paintBackground, paintForeground, paintMiddleGround, paintWater } from './paint-forest';
import { paintGround, paintShore } from './paint-ground';
import { paintPlane } from './paint-planes';
import { paintSakura } from './paint-sakura';
import { paintTemple } from './paint-temple';
import { SCENE } from './scene-palette';
import type { Rect, Viewport } from './world';

/**
 * The whole picture, painted into one window.
 *
 * The order below is the whole of the depth. Six planes of trees from the ridge
 * to the reader's shoulder (`forest-planes.ts`), a sheet of air over each of
 * the far ones, the ground they stand on, and the temple between the fourth and
 * the fifth of them rather than on top of them — the bank is what it is built
 * on and the thicket is in front of it, which is what stops the building from
 * reading as a sticker on a wall of green.
 *
 * Nothing here is scaled or offset by distance. A plane is further away because
 * its leaves are smaller, flatter and closer to the colour of the air, and
 * because there is a sheet of that air between it and the next one.
 *
 * The frame is what the window is showing, in world units. Everything below
 * works in world units and the one transform here is what makes that possible —
 * which is also why the same code draws a forest at a magnification of one and
 * the inside of a room at three and a half.
 *
 * There is no clearing step. The first thing painted is the air, and it covers
 * the whole window, so whatever was on the canvas a moment ago is under an
 * opaque sky rather than showing through it.
 *
 * The frame is handed to every pass rather than kept here, and that is the one
 * thing about this file worth reading twice. The picture is three thousand two
 * hundred units wide and a window at the magnification a game is played at
 * shows about a fourteenth of it; without the frame each pass painted the whole
 * world on every frame of every journey and let the canvas throw away what fell
 * outside — after paying for it (`inFrame` in `world.ts`).
 *
 * @param brush - What is being drawn through, in CSS pixels
 * @param frame - The part of the world to show, from `frameFor`
 * @param viewport - The window it is being shown in
 *
 * @example
 * paintScene(context, frameFor(location, viewport), viewport);
 */
export const paintScene = (brush: SceneBrush, frame: Rect, viewport: Viewport): void => {
  brush.save();

  // Under everything, and only ever seen where the world runs out: a window
  // wider than the painting at this magnification would otherwise show whatever
  // the canvas held before.
  brush.globalAlpha = 1;
  brush.fillStyle = SCENE.night;
  brush.fillRect(0, 0, viewport.width, viewport.height);

  const scale = frame.height > 0 ? viewport.height / frame.height : 1;

  brush.translate(-frame.x * scale, -frame.y * scale);
  brush.scale(scale, scale);

  paintBackground(brush, frame);

  for (const plane of PLANES) {
    paintPlane(brush, frame, plane);

    // The four things that are not leaves take their places in the same row.
    // The ground arrives with the bank because the bank is the plane that
    // stands on it, and the temple after both because it is built on it.
    if (plane.name === TEMPLE_AFTER) {
      paintGround(brush, frame);
      paintWater(brush, frame);
      paintShore(brush, frame);
      paintTemple(brush, frame);
      paintMiddleGround(brush, frame);
    }

    if (plane.name === SAKURA_ON) {
      paintSakura(brush, frame);
    }
  }

  paintForeground(brush, frame);

  brush.restore();
};
