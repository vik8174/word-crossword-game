/** Where the mark lives: the tab's own storage, gone when the tab is. */
const MARK_PREFIX = 'chunk-reload:';

/** The name a build with no release gives itself (dev server, tests). */
const UNRELEASED = 'unreleased';

/**
 * Decides whether a page that could not be fetched reloads by itself, and if it
 * does, leaves the mark that stops the next failure from doing it again.
 *
 * Once per release per tab. The mark is never cleared on boot, so a page that
 * fails on every boot (`/room/<id>` loads its chunk while the app starts)
 * reloads once and then shows the screen, instead of looping; and the next
 * deploy is a new release, which gets its own one reload.
 *
 * Where storage cannot be used at all, the answer is no: a reload that cannot
 * leave its mark is a reload that could loop.
 *
 * @param release - The release the running bundle reports (`VITE_SENTRY_RELEASE`)
 * @param storage - The tab's storage; `sessionStorage` unless given
 * @returns `true` when the caller should reload now, `false` when it should show the screen
 */
export const claimAutomaticReload = (
  release: string | undefined,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage,
): boolean => {
  const key = `${MARK_PREFIX}${release || UNRELEASED}`;

  try {
    if (storage.getItem(key) !== null) {
      return false;
    }

    storage.setItem(key, '1');
    return true;
  } catch {
    // JUSTIFIED: storage is blocked (private window, site data off). The only safe answer is "do not reload": nothing could record that we did.
    return false;
  }
};
