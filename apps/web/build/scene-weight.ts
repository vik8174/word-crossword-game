/**
 * What a single scene image may weigh, and the ceiling it may not go over.
 *
 * A raster scene is a different kind of cost than the one
 * `first-visit-weight.ts` was written for. That ceiling is HTML, chunks and
 * typefaces — the things every first visit pays for once, together. A scene
 * image is paid for once *per route*, since #151 puts exactly one behind `/`
 * and no other screen: `/create`, `/join` and every screen of a room still
 * stand on the painted forest `garden/` draws, and only pay for a picture on
 * the day they get one of their own. Summing it into the same total as the
 * fonts would tie two numbers together that move for entirely different
 * reasons, which is why this ceiling and its build step are their own —
 * `docs/decisions/0033-a-second-ceiling-for-a-picture.md`.
 *
 * It is also a plain byte count rather than a gzip figure. AVIF and JPEG are
 * already compressed formats; gzipping either on top saves nothing worth
 * having and Firebase Hosting does not attempt it for image content types, so
 * the file on disk is what a browser is actually sent.
 */

/**
 * The most a single scene image may weigh, in bytes.
 *
 * One hundred eighty kibibytes. It admits the heaviest of the pictures this
 * release measured at the widest breakpoint they are shipped at — the gate at
 * roughly 160 KiB AVIF, q50, 1440×810 — with enough room that a careless
 * re-export does not slip through unnoticed, and not so much that a picture
 * could be shipped uncompressed and still pass.
 */
export const SCENE_IMAGE_CEILING_BYTES = 180 * 1024;

/** One scene image the build found, and what it weighs on disk. */
export interface SceneImageFile {
  /** Its path relative to the built output, e.g. `scenes/gate.avif`. */
  readonly fileName: string;
  /** How many bytes it takes up on disk. */
  readonly bytes: number;
}

/** How a size reads to somebody looking at a failed build. */
const inKibibytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;

/**
 * The complaint a build makes when a scene image is too heavy, or nothing at
 * all when every one of them is under the ceiling.
 *
 * Checked file by file rather than summed, unlike
 * `first-visit-weight.ts#tooHeavyReport`: a scene is paid for on the one route
 * that draws it, not added to every other picture in the build, so the
 * question is whether any single file is too heavy rather than whether the
 * total is.
 *
 * @param files - Every scene image the build produced
 * @param ceiling - The most any one of them may weigh, in bytes
 * @returns What to fail the build with, or `null` when all of them are under
 *
 * @example
 * const complaint = tooHeavySceneReport(files, SCENE_IMAGE_CEILING_BYTES);
 */
export const tooHeavySceneReport = (
  files: readonly SceneImageFile[],
  ceiling: number,
): string | null => {
  const over = files.filter((file) => file.bytes > ceiling);

  if (over.length === 0) {
    return null;
  }

  const listed = [...over]
    .sort((one, other) => other.bytes - one.bytes)
    .map((file) => `  ${inKibibytes(file.bytes).padStart(10)}  ${file.fileName}`)
    .join('\n');

  return [
    `A scene image is over the ${inKibibytes(ceiling)} ceiling of apps/web/build/scene-weight.ts:`,
    '',
    listed,
    '',
    'Cut it again at a lower quality or a smaller size — a scene ships once per',
    'route, so there is no chunk to split it out of the way this ceiling would',
    'otherwise suggest.',
  ].join('\n');
};
