import { describe, expect, it } from 'vitest';

import { shouldUploadSourceMaps } from './source-map-upload';

const TOKEN = 'sntrys_example';
const RELEASE = '9f1c0a2b3d4e5f60718293a4b5c6d7e8f9012345';

describe('shouldUploadSourceMaps', () => {
  it('uploads when the build has both a token and a name', () => {
    expect(shouldUploadSourceMaps(TOKEN, RELEASE)).toBe(true);
  });

  it('writes no maps at all without a token', () => {
    // A fresh clone and CI on a pull request: nothing would delete the maps
    // out of `dist` again, and `dist` is what gets deployed.
    expect(shouldUploadSourceMaps(undefined, RELEASE)).toBe(false);
  });

  it('treats an empty token as no token', () => {
    expect(shouldUploadSourceMaps('', RELEASE)).toBe(false);
  });

  it('writes no maps when the build could not name itself', () => {
    // Uploading here would file the maps under whatever name the plugin found
    // for itself — one the bundle does not report its errors under.
    expect(shouldUploadSourceMaps(TOKEN, undefined)).toBe(false);
  });
});
