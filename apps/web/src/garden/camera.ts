import type { Location } from './locations';

/**
 * The one camera this app is looked at through: how long it takes to get
 * anywhere, the shape of the journey, and how much of the interface is showing
 * while it travels.
 *
 * All of it is arithmetic over plain values, with no canvas and no DOM, for the
 * same reason `world.ts` and `petals.ts` are: this is the half of the movement
 * that can be held to something. Whether it *looks* right is nobody's assertion
 * to make, but whether the magnification grows by a constant factor a second,
 * and whether the arriving screen is still invisible at the halfway point, are
 * questions with answers.
 *
 * There is one camera and not one per screen. It never cuts and never dissolves
 * between two pictures: it moves through a single world and gets closer to part
 * of it, which is why walking into the temple needs no second scene — the hall
 * is painted inside the doorway, so arriving is a magnification and nothing else
 * (`world.ts`, {@link OPENING}).
 */

/**
 * How long a journey takes, wherever it goes.
 *
 * One duration for every move rather than a distance divided by a speed. What
 * the four places are is a step of a game — the gate, the doors, the hall — and
 * a step of a game takes as long as a step of a game takes, however far apart
 * two of them happen to be drawn.
 */
export const CAMERA_MS = 1100;

/**
 * The curve, as CSS spells it.
 *
 * Nothing reads this: {@link eased} is the curve, and it is written out by hand
 * below because a canvas has no `transition` to hand it to. It is here so that
 * the value in the ticket and the value in the code can be compared without
 * solving a cubic, and it is checked against the solver by `camera.test.ts`.
 *
 * Smooth away, quickest in the middle, smooth in. The alternative that was
 * tried first — a sharp start and a long slowing down — reads as a jolt on the
 * way in: at the gate the whole forest is on screen, and a camera that leaves
 * quickly takes the entire picture with it.
 */
export const CAMERA_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** The two handles of that curve, across and up. */
const HANDLES = { firstX: 0.65, firstY: 0, secondX: 0.35, secondY: 1 } as const;

/**
 * How long the screen ahead has to be built in, before the camera may start.
 *
 * It is a ceiling and not a wait. The screen changes first and the camera is
 * started by the change, so by the time anything moves the next screen is
 * already mounted and laid out — this is the number that arrangement has to
 * stay under, not a delay anybody sits through
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 */
export const PREPARE_MS = 140;

/** The share of the journey the screen being left takes to go. */
const OUT_FADE = 0.22;

/** The share of it, at the far end, that the screen being arrived at takes to appear. */
const IN_FADE = 0.26;

/**
 * One point on a cubic Bézier with its ends pinned at 0 and 1.
 *
 * @param first - The first handle, on the axis being worked out
 * @param second - The second handle, on the same axis
 * @param t - How far along the curve's own parameter
 * @returns Where that axis has got to
 */
const along = (first: number, second: number, t: number): number => {
  const rest = 1 - t;

  return 3 * rest * rest * t * first + 3 * rest * t * t * second + t * t * t;
};

/** How fast that axis is moving at `t`, which is what the search below steers by. */
const slope = (first: number, second: number, t: number): number => {
  const rest = 1 - t;

  return 3 * rest * rest * first + 6 * rest * t * (second - first) + 3 * t * t * (1 - second);
};

/** How close to the asked-for time the search has to get before it stops. */
const CLOSE_ENOUGH = 1e-6;

/** How many times it may try. */
const TRIES = 8;

/**
 * The curve's own parameter at a moment in time.
 *
 * A Bézier is not a function of time: both axes are given in terms of a third
 * parameter, so the time axis has to be inverted before the other one can be
 * read. Newton's method does it in a handful of steps.
 *
 * There is no fallback for a search that fails to converge, and that is a
 * statement about this curve rather than optimism about the method. The handles
 * are a constant of this file: along the time axis the curve never rises more
 * slowly than about half a unit a unit, so Newton cannot divide by anything
 * near nothing and cannot walk away from the answer. `camera.test.ts` samples
 * the whole range against the curve worked out the slow way, so a change of
 * handles that broke the assumption would fail there rather than quietly return
 * a guess.
 *
 * @param time - How far through the journey, 0 to 1
 * @returns The parameter at which the curve is at that time
 */
