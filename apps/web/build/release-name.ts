import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * The name a build files itself under in Sentry.
 *
 * A source map is only useful to Sentry once it can be tied to the bundle it
 * was made from. Sentry ties the two together by release name, so the name has
 * to be decided once at build time and then reach two different places: the
 * maps the build uploads, and the `init()` call inside the bundle the build
 * produces. `vite.config.ts` resolves it once and hands the same value to both,
 * rather than letting each side work out a name of its own.
 *
 * The name is two facts joined: the version the product calls itself, and the
 * commit this particular build came from. Neither answers on its own — the
 * version is the same across every build between two releases, and a bare
 * commit says nothing about which release an error belongs to.
 */

/** Where the product's version comes from; injected so the resolver can be tested. */
export type VersionReader = () => string;

/** Where a revision comes from; injected so the resolver can be tested. */
export type RevisionReader = () => string;

/**
 * How much of the commit goes into the name.
 *
 * Enough to be unambiguous in a repository of this size, short enough that the
 * release reads as a version with a build behind it rather than as a hash.
 */
const REVISION_LENGTH = 12;

/** The version lives at the root of the workspace, next to `CHANGELOG.md`. */
const PACKAGE_JSON = new URL('../../../package.json', import.meta.url);

/**
 * The version a `package.json` states, insisted upon.
 *
 * Separate from reading the file so that the one piece of judgement here — that
 * a workspace root with no version is broken rather than merely unnamed — can
 * be tested without a filesystem, the way {@link resolveReleaseName} is tested
 * without a repository.
 *
 * @param packageJson - Contents of a `package.json`
 * @returns The version it states
 * @throws When it parses to no version, or to a blank one
 *
 * @example
 * parsePackageVersion('{"version":"1.0.0"}'); // '1.0.0'
 */
export const parsePackageVersion = (packageJson: string): string => {
  const { version } = JSON.parse(packageJson) as { version?: string };

  if (version === undefined || version.trim() === '') {
    throw new Error(
      'The root package.json states no version; a release has nothing to be named after.',
    );
  }

  return version.trim();
};

/**
 * Reads the version the product calls itself.
 *
 * The root `package.json` is the single place that version lives. The workspace
 * packages carry a placeholder `0.0.0` and are never published; the tag, the
 * changelog and this field all describe the repository, so they belong
 * together.
 *
 * An adapter onto the filesystem, like {@link readGitRevision} is onto `git`:
 * the judgement lives in {@link parsePackageVersion}, which is what the tests
 * exercise.
 *
 * @returns The version as the workspace root states it
 * @throws When the file cannot be read, or states no version
 */
export const readPackageVersion: VersionReader = () =>
  parsePackageVersion(readFileSync(PACKAGE_JSON, 'utf8'));

/**
 * Reads the commit the working tree is on.
 *
 * @returns The full commit SHA, as `git` prints it
 * @throws When `git` is missing or this is not a repository
 */
export const readGitRevision: RevisionReader = () =>
  execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

/** The commit, shortened, or nothing when there is no repository to ask. */
const buildRevision = (readRevision: RevisionReader): string | undefined => {
  let revision: string;

  try {
    revision = readRevision();
  } catch {
    // A source archive rather than a checkout. Not an error worth stopping for:
    // the build still has a version to name itself after.
    return undefined;
  }

  const trimmed = revision.trim();

  return trimmed === '' ? undefined : trimmed.slice(0, REVISION_LENGTH);
};

/**
 * Names this build after the version it carries and the commit it came from.
 *
 * Always answers. Since the version comes from a file the build is already
 * reading, there is no case where the build cannot name itself — which is what
 * lets the maps be uploaded even from a source archive, where there is no
 * commit to read.
 *
 * @param readVersion - Reads the product version (production passes `readPackageVersion`)
 * @param readRevision - Reads the current revision (production passes `readGitRevision`)
 * @returns `1.0.0+700f8a8b3c9d` in a checkout, `1.0.0` outside one
 *
 * @example
 * const release = resolveReleaseName(readPackageVersion, readGitRevision);
 */
export const resolveReleaseName = (
  readVersion: VersionReader,
  readRevision: RevisionReader,
): string => {
  const version = readVersion();
  const revision = buildRevision(readRevision);

  return revision === undefined ? version : `${version}+${revision}`;
};
