import type { Location } from './locations';

/**
 * The one world every screen of this app is drawn somewhere in, and the
 * arithmetic that says which part of it a window is showing.
 *
 * All of it is numbers over plain values with no canvas anywhere in the file,
 * for the same reason `petals.ts` is: this is the half of the scene that can be
 * held to something. What a browser does with the numbers is the painting
 * modules', and that half no assertion can read.
 *
 * The frame is anchored to the **height** of the window and never to its width.
 * A narrow window therefore sees a narrower slice of the same painting rather
 * than the whole painting made small: a phone loses field of view, which is
 * what a phone should lose, and it loses nothing of the size anything is drawn
 * at. It is also the only anchoring under which a magnification means one thing
 * on every screen, which is what lets the camera travel between the four places
 * without meaning something different on each window (`camera.ts`).
 */

/** How big the painting is, in world units. */
export const WORLD = { width: 3200, height: 1400 } as const;

/** How much of it a window shows at a magnification of one. */
export const BASE_FRAME_HEIGHT = 900;

/**
 * The open front of the temple: a rectangle of the world with another scene
 * painted inside it.
 *
 * It is a hole in two senses. Everything the hall is made of is drawn in here
 * and clipped to it, so walking in is one movement of one camera rather than a
 * change of screen; and nothing that falls through the air is drawn inside it,
 * because the doorway is a hole in the weather.
 */
export const OPENING = { x: 2150, y: 800, width: 460, height: 290 } as const;

/**
 * The hall's own coordinates, which the opening is a window onto.
 *
 * Written at the size of a comfortable screen rather than at the size of the
 * doorway, so that everything inside is drawn once, at one scale, and squeezed
 * into whatever the doorway happens to be. A hall drawn directly in world units
 * would have to be redrawn at every magnification to keep a floorboard a
 * floorboard.
 */
export const INTERIOR = { width: 1440, height: 900 } as const;

/** The things in the forest that have a place: for the scene, and for anything hung on one. */
export const LANDMARKS = {
  /** The foot of the torii, between its two posts. */
  gate: { x: 1050, y: 1120 },
  /** The middle of the temple, at the level of its platform. */
  temple: { x: 2150, y: 1000 },
  /** The middle of the water. */
  pond: { x: 1400, y: 1300 },
  /** The foot of the stone lantern. */
  lantern: { x: 1700, y: 1180 },
  /** Where the tree that frames the right of the picture comes out of the ground. */
  trunk: { x: 2980, y: 1400 },
} as const;

/** How far above the foot of the gate its lintel is, in world units. */
export const GATE_LINTEL_RISE = 436;

/** A point of the world, or of the hall. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A rectangle, given by its top left corner. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A part of the world named the way the scene names its parts: by its middle
 * and how far it reaches, rather than by a corner.
 *
 * Every mass of leaves, every tree and every building is already written this
 * way, so a box round one is the numbers it was drawn from and not a second
 * description of it that could drift.
 */
export interface Bounds {
  readonly x: number;
  readonly y: number;
  /** How far it reaches either side of its middle, and above and below it. */
  readonly across: number;
  readonly down: number;
}

/**
 * Whether any of this is inside the window, and therefore worth painting.
 *
 * The scene is one painting three thousand two hundred units wide, and a frame
 * is a window onto part of it: at the magnification a game is played at, about
 * a fourteenth of the world is on the screen. Everything else was being drawn
 * anyway — every stroke of it, on every frame of every journey — because a
 * canvas throws away what falls outside it silently and late, after the whole
 * cost of the shape has been paid.
 *
 * A box is generous on purpose. What it holds is the middle and reach a mass
 * was written with, and a mass scatters strokes as wide as its reach plus half
 * a leaf, so callers add the leaf. Painting something just off the edge costs
 * one frame's strokes; missing something just on it is a hole in the picture.
 *
 * @param frame - The part of the world being shown, from {@link frameFor}
 * @param bounds - What is about to be painted, by its middle and its reach
 * @returns Whether the two overlap at all
 *
 * @example
 * if (inFrame(frame, { x: 900, y: 420, across: 1000, down: 380 })) foliage(brush, mass);
 */
