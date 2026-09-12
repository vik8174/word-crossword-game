/**
 * One cubic-Bézier easing curve, pinned at (0, 0) and (1, 1).
 *
 * This used to be half of `camera.ts`: the camera and the greeting cloth both
 * wanted "smooth away, quickest in the middle, smooth in", and a Bézier is not
 * a function of time on its own — both axes are given in terms of a third
 * parameter, so the time axis has to be inverted before the other one can be
 * read. Issue #152 removes the camera; the cloth is the one thing left that
 * still wants this shape, so the curve moved here rather than leaving a file
 * named after a mechanism that no longer exists.
 */

/** The two handles of the curve, across and up. */
const HANDLES = { firstX: 0.65, firstY: 0, secondX: 0.35, secondY: 1 } as const;

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
 * statement about this curve rather than optimism about the method. The
 * handles are a constant of this file: along the time axis the curve never
 * rises more slowly than about half a unit a unit, so Newton cannot divide by
 * anything near nothing and cannot walk away from the answer. `easing.test.ts`
 * samples the whole range against the curve worked out the slow way, so a
 * change of handles that broke the assumption would fail there rather than
 * quietly return a guess.
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
 * How far through an event something eased on this curve actually is, at a
 * given moment of it.
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
