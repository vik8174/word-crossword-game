/**
 * Where the shipped doors images live, cut fresh from the source PNG the same
 * way `gate.avif` was (issue #151, `handoffs/scenes/README.md`).
 *
 * A module of its own for the same reason `gate-scene-paths.ts` is one: no
 * JSX and no MUI import, so anything that only wants the path — `Garden.tsx`
 * drawing the picture, a build script checking its weight — does not pull a
 * component's dependency tree in just to read one string out of it.
 */

/** The AVIF the doors are drawn from, when a browser can decode it. */
export const DOORS_AVIF = '/scenes/doors.avif';

/** The JPEG fallback, for a browser that cannot. */
export const DOORS_JPG = '/scenes/doors.jpg';
