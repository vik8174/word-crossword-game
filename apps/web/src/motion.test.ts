import { describe, expect, it } from 'vitest';

import { MOTION_DURATIONS_MS, MOTION_EASING } from './motion';

describe('motion', () => {
  it('is a row of two durations, quicker than slower, and no others', () => {
    expect(Object.keys(MOTION_DURATIONS_MS)).toEqual(['quick', 'settle']);
    expect(MOTION_DURATIONS_MS.quick).toBeLessThan(MOTION_DURATIONS_MS.settle);
  });

  it('is a real curve, not a keyword MUI would otherwise fall back on', () => {
    expect(MOTION_EASING).toMatch(/^cubic-bezier\(/);
  });
});
