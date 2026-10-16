import { useLocation } from 'react-router-dom';

/**
 * A switch for the dev server only: `?__crash_probe__` on any route throws while
 * the screen draws, so the crash screen can be looked at without breaking
 * anything (issue #294).
 *
 * The parameter is read only inside `import.meta.env.DEV`, which Vite replaces
 * with `false` in a build, so the whole branch, literal included, is gone from
 * `dist`. Renders nothing otherwise.
 */
export const CrashProbe = (): null => {
  const { search } = useLocation();

  if (import.meta.env.DEV && new URLSearchParams(search).has('__crash_probe__')) {
    throw new Error('Crash probe: thrown on purpose by ?__crash_probe__');
  }

  return null;
};
