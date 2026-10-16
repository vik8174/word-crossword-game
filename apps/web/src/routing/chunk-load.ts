import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * A part of the app that could not be fetched: the import of a route's chunk
 * was rejected. Most often a new release went online while this tab held the
 * old one, and the old chunk's name is gone (issue #294).
 *
 * A class of our own so that the error boundary tells this state from a render
 * error by what the error is, never by the words in its message, which differ
 * between browsers.
 */
export class ChunkLoadError extends Error {
  /** The rejection of the import, kept for the report. */
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super('A part of the app could not be fetched');
    this.name = 'ChunkLoadError';
    this.cause = cause;
  }
}

/**
 * `React.lazy` for a route: the same, except that a rejected import is rethrown
 * as a `ChunkLoadError`.
 *
 * One wrapper for every lazy route, so a route added later is covered without
 * anybody remembering to. It does not call `preventDefault` on
 * `vite:preloadError`: the event still fires and Vite rethrows the original
 * rejection, which is what this catches.
 *
 * @param load - The dynamic import, resolving to a module with a `default` component (a route takes no props)
 * @returns A lazy component to put under a `Suspense` and an error boundary
 *
 * @example
 * const RoomPage = lazyRoute(() => import('./pages/RoomPage').then((m) => ({ default: m.RoomPage })));
 */
export const lazyRoute = (
  load: () => Promise<{ default: ComponentType }>,
): LazyExoticComponent<ComponentType> =>
  lazy(() =>
    load().catch((cause: unknown) => {
      throw new ChunkLoadError(cause);
    }),
  );
