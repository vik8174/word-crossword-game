/**
 * Preloading the chunks an address needs before the app has worked out that it
 * needs them.
 *
 * Loading a route on demand costs a round trip: the browser has to fetch and
 * run the first chunk before it learns that this address needs another one. On
 * the landing page that is a fair price, paid on a click. On `/room/<id>` it is
 * not: that address is what an invite link points at, opened cold in a fresh
 * tab, and it is the most important arrival this app has (issue #92).
 *
 * So the chunks that address needs are named in the HTML, which is the one
 * thing the browser already has. It fetches them alongside the first chunk
 * instead of after it, and a guest waits exactly as long as they did when the
 * whole app came in one file — while a visitor to any other address still never
 * downloads them.
 */

/** The part of a build's output this module reads: chunks and what they import. */
export interface BundleChunk {
  readonly fileName: string;
  readonly imports: readonly string[];
}

/** A route worth preloading: the addresses it covers, and what it needs. */
export interface PreloadedRoute {
  /** Path prefix an address starts with, e.g. `/room/`. */
  readonly prefix: string;
  /** URLs of the chunks to fetch for it. */
  readonly hrefs: readonly string[];
}

/**
 * Every chunk reachable from one chunk by following static imports, itself
 * included.
 *
 * Static imports and not dynamic ones: a chunk's dynamic imports are the routes
 * *behind* this one, which the browser is right not to fetch yet.
 *
 * @param chunks - All chunks the build produced
 * @param from - File name of the chunk to start from
 * @returns File names of everything that has to be there for `from` to run
 *
 * @example
 * reachableChunks(chunks, 'assets/RoomPage-a1b2.js');
 */
export const reachableChunks = (chunks: readonly BundleChunk[], from: string): string[] => {
  const importsOf = new Map(chunks.map((chunk) => [chunk.fileName, chunk.imports]));
  const reached = new Set<string>();
  const pending = [from];

  for (let fileName = pending.pop(); fileName !== undefined; fileName = pending.pop()) {
    if (reached.has(fileName)) {
      continue;
    }

    reached.add(fileName);
    pending.push(...(importsOf.get(fileName) ?? []));
  }

  return [...reached];
};

/**
 * What a route needs that the first load does not already bring.
 *
 * Whatever the entry chunk pulls in is in the HTML as a `modulepreload` already
 * — Vite writes those itself — so naming it again would only make the document
 * bigger.
 *
 * @param chunks - All chunks the build produced
 * @param routeChunk - File name of the chunk the route is loaded from
 * @param entryChunk - File name of the chunk every address starts with
 * @returns File names to preload, in no particular order
 */
export const routeChunks = (
  chunks: readonly BundleChunk[],
  routeChunk: string,
  entryChunk: string,
): string[] => {
  const alreadyFetched = new Set(reachableChunks(chunks, entryChunk));

  return reachableChunks(chunks, routeChunk).filter((fileName) => !alreadyFetched.has(fileName));
};

/**
 * The script that adds the preload links, for the addresses they belong to.
 *
 * A script rather than plain `<link>` tags because one document serves every
 * address in the app (Firebase Hosting rewrites everything to it), so which
 * chunks are worth fetching is a question only the browser can answer, and only
 * once it is open.
 *
 * @param routes - Which prefixes need which chunks
 * @returns Script body, or an empty string when there is nothing to preload
 *
 * @example
 * routePreloadScript([{ prefix: '/room/', hrefs: ['/assets/RoomPage-a1b2.js'] }]);
 */
export const routePreloadScript = (routes: readonly PreloadedRoute[]): string => {
  const worthwhile = routes.filter((route) => route.hrefs.length > 0);

  if (worthwhile.length === 0) {
    return '';
  }

  const table = JSON.stringify(worthwhile.map(({ prefix, hrefs }) => [prefix, hrefs]));

  return (
    `for(const [p,f] of ${table})` +
    'if(location.pathname.startsWith(p))for(const h of f){' +
    "const l=document.createElement('link');" +
    "l.rel='modulepreload';l.crossOrigin='';l.href=h;" +
    'document.head.appendChild(l)}'
  );
};
