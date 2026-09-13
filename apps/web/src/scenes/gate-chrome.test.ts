import { describe, expect, it } from 'vitest';

import {
  GATE_ACTION_SX,
  GATE_INK,
  GATE_LOCKUP_SX,
  GATE_LOCKUP_TEXT_SIZE,
  GATE_RULE_SX,
} from './gate-chrome';

/**
 * What this file is for: the block's position is a place on `gate.jpg`,
 * measured against its real pixels rather than computed from anything (issue
 * #151, `handoffs/scenes/README.md`), and its width follows the template's
 * own formula rather than a number measured here (issue #191,
 * `design/templates/state-tree.html`). There is no formula to exercise the
 * way a geometry module's arithmetic once was — what there is to hold still
 * is that the numbers do not quietly drift, and that the box built from them
 * is positioned as a percentage of the stage rather than of the window in
 * some other unit that would stop meaning the same thing on a phone.
 */
describe('GATE_LOCKUP_SX', () => {
  it('is a box against the stage, not the window', () => {
    // Percentages on `top`/`left` for an absolutely positioned box resolve
    // against its containing block — the stage `HomePage.tsx` sizes to the
    // full viewport — which is what lets a `getBoundingClientRect` reading
    // be checked against these same numbers directly, on any window size at
    // all.
    expect(GATE_LOCKUP_SX.position).toBe('absolute');
    expect(GATE_LOCKUP_SX.left).toBe('50%');
    expect(GATE_LOCKUP_SX.top).toBe('5.0%');
    expect(GATE_LOCKUP_SX.transform).toBe('translateX(-50%)');
    expect(GATE_LOCKUP_SX.textAlign).toBe('center');
  });

  it('is 52% of the window when the window is at least as wide as 16:9', () => {
    expect(GATE_LOCKUP_SX.width).toBe('52%');
  });

  it('follows the picture instead on a window narrower than 16:9', () => {
    const narrow = GATE_LOCKUP_SX['@media (max-aspect-ratio: 16/9)'] as {
      width: string;
    };

    expect(narrow.width).toBe('min(92%, calc(100vh * 16 / 9 * 0.52))');
  });

  it('is sumi, not the cream the painted garden writes on its own canopy', () => {
    expect(GATE_INK).toBe('#1C1A1A');
  });
});

describe('GATE_LOCKUP_TEXT_SIZE', () => {
  it('is the same clamp the name and the rule both size off', () => {
    expect(GATE_LOCKUP_TEXT_SIZE).toBe('clamp(15px, 2.35vw, 31px)');
  });
});

describe('GATE_RULE_SX', () => {
  it('is a 2px sumi bar, capped at 220px and centred under the name', () => {
    expect(GATE_RULE_SX.height).toBe('2px');
    expect(GATE_RULE_SX.width).toBe('min(220px, 46%)');
    expect(GATE_RULE_SX.margin).toBe('0.28em auto 0');
    expect(GATE_RULE_SX.background).toBe(GATE_INK);
  });

  it("shares the name's size so its margin scales with it", () => {
    expect(GATE_RULE_SX.fontSize).toBe(GATE_LOCKUP_TEXT_SIZE);
  });
});

describe('GATE_ACTION_SX', () => {
  it('stands on the stairs, its top edge at 68% of the stage', () => {
    expect(GATE_ACTION_SX.position).toBe('absolute');
    expect(GATE_ACTION_SX.left).toBe('50%');
    expect(GATE_ACTION_SX.top).toBe('68%');
    // Centred across only, no vertical translate any more (issue #191): the
    // button's own top edge is the 68%, not a centre recentred onto it.
    expect(GATE_ACTION_SX.transform).toBe('translateX(-50%)');
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
