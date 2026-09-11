/**
 * Numbers that are always the same numbers, from a seed.
 *
 * This used to live in `brushwork.ts`, alongside the drawing primitives the
 * procedural forest was built from. Issue #152 removes that forest — the
 * scene is a picture now, not a few thousand brush strokes — but the greeting
 * cloth still wants a pattern that looks scattered and is the same pattern on
 * every load (`paint-cloth.ts`), so this one function moved rather than going
 * with the rest of the file.
 */

/**
 * Mulberry32: thirty-two bits of state, no dependency, and the same sequence
 * everywhere. Which one it is matters less than that it is one.
 *
 * @param seed - Which sequence to take
 * @returns A source of numbers from 0 up to but not including 1
 *
 * @example
 * const random = seeded(4114);
 */
export const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
