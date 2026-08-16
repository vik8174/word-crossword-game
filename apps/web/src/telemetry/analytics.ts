import {
  type Analytics,
  initializeAnalytics,
  isSupported,
  logEvent,
  setDefaultEventParameters,
} from 'firebase/analytics';

import { firebaseApp } from '../firebase/config';
import type { PageView } from './page-view';

/**
 * Everything this app tells Firebase Analytics, and the only way to tell it
 * anything.
 *
 * Analytics is not allowed to fail loudly: a game must be playable with the
 * measurement id missing, with cookies switched off, in a browser Firebase does
 * not support and in tests, so every failure here ends in a console warning and
 * an event that was not sent.
 */

/** The three moments this game reports. Adding one is adding a line here. */
export type GameEvent = 'room_created' | 'player_joined' | 'game_completed';

/**
 * What an event may carry: numbers, and nothing else.
 *
 * This is the whole guarantee that a room id, a word or a nickname never
 * reaches Analytics — they are all strings, so an event carrying one does not
 * compile. It applies to the events written today and to every event written
 * after them, which a list of forbidden field names would not.
 *
 * Counts are welcome: how many words a room has and how many players are in it
 * say something about the product without saying anything about the room.
 */
export type GameEventParams = Readonly<Record<string, number>>;

/**
 * Analytics as it is initialized, or `null` where it cannot be.
 *
 * `undefined` means the question has not been asked yet — `isSupported()` is
 * asynchronous, so the answer is a promise that is asked for once and reused.
 */
let analytics: Promise<Analytics | null> | undefined;

/**
 * Analytics settings, of which one line matters.
 *
 * Firebase sends a `page_view` by itself when Analytics starts, and that event
 * carries `page_location` — the address bar as it stands, room id and all. It
 * is switched off here and replaced by {@link logPageView}, which reports the
 * same page with the id taken out. Turning it off has a second effect worth
 * having: page views then follow client-side navigation too, which the
 * automatic one never did (it fires once, at load).
 */
const ANALYTICS_SETTINGS = { config: { send_page_view: false } };

const analyticsWhenAvailable = (): Promise<Analytics | null> => {
  analytics ??= isSupported()
    .then((supported) => (supported ? initializeAnalytics(firebaseApp, ANALYTICS_SETTINGS) : null))
    .catch((error: unknown) => {
      // Warned about once — the failed answer is remembered like any other.
      console.warn('Analytics could not be started; no events will be sent', error);

      return null;
    });

  return analytics;
};

/**
 * Runs one piece of reporting against Analytics, if there is any to run it
 * against, and lets nothing out of it reach the game.
 *
 * @param name - Event being reported, for the warning if it goes wrong
 * @param report - What to do once Analytics is known to exist
 */
const quietly = async (name: string, report: (instance: Analytics) => void): Promise<void> => {
  try {
    const instance = await analyticsWhenAvailable();

    if (instance !== null) {
      report(instance);
    }
  } catch (error) {
    // An event that did not arrive is not worth a broken screen, and the player
    // has nothing to do about it either way.
    console.warn(`Sending the "${name}" analytics event failed`, error);
  }
};

/**
 * Reports that something happened in a game.
 *
 * @param event - Which of the game's moments this is
 * @param params - Counts describing it; strings do not compile, see {@link GameEventParams}
 *
 * @example
 * void logGameEvent('room_created', { word_count: layout.placedWords.length });
 */
export const logGameEvent = (event: GameEvent, params: GameEventParams = {}): Promise<void> =>
  quietly(event, (instance) => {
    logEvent(instance, event, params);
  });

/**
 * Reports that a page was opened.
 *
 * {@link PageView} can only be built by `pageViewFor`, so what arrives here is
 * already anonymous.
 *
 * @param pageView - The page, as redacted by `pageViewFor`
 *
 * @example
 * void logPageView(pageViewFor({ origin, pathname, referrer }));
 */
export const logPageView = ({ location, path, referrer }: PageView): Promise<void> => {
  const page = { page_location: location, page_path: path, page_referrer: referrer };

  return quietly('page_view', (instance) => {
    // Made the default for every later event as well, not only for this one:
    // `gtag` fills `page_location` in from the address bar by itself otherwise,
    // and the address bar is where the room id is.
    setDefaultEventParameters(page);
    logEvent(instance, 'page_view', page);
  });
};
