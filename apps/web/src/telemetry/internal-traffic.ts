/**
 * The mark that tells this browser apart from a player's, so my own checks are
 * not counted as people who came to play.
 *
 * Every look at the live app is taken from a fresh isolated browser profile,
 * and each of those is a new anonymous sign-in and, to GA4, a new person: the
 * first thirty days of production counted nine "users" of whom almost all were
 * the same one. GA4 answers this with its Internal Traffic filter, and what
 * that filter matches on is a `traffic_type` parameter carried by the events
 * themselves.
 *
 * **Why the mark sits on the browser and not on the network.** The obvious
 * route is the same filter's IP rule, and it is rejected on purpose. A home
 * address is almost certainly dynamic, and the day it changes the rule does not
 * break loudly — it quietly stops matching, and nothing says so. Behind CGNAT
 * the external address is shared with the neighbours, so such a rule would
 * throw away their visits too. And "this address is mine" is a claim nothing
 * can confirm: the same number today and tomorrow guarantees nothing about the
 * day after. A mark the browser carries survives a changed address, CGNAT and a
 * VPN alike, and its price is one page opened per fresh profile. None of that
 * is recoverable from the code, which is why it is written down here. An IP
 * rule can still be added in the console at any time as a second layer, without
 * a line of this changing.
 *
 * Nothing here is a secret and nothing here is enforced: a visitor who works
 * out the parameter can mark themselves out of the statistics. The mark is
 * bookkeeping, not access control.
 */

/**
 * Where the mark lives — one key in the profile's own storage, which is the
 * only thing that both survives a reload and does not travel in a link.
 */
const STORAGE_KEY = 'word-crossword-game:traffic-type';

/** The query parameter that sets and unsets the mark: `?internal=1` / `?internal=0`. */
const QUERY_PARAM = 'internal';

/** The value GA4's Internal Traffic filter matches on by default. */
const INTERNAL = 'internal';

/** The two things the query parameter is allowed to say. */
const MARK = { on: '1', off: '0' } as const;

/**
 * Uses the profile's storage and lets nothing out of it reach the game.
 *
 * Reaching for `localStorage` is not always answered with an empty store: in a
 * private window and with cookies switched off the property access itself
 * throws, which is why the access is inside the `try` rather than above it.
 * Telemetry in this app is never allowed to fail loudly — see `quietly` in
 * `analytics.ts` — and that holds here too. A game whose browser has nowhere to
 * keep the mark is played exactly as before; its analytics is simply not
 * marked.
 *
 * @param what - What was being done, for the warning if it goes wrong
 * @param access - The work to do with the storage
 * @param fallback - What to answer when the storage cannot be used
 * @returns The result of `access`, or `fallback` if it threw
 */
const inStorage = <T>(what: string, access: (store: Storage) => T, fallback: T): T => {
  try {
    return access(window.localStorage);
  } catch (error) {
    console.warn(`Analytics: ${what} failed`, error);

    return fallback;
  }
};

/**
 * Whether this browser profile has been marked as internal.
 *
 * Asked afresh every time rather than read once and remembered, so unmarking a
 * profile takes effect without a reload.
 *
 * @returns `true` when the mark is in this profile's storage
 */
export const isInternalTraffic = (): boolean =>
  inStorage(
    'reading the internal-traffic mark',
    (store) => store.getItem(STORAGE_KEY) === INTERNAL,
    false,
  );

/**
 * Puts the mark into this profile's storage, or takes it out again.
 *
 * @param marked - `true` to mark the profile as internal, `false` to unmark it
 */
const rememberInternalTraffic = (marked: boolean): void =>
  inStorage(
    'writing the internal-traffic mark',
    (store) => {
      if (marked) {
        store.setItem(STORAGE_KEY, INTERNAL);
      } else {
        store.removeItem(STORAGE_KEY);
      }
    },
    undefined,
  );

/**
 * The parameters every event of a marked browser carries, and nothing at all in
 * an unmarked one.
 *
 * Spread into the object `logPageView` hands to `setDefaultEventParameters`,
 * which is the only place it may go: that call replaces the whole set of
 * defaults rather than adding to it, so a `traffic_type` set by a call of its
 * own would be wiped by the first navigation.
 *
 * @returns `{ traffic_type: 'internal' }` for a marked profile, `{}` otherwise
 *
 * @example
 * const page = { page_location: location, ...internalTrafficParams() };
 */
export const internalTrafficParams = (): Readonly<{ traffic_type?: typeof INTERNAL }> =>
  isInternalTraffic() ? { traffic_type: INTERNAL } : {};

/**
 * Reads `?internal=1` or `?internal=0` out of the address, remembers what it
 * said for this profile, and takes the parameter back out of the address.
 *
 * Called once as the app starts, before anything is rendered and therefore
 * before the first page view is reported, so a load that carries the parameter
 * is itself already marked. Afterwards the mark is the storage's, and the
 * address is not needed again.
 *
 * The parameter is removed from the address for the same reason the mark is not
 * in the invite link: an address bar is copied by hand as well as by code, and
 * a link carrying `?internal=1` would mark a real player's browser as mine. An
 * address with no such parameter in it is left exactly as it is.
 *
 * @example
 * // https://example.com/?internal=1 marks this browser, and becomes https://example.com/
 * applyInternalTrafficMark();
 */
export const applyInternalTrafficMark = (): void => {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(QUERY_PARAM);

  if (value === null) {
    return;
  }

  if (value !== MARK.on && value !== MARK.off) {
    // Neither marking nor unmarking: say so rather than pick one, since both
    // guesses are wrong for somebody and neither shows up in GA4 for a week.
    console.warn(
      `Analytics: "?${QUERY_PARAM}=${value}" says nothing; ` +
        `use "?${QUERY_PARAM}=${MARK.on}" to mark this browser as internal ` +
        `or "?${QUERY_PARAM}=${MARK.off}" to unmark it`,
    );

    return;
  }

  rememberInternalTraffic(value === MARK.on);

  url.searchParams.delete(QUERY_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};
