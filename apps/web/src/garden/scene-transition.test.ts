import { describe, expect, it } from 'vitest';

import { SCENE_BLOOM_SX, SCENE_SUN_SX } from './scene-transition';

/**
 * The point the light of a scene change is built around, as both halves of it
 * write the point down.
 *
 * The bloom is a gradient drawn around a point; the sun is a box placed at
 * one. Nothing in the type system makes those two agree, and when they
 * disagree the sun opens outside the light it is supposed to open inside —
 * which is exactly what shipped in the first round of this ticket.
 */
const POINT = { left: '50%', top: '52%' };

describe('the light of a scene change', () => {
  it('opens the sun around the same point the bloom is drawn around', () => {
    expect(SCENE_SUN_SX.left).toBe(POINT.left);
    expect(SCENE_SUN_SX.top).toBe(POINT.top);
    expect(SCENE_BLOOM_SX.backgroundImage).toContain(`circle at ${POINT.left} ${POINT.top}`);
  });

  it('pulls the sun back by half of itself, as a length and not as a spacing step', () => {
    // The defect this pins: `marginLeft: -42` in an `sx` is an index into the
    // theme's spacing scale, not 42 pixels. It is not one of the steps, so MUI
    // dropped it and the circle rendered from its corner — 42 px low and right
    // of the bloom — in dev and in a production build alike.
    expect(SCENE_SUN_SX.marginLeft).toBe(SCENE_SUN_SX.marginTop);
    expect(SCENE_SUN_SX.marginLeft).toMatch(/^-\d+px$/);
    expect(SCENE_SUN_SX.marginLeft).toBe(`${-SCENE_SUN_SX.width / 2}px`);
    expect(SCENE_SUN_SX.width).toBe(SCENE_SUN_SX.height);
  });
});
