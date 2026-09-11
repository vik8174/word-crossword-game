/**
 * Preloading a scene's picture, only on the address that draws it.
 *
 * `apps/web/index.html` is the one document Firebase Hosting rewrites every
 * address in the app to (`build/route-preload.ts`), so a plain `<link
 * rel="preload">` written into it by hand is not a preload for `/` alone — it
 * is a preload for `/create`, `/join` and `/room/<id>` as well, none of which
 * `GateScene` ever draws (issue #151). That would ask every one of those
 * visitors to fetch a scene image nobody there shows them, which is exactly
 * what `docs/decisions/0033-a-second-ceiling-for-a-picture.md` says a scene
 * image must never cost: it is paid for once, by the one route that draws it.
 *
 * The fix is the one `route-preload.ts` already uses for a chunk: a script
 * rather than a tag, so which address is open is a question the browser
 * answers once it already knows, rather than one the single shared document
 * is asked to answer for every address at once.
 */

/** The one address a scene's picture may be preloaded for. */
export interface ScenePreload {
  /** The address this picture is drawn on, e.g. `/`. */
  readonly path: string;
  /** Where the picture is served from, e.g. `/scenes/gate.avif`. */
  readonly href: string;
  /** Its MIME type, so a browser that cannot decode it does not fetch it. */
  readonly type: string;
}

/**
 * The script that preloads a scene's picture, gated to the address it belongs
 * to.
 *
 * Compared by exact match rather than by prefix (`route-preload.ts`'s
 * `startsWith`): every address starts with `/`, so a prefix match would preload
 * the gate everywhere rather than nowhere else.
 *
 * @param scenes - Which pictures belong to which addresses
 * @returns Script body, or an empty string when there is nothing to preload
 *
 * @example
 * scenePreloadScript([{ path: '/', href: '/scenes/gate.avif', type: 'image/avif' }]);
 */
export const scenePreloadScript = (scenes: readonly ScenePreload[]): string => {
  if (scenes.length === 0) {
    return '';
  }

  const table = JSON.stringify(scenes.map(({ path, href, type }) => [path, href, type]));

  return (
    `for(const [p,h,t] of ${table})` +
    'if(location.pathname===p){' +
    "const l=document.createElement('link');" +
    "l.rel='preload';l.as='image';l.type=t;l.href=h;" +
    'document.head.appendChild(l)}'
  );
};
