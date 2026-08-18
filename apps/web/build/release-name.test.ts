import { describe, expect, it } from 'vitest';

import { resolveReleaseName } from './release-name';

const REVISION = '9f1c0a2b3d4e5f60718293a4b5c6d7e8f9012345';

describe('resolveReleaseName', () => {
  it('names the build after the commit it was made from', () => {
    expect(resolveReleaseName(() => REVISION)).toBe(REVISION);
  });

  it('drops the newline git prints after the revision', () => {
    expect(resolveReleaseName(() => `${REVISION}\n`)).toBe(REVISION);
  });

  it('leaves the build unnamed when there is no revision to read', () => {
    // A source archive rather than a checkout: the build still has to work.
    expect(
      resolveReleaseName(() => {
        throw new Error('not a git repository');
      }),
    ).toBeUndefined();
  });

  it('leaves the build unnamed rather than naming it an empty string', () => {
    expect(resolveReleaseName(() => '  \n')).toBeUndefined();
  });
});