export const inFrame = (frame: Rect, bounds: Bounds): boolean =>
  bounds.x + bounds.across >= frame.x &&
  bounds.x - bounds.across <= frame.x + frame.width &&
  bounds.y + bounds.down >= frame.y &&
  bounds.y - bounds.down <= frame.y + frame.height;

/** The window the world is being looked at through, in CSS pixels. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * The part of the world one window shows from one place.
 *
 * @param location - Where the window is standing
 * @param viewport - How big the window is
 * @returns The rectangle of the world inside it, in world units
 *
 * @example
 * frameFor(GATE, { width: 1440, height: 900 }); // 1440 × 900 of world
 */
export const frameFor = (location: Location, viewport: Viewport): Rect => {
  const height = BASE_FRAME_HEIGHT / location.zoom;
  // A window with no height would otherwise make every frame infinitely wide,
  // and every projection below a division by nothing. It happens: jsdom hands
  // out zeroes, and so does a tab being restored.
  const width = viewport.height > 0 ? height * (viewport.width / viewport.height) : height;

  return { x: location.x - width / 2, y: location.y - height / 2, width, height };
};

/**
 * Where a point of the world lands in the window.
 *
 * This is what lets a control be pinned to something in the picture rather than
 * to a corner of the screen: the game's name hangs over the gate because the
 * gate is at a place, and it will go on hanging there when the camera moves.
 *
 * @param point - Somewhere in the world
 * @param frame - The part of the world being shown, from {@link frameFor}
 * @param viewport - How big the window is
 * @returns Where it falls, in CSS pixels from the top left of the window
 *
 * @example
 * toScreen(LANDMARKS.gate, frame, viewport);
 */
export const toScreen = (point: Point, frame: Rect, viewport: Viewport): Point => ({
  x: ((point.x - frame.x) / frame.width) * viewport.width,
  y: ((point.y - frame.y) / frame.height) * viewport.height,
});

/**
 * Where a rectangle of the world lands in the window.
 *
 * @param rect - A rectangle in world units, given by its centre
 * @param frame - The part of the world being shown
 * @param viewport - How big the window is
 * @returns The same rectangle in CSS pixels, given by its top left corner
 */
const rectToScreen = (
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  frame: Rect,
  viewport: Viewport,
): Rect => {
  const topLeft = toScreen(
    { x: rect.x - rect.width / 2, y: rect.y - rect.height / 2 },
    frame,
    viewport,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: (rect.width / frame.width) * viewport.width,
    height: (rect.height / frame.height) * viewport.height,
  };
};

/**
 * Where the doorway falls in the window, from a given place.
 *
 * Asked for by the petals, and by nothing that is not geometry: a petal inside
 * this rectangle is over the hall and is simply not drawn. There is no flag
 * anywhere saying whether the weather is indoors — the shape of the doorway is
 * the whole of the rule, so it holds at every magnification and goes on holding
 * while a camera is moving through it.
 *
 * @param frame - The part of the world being shown
 * @param viewport - How big the window is
 * @returns The doorway in CSS pixels
 *
 * @example
 * paintPetals(brush, petals, sky, colour, openingOnScreen(frame, sky));
 */
export const openingOnScreen = (frame: Rect, viewport: Viewport): Rect =>
  rectToScreen(OPENING, frame, viewport);

/**
 * The top left corner of the doorway in world units, which is where the hall's
 * own coordinates begin.
 */
export const openingRect = (): Rect => ({
  x: OPENING.x - OPENING.width / 2,
  y: OPENING.y - OPENING.height / 2,
  width: OPENING.width,
  height: OPENING.height,
});
