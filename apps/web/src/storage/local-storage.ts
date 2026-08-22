/**
 * The profile's own storage, reached in the one way that cannot break a screen.
 *
 * Reaching for `localStorage` is not always answered with an empty store: in a
 * private window and with cookies switched off the property access itself
 * throws, which is why the access below is inside the `try` rather than above
 * it. Every user of the storage in this app would otherwise have written that
 * same `try` around that same access, and one of them would eventually have
 * written it around the wrong line.
 *
 * Nothing kept here is anything the app cannot be played without — the
 * internal-traffic mark (`telemetry/internal-traffic.ts`) and the remembered
 * nickname (`rooms/nickname-store.ts`) — so a browser with nowhere to keep
 * things is served exactly as before, minus what it could not keep. That is not
 * a silent failure: what went wrong is warned about, in the words of whoever
 * was using the storage.
 */

/**
 * Makes a way into this profile's storage that answers instead of throwing.
 *
 * The user of the storage names itself once, and every warning about a failure
 * carries that name — so a browser that keeps nothing still says who wanted to
 * keep something, in the vocabulary of that part of the app.
 *
 * @param owner - What the warnings call whoever is using the storage
 * @returns A function running `access` on the storage, answering `fallback` if it threw
 *
 * @example
 * const inStorage = storageFor('Analytics');
 * const mark = inStorage('reading the mark', (store) => store.getItem(KEY), null);
 */
export const storageFor =
  (owner: string) =>
  <T>(what: string, access: (store: Storage) => T, fallback: T): T => {
    try {
      return access(window.localStorage);
    } catch (error) {
      console.warn(`${owner}: ${what} failed`, error);

      return fallback;
    }
  };
