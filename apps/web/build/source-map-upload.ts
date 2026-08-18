/**
 * Whether this build has any business producing source maps.
 *
 * Generating maps and uploading them are one decision rather than two. The
 * upload is what deletes the maps out of `dist` again, and Firebase Hosting
 * publishes `dist` whole, so a build that generates maps it cannot upload
 * leaves the unminified source sitting next to the bundle for every player to
 * read.
 */

/**
 * Decides whether the build both writes source maps and sends them to Sentry.
 *
 * The token is the whole of the question. A build without one — a fresh clone,
 * a pull request in CI — has nowhere to upload to, so it writes no maps either
 * and still succeeds, in the same way the app runs without a DSN.
 *
 * A name is no longer part of it: `resolveReleaseName` always answers, because
 * the version comes from a file every build already reads (see
 * `docs/decisions/0019-a-release-is-a-version-and-a-commit.md`).
 *
 * @param authToken - The Sentry token the build was given, if it was given one
 * @returns Whether to generate source maps and upload them
 *
 * @example
 * shouldUploadSourceMaps('sntrys_...'); // true
 */
export const shouldUploadSourceMaps = (authToken: string | undefined): boolean =>
  Boolean(authToken);
