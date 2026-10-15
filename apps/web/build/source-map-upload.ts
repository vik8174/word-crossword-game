/**
 * Whether this build has any business producing source maps.
 *
 * Generating maps and uploading them are one decision rather than two. The
 * upload is what deletes the maps out of `dist` again, and Firebase Hosting
 * publishes `dist` whole, so a build that generates maps it cannot upload
 * leaves the unminified source sitting next to the bundle for every player to
 * read.
 */

/** What the build was given to decide with. Both come from `loadEnv`, never from `process.env`. */
export interface SourceMapUploadInput {
  /** The Sentry token, if the build can read one (shell or `.env`). */
  authToken: string | undefined;
  /** The value of `SENTRY_UPLOAD`, if it is set. Only exactly `1` asks for an upload. */
  uploadSwitch: string | undefined;
}

/**
 * Decides whether the build both writes source maps and sends them to Sentry.
 *
 * A token alone is not a request. Two builds by accident uploaded source maps
 * under a release nobody had deployed (#224, #234), because a local checkout
 * had the token in `apps/web/.env`. The build now uploads only when it is told
 * to in so many words: `SENTRY_UPLOAD` is exactly `1` and a token is present.
 *
 * - The switch is not `1` (unset, empty, `true`, `0`...): a plain build with no
 *   maps and no plugin, whether or not a token is readable.
 * - The switch is `1` and there is a token: upload.
 * - The switch is `1` and there is no token, or an empty one: the build was
 *   asked for something it cannot do, so it stops rather than shipping without
 *   maps unnoticed.
 *
 * A name is no part of it: `resolveReleaseName` always answers, because the
 * version comes from a file every build already reads (see
 * `docs/decisions/0019-a-release-is-a-version-and-a-commit.md`).
 *
 * @param input.authToken - The Sentry token the build can read, if any
 * @param input.uploadSwitch - The value of `SENTRY_UPLOAD`, if set
 * @returns Whether to generate source maps and upload them
 * @throws When the upload was asked for and there is no token to do it with
 *
 * @example
 * shouldUploadSourceMaps({ authToken: 'sntrys_...', uploadSwitch: '1' }); // true
 * shouldUploadSourceMaps({ authToken: 'sntrys_...', uploadSwitch: undefined }); // false
 */
export const shouldUploadSourceMaps = ({
  authToken,
  uploadSwitch,
}: SourceMapUploadInput): boolean => {
  if (uploadSwitch !== '1') {
    return false;
  }
  if (!authToken) {
    throw new Error(
      'SENTRY_UPLOAD=1 asks this build to upload source maps, but SENTRY_AUTH_TOKEN is missing or empty. ' +
        'Set SENTRY_AUTH_TOKEN, or leave SENTRY_UPLOAD unset for a build that uploads nothing.',
    );
  }
  return true;
};
