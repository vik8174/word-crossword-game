/**
 * Where the shipped gate images live, cut fresh from the source PNG (issue
 * #151).
 *
 * A module of its own, with no JSX and no MUI import, because `vite.config.ts`
 * reads `GATE_AVIF` too — to preload exactly the file `GateScene` draws rather
 * than a second copy of the same path typed out by hand
 * (`build/scene-preload.ts`) — and a build script has no business pulling a
 * component's own dependency tree in just to read one string out of it.
 */

/** The AVIF the gate is drawn from, when a browser can decode it. */
export const GATE_AVIF = '/scenes/gate.avif';

/** The JPEG fallback, for a browser that cannot. */
export const GATE_JPG = '/scenes/gate.jpg';
