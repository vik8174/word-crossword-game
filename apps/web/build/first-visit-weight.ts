import {
  LATIN_RANGE,
  rangesShareACodePoint,
} from '../../../packages/shared/src/font-ranges/font-ranges.ts';

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
 * which is the typefaces, preloaded or merely declared, bar the ones named in
 * {@link NOT_ON_FIRST_VISIT} and the ones that only a letter beyond the latin
 * range fetches ({@link LATIN_EXT_CEILING_BYTES}). Chunks behind a lazy route
 * are not on it and neither is anything a click causes.
 *
 * There used to be a second ceiling beside this one, for the garden's pictures
 * (`docs/decisions/0033-a-second-ceiling-for-a-picture.md`). The pictures went
 * with the garden (issue #222, `docs/decisions/0038-across-the-street-replaces-the-garden.md`),
 * and so did that ceiling.
 */

/**
 * The most a first visit to the landing page may cost, in bytes over the wire.
 *
 * Two hundred and eighteen kibibytes. It arrived at 210 with the garden and has
 * been raised once, to 218, for the face the interface is read in; 178 is
 * sometimes quoted alongside those two but was never a ceiling — it is what a
 * first visit weighed before the garden, when nothing was holding it to
 * anything. The room to move is deliberate and it is not a budget to spend.
 * Raising this is a decision somebody makes on purpose, in a pull request, with
 * a reason, and now with a record beside it
 * (`docs/decisions/0032-what-the-first-visit-ceiling-measures.md`) — which is
 * the whole point of it being a number in a file rather than a habit.
 *
 * The reason this time, written down so that whoever raises it next has one to
 * be measured against. Everything read in this app was drawn in whatever font
 * the reader's operating system happened to hold, beside two faces that had
 * been chosen on purpose; issue #124 chose the third. Text wants two weights,
 * no face worth having offers two for the twelve kibibytes that were left, and
 * so the choice was never between typefaces — it was this number moving or the
 * interface keeping a face nobody picked. The two files weigh 19.0 KB and a
 * first visit now costs 215.1 on the build that checks it.
 *
 * Eight rather than seven, and the extra one is not for spending either. A
 * build that uploads its source maps carries the debug ids that go with them
 * and comes out heavier than the build this number is checked against, measured
 * on the same commit. That is the one a player actually fetches, since a
 * deployment uploads maps and CI does not — so a ceiling set a few tenths above
 * what CI weighs would be no ceiling at all for what ships.
 *
 * What this number may not do is drift. It is here to be argued with, and a
 * failure it causes has to mean something.
 *
 * Issue #147 dropped a face rather than adding one — the serif the crossword
 * and the four headings used to be set in, once the board itself moved off it
 * (its stroke contrast lost first at the sizes the board draws its letters at,
 * 11px to 24px). A first visit went from 215.8 to 201.4 on the build that
 * checks it, and from 217.1 to 202.6 on the one that ships — the ceiling did
 * not move, and does not have to: room freed by dropping a face is room for
 * the next one that earns its bytes, not a ceiling this file lowers on its
 * own.
 */
export const FIRST_VISIT_CEILING_BYTES = 218 * 1024;

/**
 * The most the faces that only a letter beyond the latin range fetches may cost
 * together, in bytes over the wire: sixty kibibytes, gzipped, summed over the
 * files, as {@link FIRST_VISIT_CEILING_BYTES} is.
 *
 * A face with a `unicode-range` is fetched when a page draws a letter in it, and
 * the landing page draws none from latin-ext. So those faces are not part of
 * what a first visit costs, and they are not free either: a game in Polish,
 * Turkish or Hungarian fetches up to all three. This is the number that says how
 * much of that the app may carry (`docs/decisions/0032-what-the-first-visit-ceiling-measures.md`,
 * the addendum of #232). Viktor chose it on 2026-10-14.
 *
 * Raising it is a decision made on purpose, in a pull request with a reason, as
 * raising the first-visit ceiling is.
 */
export const LATIN_EXT_CEILING_BYTES = 60 * 1024;

/** One file a first visit fetches, and what it weighs compressed. */
export interface FetchedFile {
  /** What it is called in `dist`. */
  readonly fileName: string;
  /** How many bytes of it go over the wire. */
  readonly gzipBytes: number;
}

/**
 * The faces a first visit declares but does not count: weighed and reported by
 * the build, counted against no ceiling.
 *
 * Each entry is the path of a font file as written in `index.html`. The list
 * holds the latin italic alone: `/` draws no italic, and a screen that does
 * (the explained squares, the lobby, the endings) fetches it on demand.
 * `docs/decisions/0032-what-the-first-visit-ceiling-measures.md` has the
 * reasoning and the guard below.
 *
 * Being on the list is not enough on its own. A face that is still preloaded is
 * fetched with the first visit whatever this list says, so it counts. Deleting
 * a preload without adding the face here changes nothing: it is still counted.
 */
export const NOT_ON_FIRST_VISIT: readonly string[] = [
  '/fonts/alegreya-sans-v28-latin-400italic.woff2',
];

/**
 * What the HTML preloads a typeface for: the font files it tells a browser to
 * fetch at once.
 *
 * Restricted to `as="font"` rather than every `rel="preload"` link, because
 * this ceiling is the one named in {@link FIRST_VISIT_CEILING_BYTES} — HTML,
 * chunks and typefaces — and a page may preload something else that is not one
 * of those, a picture for instance. Counting it here would charge the same
 * kilobytes against a ceiling that was never about pictures.
 *
 * @param html - The built `index.html`
 * @returns What it preloads a font for, as the paths written in it
 */
const preloadedHrefs = (html: string): readonly string[] =>
  [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel=["']?preload\b/.test(tag) && /\bas=["']?font\b/.test(tag))
    .map((tag) => /\bhref=["']([^"']+)["']/.exec(tag)?.[1])
    .filter((href): href is string => href !== undefined);

/** One font file the HTML declares, and the `unicode-range` it declares it for, if any. */
export interface DeclaredFace {
  /** The path of the file as written in the HTML. */
  readonly href: string;
  /** The face's `unicode-range`, or `null` when it declares none and so covers every letter. */
  readonly range: string | null;
}

/** A `url(...)` that names a font file, in a minified or a formatted stylesheet. */
const FONT_URL = /url\(['"]?([^'")]+\.woff2?)['"]?\)/g;

/**
 * What the HTML declares a face for, preloaded or not, with the range each is
 * declared for.
 *
 * Counted as well as the preloads, and that is the whole of why this is not
 * one function. A `@font-face` with nothing asking for it costs nothing — and
 * whether anything asks for it is a line of CSS in a component, which no build
 * step can see. A face declared here is a face the app may use, so it is a cost
 * the ceiling is measured against; the alternative is a font that becomes free
 * by having its `<link>` deleted. The exceptions are the faces on
 * {@link NOT_ON_FIRST_VISIT} and the ones counted under
 * {@link LATIN_EXT_CEILING_BYTES}, applied in {@link assetHrefs}.
 *
 * Read per `@font-face`, because the range belongs to the rule and not to the
 * file name. A font file named outside any `@font-face` is declared with no
 * range, which counts it with the first visit.
 *
 * @param html - The built `index.html`
 * @returns The files behind every face it declares, with their ranges
 */
export const declaredFaces = (html: string): readonly DeclaredFace[] => {
  const faces: DeclaredFace[] = [];
  const inBlocks = new Set<string>();

  for (const [block] of html.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const range = /unicode-range\s*:\s*([^;}]*)/i.exec(block)?.[1]?.trim() ?? null;

    for (const [, href] of block.matchAll(FONT_URL)) {
      if (href !== undefined) {
        faces.push({ href, range: range === '' ? null : range });
        inBlocks.add(href);
      }
    }
  }

  for (const [, href] of html.matchAll(FONT_URL)) {
    if (href !== undefined && !inBlocks.has(href)) {
      faces.push({ href, range: null });
      inBlocks.add(href);
    }
  }

  return faces;
};

/**
 * Whether a face is fetched with the first visit by the nature of its range: it
 * declares none, or its range shares a code point with {@link LATIN_RANGE}, the
 * letters every page draws. Only a face wholly beyond that range is fetched on
 * demand.
 */
const sharesTheLatinRange = (face: DeclaredFace): boolean =>
  face.range === null || rangesShareACodePoint(face.range, LATIN_RANGE);

/** Where a declared face is counted: the first visit, the latin-ext ceiling, or nowhere. */
type Counted = 'first-visit' | 'latin-ext' | 'nowhere';

/**
 * Which ceiling a declared font file counts against.
 *
 * The rule, in this order. A face the HTML preloads counts against the first
 * visit, whatever else is said of it. A face that is on
 * {@link NOT_ON_FIRST_VISIT} and is not preloaded counts against nothing. Every
 * other face counts against the first visit if it declares no range or its range
 * shares a code point with {@link LATIN_RANGE}, and against the latin-ext
 * ceiling if it does not. A file declared twice counts where it counts most
 * heavily.
 */
const countedAgainst = (
  html: string,
  notOnFirstVisit: readonly string[],
): ReadonlyMap<string, Counted> => {
  const preloaded = preloadedHrefs(html);
  const counted = new Map<string, Counted>(preloaded.map((href) => [href, 'first-visit']));

  for (const face of declaredFaces(html)) {
    if (counted.get(face.href) === 'first-visit') continue;

    let where: Counted;

    if (notOnFirstVisit.includes(face.href)) where = 'nowhere';
    else if (sharesTheLatinRange(face)) where = 'first-visit';
    else where = 'latin-ext';

    // A file declared twice is counted where it counts most heavily.
    if (where === 'first-visit' || !counted.has(face.href)) counted.set(face.href, where);
  }

  return counted;
};

/** The files that count where they count, as the paths written in the HTML. */
const hrefsCounted = (
  html: string,
  notOnFirstVisit: readonly string[],
  where: Counted,
): readonly string[] =>
  [...countedAgainst(html, notOnFirstVisit)].filter(([, at]) => at === where).map(([href]) => href);

/**
 * Everything the HTML itself asks for, before a byte of the app has run, that
 * counts against the first-visit ceiling.
 *
 * These are the files a bundler never sees: they are copied out of `public/` and
 * named by hand, so a measurement taken off the bundle alone would miss
 * twenty-five kilobytes of typeface that every first visit pays for.
 *
 * The rule, in this order. A face the HTML preloads counts, whatever
 * `notOnFirstVisit` says. A face that is declared, is not preloaded and is on
 * the list is left out here and returned by {@link notCountedHrefs}. Of the
 * rest, a face counts here if it declares no `unicode-range` or its range shares
 * a code point with {@link LATIN_RANGE}; the others are returned by
 * {@link latinExtHrefs}.
 *
 * @param html - The built `index.html`
 * @param notOnFirstVisit - The list of faces not counted; the exported one unless a test says otherwise
 * @returns Each of them once, as the paths written in it
 *
 * @example
 * assetHrefs(html); // ['/fonts/alegreya-sans-v28-latin-400.woff2', ...]
 */
export const assetHrefs = (
  html: string,
  notOnFirstVisit: readonly string[] = NOT_ON_FIRST_VISIT,
): readonly string[] => hrefsCounted(html, notOnFirstVisit, 'first-visit');

/**
 * The faces counted under {@link LATIN_EXT_CEILING_BYTES}: declared, not
 * preloaded, not on {@link NOT_ON_FIRST_VISIT}, and with a `unicode-range` that
 * shares nothing with {@link LATIN_RANGE}. A browser fetches one only when a
 * page draws a letter in its range.
 *
 * Named for the files that are in it today and decided by the range, never by
 * the name: a face with the range `U+1EA0-1EF9` lands here, and a latin-ext
 * face that were preloaded, or declared without a range, would not.
 *
 * @param html - The built `index.html`
 * @param notOnFirstVisit - The list of faces not counted; the exported one unless a test says otherwise
 * @returns Each of them once, as the paths written in it
 */
export const latinExtHrefs = (
  html: string,
  notOnFirstVisit: readonly string[] = NOT_ON_FIRST_VISIT,
): readonly string[] => hrefsCounted(html, notOnFirstVisit, 'latin-ext');

/**
 * The faces the HTML declares that no ceiling counts: declared, not preloaded,
 * and on {@link NOT_ON_FIRST_VISIT}. The build weighs them and says so, on a
 * line of their own.
 *
 * @param html - The built `index.html`
 * @param notOnFirstVisit - The list of faces not counted; the exported one unless a test says otherwise
 * @returns Each of them once, as the paths written in it
 */
export const notCountedHrefs = (
  html: string,
  notOnFirstVisit: readonly string[] = NOT_ON_FIRST_VISIT,
): readonly string[] => hrefsCounted(html, notOnFirstVisit, 'nowhere');

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

/** The files named, heaviest first, one to a line. */
const listedHeaviestFirst = (files: readonly FetchedFile[]): string =>
  [...files]
    .sort((one, other) => other.gzipBytes - one.gzipBytes)
    .map((file) => `  ${inKibibytes(file.gzipBytes).padStart(10)}  ${file.fileName}`)
    .join('\n');

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

  return [
    `A first visit to the landing page is ${inKibibytes(total)} gzipped, over the ceiling of ${inKibibytes(ceiling)}.`,
    '',
    'What a visitor fetches before they have done anything:',
    listedHeaviestFirst(files),
    '',
    'Either take something off the first screen — a route loaded on demand pays',
    'for itself the moment it is not the landing page — or raise the ceiling in',
    'apps/web/build/first-visit-weight.ts, on purpose and with a reason.',
  ].join('\n');
};

/**
 * The complaint a build makes when the faces fetched only for a letter beyond
 * the latin range have got too heavy, or nothing at all when they have not.
 *
 * @param files - The faces counted under {@link LATIN_EXT_CEILING_BYTES}
 * @param ceiling - The most they may weigh together, in bytes
 * @returns What to fail the build with, or `null` when they are under
 *
 * @example
 * const complaint = latinExtTooHeavyReport(files, LATIN_EXT_CEILING_BYTES);
 */
export const latinExtTooHeavyReport = (
  files: readonly FetchedFile[],
  ceiling: number,
): string | null => {
  const total = firstVisitWeight(files);

  if (total <= ceiling) {
    return null;
  }

  return [
    `The faces fetched only for a letter beyond the latin range are ${inKibibytes(total)} gzipped together, over the ceiling of ${inKibibytes(ceiling)}.`,
    '',
    'What a page that draws such a letter may fetch:',
    listedHeaviestFirst(files),
    '',
    'Either take a face out, or raise the ceiling in apps/web/build/first-visit-weight.ts,',
    'on purpose and with a reason (docs/decisions/0032-what-the-first-visit-ceiling-measures.md).',
  ].join('\n');
};
