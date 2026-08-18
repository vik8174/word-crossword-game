import { execFileSync } from 'node:child_process';

/**
 * The name a build files itself under in Sentry.
 *
 * A source map is only useful to Sentry once it can be tied to the bundle it
 * was made from. Sentry ties the two together by release name, so the name has
 * to be decided once at build time and then reach two different places: the
 * maps the build uploads, and the `init()` call inside the bundle the build
 * produces. `vite.config.ts` resolves it once and hands the same value to both,
 * rather than letting each side work out a name of its own.
 */

/** Where a revision comes from; injected so the resolver can be tested. */
export type RevisionReader = () => string;

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

/**
 * Names this build after the commit it was made from.
 *
 * A build that cannot name itself is not a failed build: a source archive
 * rather than a checkout still has to compile, it just has no release to file
 * its errors and its maps under. In that case both sides — the upload and the
 * bundle — end up with no name rather than with two different ones.
 *
 * @param readRevision - Reads the current revision (production passes `readGitRevision`)
 * @returns The release name, or `undefined` when there is no revision to name it after
 *
 * @example
 * const release = resolveReleaseName(readGitRevision);
 */
export const resolveReleaseName = (readRevision: RevisionReader): string | undefined => {
  let revision: string;

  try {
    revision = readRevision();
  } catch {
    // Not an error worth stopping for: see above. Reported by its absence —
    // the build logs that it is uploading no maps, and events carry no release.
    return undefined;
  }

  const trimmed = revision.trim();

  return trimmed === '' ? undefined : trimmed;
};
