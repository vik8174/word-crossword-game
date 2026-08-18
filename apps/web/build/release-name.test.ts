import { describe, expect, it } from 'vitest';

import { parsePackageVersion, resolveReleaseName } from './release-name';

const REVISION = '9f1c0a2b3d4e5f60718293a4b5c6d7e8f9012345';
const SHORT = '9f1c0a2b3d4e';
const VERSION = '1.2.3';

const versionIs = (version: string) => () => version;
const revisionIs = (revision: string) => () => revision;
const noRepository = () => {
  throw new Error('not a git repository');
};

describe('resolveReleaseName', () => {
  it('joins the version the product carries to the commit it was built from', () => {
    expect(resolveReleaseName(versionIs(VERSION), revisionIs(REVISION))).toBe(
      `${VERSION}+${SHORT}`,
    );
  });

  it('shortens the commit, so the name reads as a version rather than a hash', () => {
    expect(resolveReleaseName(versionIs(VERSION), revisionIs(REVISION))).not.toContain(REVISION);
  });

  it('drops the newline git prints after the revision', () => {
    expect(resolveReleaseName(versionIs(VERSION), revisionIs(`${REVISION}\n`))).toBe(
      `${VERSION}+${SHORT}`,
    );
  });

  it('names the build after the version alone outside a checkout', () => {
    // A source archive. There is still a release to file maps under, which is
    // what lets such a build upload them at all.
    expect(resolveReleaseName(versionIs(VERSION), noRepository)).toBe(VERSION);
  });

  it('treats a blank revision as no revision rather than as a trailing plus', () => {
    expect(resolveReleaseName(versionIs(VERSION), revisionIs('  \n'))).toBe(VERSION);
  });

  it('always answers, so nothing downstream has to handle an unnamed build', () => {
    expect(resolveReleaseName(versionIs(VERSION), noRepository)).not.toBe('');
  });
});

describe('parsePackageVersion', () => {
  it('takes the version the file states', () => {
    expect(parsePackageVersion('{"name":"word-crossword-game","version":"1.0.0"}')).toBe('1.0.0');
  });

  it('refuses a workspace root that states no version', () => {
    // Not the same case as a source archive with no commit: a checkout that
    // cannot say what version it is has nothing to fall back to.
    expect(() => parsePackageVersion('{"name":"word-crossword-game"}')).toThrow(/no version/i);
  });

  it('refuses a blank version rather than naming a release after nothing', () => {
    expect(() => parsePackageVersion('{"version":"  "}')).toThrow(/no version/i);
  });
});
