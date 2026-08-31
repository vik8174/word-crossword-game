/**
 * What a first visit to the landing page costs, and the ceiling it may not go
 * over.
 *
 * This app has been here before. It shipped at 356 KB, halved that by loading
 * the routes that open a room on demand (issue #92), and would have drifted
 * straight back up over the next few releases — because nothing measured it.
 * The garden is exactly the kind of release that does it: a few thousand brush
 * strokes are cheap, and so is every single thing that has ever made a bundle
 * three times the size it should be.
 *
 * So the number is checked by the build rather than written in a README. A
 * pull request that puts the landing page over the ceiling fails, and the
 * failure names what is on the page and how big each piece of it is — which is
 * the difference between a limit and a limit somebody can act on.
 *
 * What counts as a first visit is everything a browser fetches to draw `/`
 * before anybody has done anything: the HTML, every chunk reachable from the
 * entry by static import, and every file the HTML asks for on its own account —
 * which is the typefaces, preloaded or merely declared. Chunks behind a lazy
 * route are not on it and neither is anything a click causes.
 */

/**
 * The most a first visit to the landing page may cost, in bytes over the wire.
 *
 * Two hundred and ten kibibytes. It was 178 before the garden and the garden is
 * what the difference is for; the room to move is deliberate and it is not a
 * budget to spend. Raising this is a decision somebody makes on purpose, in a
 * pull request, with a reason — which is the whole point of it being a number
 * in a file rather than a habit.
 */
export const FIRST_VISIT_CEILING_BYTES = 210 * 1024;

/** One file a first visit fetches, and what it weighs compressed. */
export interface FetchedFile {
  /** What it is called in `dist`. */
  readonly fileName: string;
  /** How many bytes of it go over the wire. */
  readonly gzipBytes: number;
}

/**
 * What the HTML preloads: the files it tells a browser to fetch at once.
 *
 * @param html - The built `index.html`
 * @returns What it preloads, as the paths written in it
 */
const preloadedHrefs = (html: string): readonly string[] =>
  [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel=["']?preload\b/.test(tag))
    .map((tag) => /\bhref=["']([^"']+)["']/.exec(tag)?.[1])
    .filter((href): href is string => href !== undefined);

/**
 * What the HTML declares a face for, preloaded or not.
 *
 * Counted as well as the preloads, and that is the whole of why this is not
 * one function. A `@font-face` with nothing asking for it costs nothing — and
 * whether anything asks for it is a line of CSS in a component, which no build
 * step can see. A face declared here is a face the app may use, so it is a cost
 * the ceiling is measured against; the alternative is a font that becomes free
 * by having its `<link>` deleted.
 *
 * @param html - The built `index.html`
 * @returns The files behind every face it declares
 */
const declaredFontHrefs = (html: string): readonly string[] =>
  [...html.matchAll(/url\(['"]?([^'")]+\.woff2?)['"]?\)/g)]
    .map(([, href]) => href)
    .filter((href): href is string => href !== undefined);

/**
 * Everything the HTML itself asks for, before a byte of the app has run.
 *
 * These are the files a bundler never sees: they are copied out of `public/`
 * and named by hand, so a measurement taken off the bundle alone would miss
 * twenty-five kilobytes of typeface that every first visit pays for.
 *
 * @param html - The built `index.html`
 * @returns Each of them once, as the paths written in it
 *
 * @example
 * assetHrefs(html); // ['/fonts/zen-old-mincho-v13-latin-400.woff2', ...]
 */
export const assetHrefs = (html: string): readonly string[] => [
  ...new Set([...preloadedHrefs(html), ...declaredFontHrefs(html)]),
];

/**
 * What the whole of a first visit weighs.
 *
 * @param files - Everything it fetches
 * @returns The total in bytes over the wire
 */
export const firstVisitWeight = (files: readonly FetchedFile[]): number =>
  files.reduce((total, file) => total + file.gzipBytes, 0);

/** How a size reads to somebody looking at a failed build. */
const inKibibytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;

/**
 * The complaint a build makes when the landing page has got too heavy, or
 * nothing at all when it has not.
 *
 * Every file is named and the heaviest come first, because the answer to being
 * over is nearly always one line of one import, and the list is what points at
 * it.
 *
 * @param files - Everything a first visit fetches
 * @param ceiling - The most it may weigh, in bytes
 * @returns What to fail the build with, or `null` when it is under
 *
 * @example
 * const complaint = tooHeavyReport(files, FIRST_VISIT_CEILING_BYTES);
 */
export const tooHeavyReport = (files: readonly FetchedFile[], ceiling: number): string | null => {
  const total = firstVisitWeight(files);

  if (total <= ceiling) {
    return null;
  }

  const listed = [...files]
    .sort((one, other) => other.gzipBytes - one.gzipBytes)
    .map((file) => `  ${inKibibytes(file.gzipBytes).padStart(10)}  ${file.fileName}`)
    .join('\n');

  return [
    `A first visit to the landing page is ${inKibibytes(total)} gzipped, over the ceiling of ${inKibibytes(ceiling)}.`,
    '',
    'What a visitor fetches before they have done anything:',
    listed,
    '',
    'Either take something off the first screen — a route loaded on demand pays',
    'for itself the moment it is not the landing page — or raise the ceiling in',
    'apps/web/build/first-visit-weight.ts, on purpose and with a reason.',
  ].join('\n');
};
