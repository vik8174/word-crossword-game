import { describe, expect, it } from 'vitest';

import {
  GATE_ACTION_SX,
  GATE_INK,
  GATE_LOCKUP_X,
  GATE_NAME_BAND,
  GATE_NAME_SX,
  GATE_TAGLINE_BAND,
  GATE_TAGLINE_SX,
} from './gate-chrome';

/**
 * What this file is for: the bands below are a place on `gate.jpg`, measured
 * against its real pixels rather than computed from anything (issue #151,
 * `handoffs/scenes/README.md`). There is no formula here to exercise the way
 * `world.test.ts` exercises `frameFor` — what there is to hold still is that
 * the numbers do not quietly drift, and that the box built from them is
 * positioned as a percentage of the stage rather than of the window in some
 * other unit that would stop meaning the same thing on a phone.
 */
describe('the measured bands', () => {
  it('has not drifted from what was measured against the real picture', () => {
    expect(GATE_NAME_BAND).toEqual({ top: 5.0, bottom: 10.1 });
    expect(GATE_TAGLINE_BAND).toEqual({ top: 12.5, bottom: 15.1 });
    expect(GATE_LOCKUP_X).toEqual({ left: 24, right: 77 });
  });

  it('is sumi, not the cream the painted garden writes on its own canopy', () => {
    expect(GATE_INK).toBe('#1C1A1A');
  });
});

describe('GATE_NAME_SX and GATE_TAGLINE_SX', () => {
  it('is a box against the stage, not the window', () => {
    // Percentages on `top`/`height`/`left`/`width` for an absolutely
    // positioned box resolve against its containing block — the stage
    // `HomePage.tsx` sizes to the full viewport — which is what lets a
    // `getBoundingClientRect` reading be checked against these same numbers
    // directly, on any window size at all.
    expect(GATE_NAME_SX.position).toBe('absolute');
    expect(GATE_NAME_SX.top).toBe('5.0%');
    expect(GATE_NAME_SX.height).toBe('5.1%');
    expect(GATE_NAME_SX.left).toBe('24.0%');
    expect(GATE_NAME_SX.width).toBe('53.0%');
  });

  it('reserves the tagline band a step below the name, same width', () => {
    expect(GATE_TAGLINE_SX.top).toBe('12.5%');
    expect(GATE_TAGLINE_SX.height).toBe('2.6%');
    expect(GATE_TAGLINE_SX.left).toBe(GATE_NAME_SX.left);
    expect(GATE_TAGLINE_SX.width).toBe(GATE_NAME_SX.width);
  });

  it('centres whatever stands in it, both ways', () => {
    for (const sx of [GATE_NAME_SX, GATE_TAGLINE_SX]) {
      expect(sx.display).toBe('flex');
      expect(sx.alignItems).toBe('center');
      expect(sx.justifyContent).toBe('center');
      expect(sx.textAlign).toBe('center');
    }
  });
});

describe('GATE_ACTION_SX', () => {
  it('stands at the middle of the stage, not a corner of the window', () => {
    expect(GATE_ACTION_SX.position).toBe('absolute');
    expect(GATE_ACTION_SX.left).toBe('50%');
    expect(GATE_ACTION_SX.transform).toBe('translate(-50%, -50%)');
  });

  it('shrinks to its label rather than the room the stage happens to offer', () => {
    // The trap issue #127 found: a box given `left` and no `right` is offered
    // the whole width to the edge of its containing block before the
    // transform ever recentres it, which can wrap a short label wider than it
    // needs to be.
    expect(GATE_ACTION_SX.width).toBe('max-content');
    expect(GATE_ACTION_SX.maxWidth).toBe('90vw');
  });
});
