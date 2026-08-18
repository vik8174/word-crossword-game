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
 * Two things have to be true, and each is false in a case that has to keep
 * building. Without a token — a fresh clone, a pull request in CI — there is
 * nowhere to upload to. Without a release name — a source archive rather than a
 * checkout — there is nothing to file the upload under, and the plugin left to
 * itself would go looking for a revision in CI variables this project never
 * read, filing the maps under a name the bundle has never heard of. Maps and
 * events would both arrive at Sentry and never meet.
 *
 * @param authToken - The Sentry token the build was given, if it was given one
 * @param release - What this build calls itself, if it could work that out
 * @returns Whether to generate source maps and upload them
 *
 * @example
 * shouldUploadSourceMaps('sntrys_...', 'fd05664...'); // true
 */
export const shouldUploadSourceMaps = (
  authToken: string | undefined,
  release: string | undefined,
): boolean => Boolean(authToken) && release !== undefined;
