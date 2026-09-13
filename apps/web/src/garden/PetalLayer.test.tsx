import { describe, expect, it } from 'vitest';

import { LONGEST_FRAME_SECONDS } from './PetalLayer';

describe('LONGEST_FRAME_SECONDS', () => {
  it('matches the template: a twentieth of a second, not the old fifteenth', () => {
    expect(LONGEST_FRAME_SECONDS).toBe(0.05);
  });
});