const parameterAt = (time: number): number => {
  let guess = time;

  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    const error = along(HANDLES.firstX, HANDLES.secondX, guess) - time;

    if (Math.abs(error) < CLOSE_ENOUGH) {
      break;
    }

    guess -= error / slope(HANDLES.firstX, HANDLES.secondX, guess);
  }

  return guess;
};

/**
 * How far through the journey the camera actually is, at a given moment of it.
 *
 * @param time - How far through in wall-clock terms, 0 to 1
 * @returns How far through in distance, 0 to 1
 *
 * @example
 * eased(0.5); // 0.5 — the curve is symmetrical, and this is its one fixed point
 */
export const eased = (time: number): number => {
  if (time <= 0) {
    return 0;
  }

  if (time >= 1) {
    return 1;
  }

  return along(HANDLES.firstY, HANDLES.secondY, parameterAt(time));
};

/**
 * Whether two places are the same place, whatever they are called.
 *
 * The hall and the hall at the end of a game are two locations and one place
 * ({@link CONGRATULATIONS}), so this is what stops the end of a game being a
 * journey of no distance: without it the camera would run its full duration
 * going nowhere, and take the interface off the screen and back for the length
 * of it.
 *
 * @param one - A place
 * @param other - Another
 * @returns Whether a camera would have anything to do
 *
 * @example
 * isSamePlace(HALL, CONGRATULATIONS); // true — an ending happens at the table
 */
export const isSamePlace = (one: Location, other: Location): boolean =>
  one.x === other.x && one.y === other.y && one.zoom === other.zoom;

/**
 * Where the camera is, part way from one place to another.
 *
 * The magnification is interpolated through its own logarithm and the point is
 * not, and that difference is the whole of why this function exists. From the
 * gate to the hall the magnification grows three and a half times over; halfway
 * through, a straight line between 1 and 3.6 is at 2.3, which is a good deal
 * more than half the distance in — so the last third of the journey arrives in
 * a rush nobody asked for. Interpolated through the logarithm, every equal
 * slice of the journey multiplies the magnification by the same factor, which
 * is what "moving towards something at a steady rate" means when the thing
 * being moved is a magnification.
 *
 * @param from - Where the journey started
 * @param to - Where it is going
 * @param time - How far through it is, 0 to 1
 * @returns The place the window is looking at now
 *
 * @example
 * travelled(GATE, HALL, 0.5); // halfway, at a magnification of 1.897
 */
export const travelled = (from: Location, to: Location, time: number): Location => {
  const share = eased(time);

  return {
    id: to.id,
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, share),
  };
};

/**
 * How much of the whole journey is left, once a share of it has gone.
 *
 * Cubed rather than squared, and rather than left as a straight line, for one
 * reason that is not taste. The shift between two screens of a room runs for
 * 180 milliseconds of its own and is not this ticket's to change (issue #93),
 * so for the first sixth of every journey there is a screen arriving underneath
 * this fade. A straight line lets it be seen at about half strength before it
 * is taken away again, which is a flash of the destination at the moment of
 * leaving; going quickly and then settling holds it under a quarter, where it
 * reads as the picture dissolving rather than as a screen that changed its mind.
 *
 * @param share - How far through the fade, 0 to 1
 * @returns What is left of it
 */
const settling = (share: number): number => Math.pow(1 - share, 3);

/**
 * How much of the app is showing, at a moment of a journey.
 *
 * The rule the whole transition is built on is that starting the camera is a
 * promise that the screen ahead is ready: nothing is fetched, measured, decoded
 * or laid out once anything is moving, because the one place a player is looking
 * hardest is the middle of a frame that is travelling
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`). What is left for
 * this function is only the showing of it — out at the near end, in at the far
 * one, and nothing in between, so the middle of the journey is the place alone.
 *
 * @param time - How far through the journey, 0 to 1
 * @returns The opacity the interface is drawn at
 *
 * @example
 * screenOpacity(0.5); // 0 — halfway there is nothing on the screen but the world
 */
export const screenOpacity = (time: number): number => {
  if (time <= 0 || time >= 1) {
    return 1;
  }

  if (time < OUT_FADE) {
    return settling(time / OUT_FADE);
  }

  const arriving = (time - (1 - IN_FADE)) / IN_FADE;

  return arriving <= 0 ? 0 : 1 - settling(arriving);
};
