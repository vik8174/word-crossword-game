import { describe, expect, it } from 'vitest';

import { shouldUploadSourceMaps } from './source-map-upload';

describe('shouldUploadSourceMaps', () => {
  it('uploads when the build was asked to and has a token', () => {
    expect(shouldUploadSourceMaps({ authToken: 'sntrys_example', uploadSwitch: '1' })).toBe(true);
  });

  it('does not upload when a token is readable but nobody asked for an upload', () => {
    // The accident this switch exists for (#224, #234): a local build in a
    // checkout whose `.env` holds the token. A token alone is no request.
    expect(shouldUploadSourceMaps({ authToken: 'sntrys_example', uploadSwitch: undefined })).toBe(
      false,
    );
  });

  it('does not upload without a token and without the switch', () => {
    // A fresh clone and CI on a pull request: a plain build, no error.
    expect(shouldUploadSourceMaps({ authToken: undefined, uploadSwitch: undefined })).toBe(false);
  });

  it('does not upload with an empty token and without the switch', () => {
    expect(shouldUploadSourceMaps({ authToken: '', uploadSwitch: undefined })).toBe(false);
  });

  it.each(['true', 'yes', 'on', '0', '', ' 1', '1 ', '11'])(
    'takes %j as no switch: only exactly 1 asks for an upload',
    (uploadSwitch) => {
      expect(shouldUploadSourceMaps({ authToken: 'sntrys_example', uploadSwitch })).toBe(false);
    },
  );

  it('does not fail on a value that is no switch, even without a token', () => {
    expect(shouldUploadSourceMaps({ authToken: undefined, uploadSwitch: 'true' })).toBe(false);
  });

  it('fails the build when asked to upload and given no token', () => {
    expect(() => shouldUploadSourceMaps({ authToken: undefined, uploadSwitch: '1' })).toThrow(
      /SENTRY_UPLOAD.*SENTRY_AUTH_TOKEN|SENTRY_AUTH_TOKEN.*SENTRY_UPLOAD/,
    );
  });

  it('fails the build when asked to upload and given an empty token', () => {
    expect(() => shouldUploadSourceMaps({ authToken: '', uploadSwitch: '1' })).toThrow(
      /SENTRY_UPLOAD.*SENTRY_AUTH_TOKEN|SENTRY_AUTH_TOKEN.*SENTRY_UPLOAD/,
    );
  });
});
