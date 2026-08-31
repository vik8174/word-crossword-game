import type { SceneBrush } from './brushwork';
import { paintBackground, paintForeground, paintMiddleGround } from './paint-forest';
import { paintTemple } from './paint-temple';
import { SCENE } from './scene-palette';
import type { Rect, Viewport } from './world';

/**
 * The whole picture, painted into one window.
 *
 * Four passes in the order light reaches them, and the temple in the middle of
 * that order rather than on top of it: the near canopy hangs in front of the
 * roof, which is what stops the building from reading as a sticker on a wall of
 * green.
 *
 * The frame is what the window is showing, in world units. Everything below
 * works in world units and the one transform here is what makes that possible —
 * which is also why the same code draws a forest at a magnification of one and
 * the inside of a room at three and a half.
 *
 * There is no clearing step. The first thing painted is the air, and it covers
 * the whole world, so whatever was on the canvas a moment ago is under an
 * opaque sky rather than showing through it.
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

  paintBackground(brush);
  paintTemple(brush);
  paintMiddleGround(brush);
  paintForeground(brush);

  brush.restore();
};
