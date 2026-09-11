/**
 * Where the shipped hall images live, cut fresh from the source PNG the same
 * way `gate.avif` was (issue #151, `handoffs/scenes/README.md`).
 *
 * A module of its own for the same reason `gate-scene-paths.ts` is one: no
 * JSX and no MUI import, so anything that only wants the path — `Garden.tsx`
 * drawing the picture, a build script checking its weight — does not pull a
 * component's dependency tree in just to read one string out of it.
 *
 * One picture backs three screens: `playing`, `finished` and `closed-early`
 * all stand in the same hall, because a game ends at the table it was played
 * at rather than travelling anywhere to be answered
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 */

/** The AVIF the hall is drawn from, when a browser can decode it. */
export const HALL_AVIF = '/scenes/hall.avif';

/** The JPEG fallback, for a browser that cannot. */
export const HALL_JPG = '/scenes/hall.jpg';
