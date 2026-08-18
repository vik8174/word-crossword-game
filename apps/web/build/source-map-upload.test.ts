import { describe, expect, it } from 'vitest';

import { shouldUploadSourceMaps } from './source-map-upload';

describe('shouldUploadSourceMaps', () => {
  it('uploads when the build was given a token', () => {
    expect(shouldUploadSourceMaps('sntrys_example')).toBe(true);
  });

  it('writes no maps at all without a token', () => {
    // A fresh clone and CI on a pull request: nothing would delete the maps
    // out of `dist` again, and `dist` is what gets deployed.
    expect(shouldUploadSourceMaps(undefined)).toBe(false);
  });

  it('treats an empty token as no token', () => {
    expect(shouldUploadSourceMaps('')).toBe(false);
  });
});
