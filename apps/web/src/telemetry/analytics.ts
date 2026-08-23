import {
  type Analytics,
  type AnalyticsSettings,
  initializeAnalytics,
  isSupported,
  logEvent,
  setDefaultEventParameters,
} from 'firebase/analytics';

import { firebaseApp } from '../firebase/config';
import { internalTrafficParams } from './internal-traffic';
import type { PageView } from './page-view';
import type { Redacted } from './redaction';

/**
 * Everything this app tells Firebase Analytics, and the only way to tell it
 * anything.
 *
 * Analytics is not allowed to fail loudly: a game must be playable with the
 * measurement id missing, with cookies switched off, in a browser Firebase does
 * not support and in tests, so every failure here ends in a console warning and
 * an event that was not sent.
 */

/** The moments this game reports. Adding one is adding a line here. */
export type GameEvent = 'room_created' | 'player_joined' | 'game_completed' | 'screen_reached';

/**
 * What an event may carry: numbers, and text that has been through the
 * redaction.
 *
 * The guarantee is that what has not been redacted does not compile. Nothing
 * but `redactRoomId` produces a {@link Redacted}, so a `string` — which is what
 * a room id, a nickname, a word and `window.location.href` all are — cannot be
 * handed to an event as it stands, however the event is written and whoever
 * writes it. A list of forbidden field names would not do that, and neither
 * would remembering.
 *
 * The redaction takes room ids out and nothing else, so a caller who reaches
 * for it to launder a nickname would get past this type. That is why an event
 * carrying text does not take text: `logScreenReached` in `funnel.ts` asks for
 * a `FunnelScreen`, four literals fixed at compile time, so there is nothing a
 * player typed for it to be given. This type is the floor under every event;
 * the event's own parameter is the door.
 *
 * Counts are welcome: how many words a room has and how many players are in it
 * say something about the product without saying anything about the room.
 *
 * See `docs/decisions/0023-a-screen-name-is-text-that-has-been-redacted.md`.
 */
export type GameEventParams = Readonly<Record<string, number | Redacted>>;

/**
 * Analytics as it is initialized, or `null` where it cannot be.
 *
 * `undefined` means the question has not been asked yet — `isSupported()` is
 * asynchronous, so the answer is a promise that is asked for once and reused.
 */
let analytics: Promise<Analytics | null> | undefined;

/**
 * The settings Analytics is started with, of which two lines matter.
 *
 * Firebase sends a `page_view` by itself when Analytics starts, and that event
 * carries `page_location` — the address bar as it stands, room id and all. It
 * is switched off here and replaced by {@link logPageView}, which reports the
 * same page with the id taken out. Turning it off has a second effect worth
 * having: page views then follow client-side navigation too, which the
 * automatic one never did (it fires once, at load).
 *
 * `cookie_domain` is the host this page is served from, named rather than left
 * at gtag's default of `auto`. `auto` tries the broadest domain first and works
 * inwards, and both of this app's addresses end in `web.app`, which is in the
 * Public Suffix List: a cookie may not be set on it, so the browser refuses the
 * attempt and writes a line about it — eight lines on every single load. The
 * narrowest attempt is accepted, which is why the analytics was never actually
 * broken; the cost was a console permanently red, and the next real error in it
 * unnoticed. Naming the host makes the accepted attempt the only attempt, and
 * it is the very domain the probing was arriving at anyway, so the same two
 * cookies keep being written and the client id in them survives untouched.
 *
 * On `localhost` the host is `localhost`, and it wants no branch of its own:
 * `localhost` is not a public suffix, so the browser accepts the cookie and
 * there is nothing here to work around. A local `.env` without
 * `VITE_FIREBASE_MEASUREMENT_ID` in it does not start Analytics at all, and one
 * with it writes its cookies on `localhost` as any other host writes its own.
 *
 * A function rather than a constant, because the host has to be read when
 * Analytics starts and not when this file happens to be imported — the same
 * reason {@link internalTrafficParams} is a function and not a value.
 *
 * @returns What `initializeAnalytics` is handed
 */
const analyticsSettings = (): AnalyticsSettings => ({
  config: { send_page_view: false, cookie_domain: window.location.hostname },
});

const analyticsWhenAvailable = (): Promise<Analytics | null> => {
  analytics ??= isSupported()
    .then((supported) => (supported ? initializeAnalytics(firebaseApp, analyticsSettings()) : null))
    .catch((error: unknown) => {
      // Warned about once — the failed answer is remembered like any other.
      console.warn('Analytics could not be started; no events will be sent', error);

      return null;
    });

  return analytics;
};

/**
 * Runs one piece of reporting and lets nothing out of it reach the game.
 *
 * @param what - What was being done, for the warning if it goes wrong
 * @param report - The call to Analytics
 */
const quietly = (what: string, report: () => void): void => {
  try {
    report();
  } catch (error) {
    // An event that did not arrive is not worth a broken screen, and the player
    // has nothing to do about it either way.
    console.warn(`Analytics: ${what} failed`, error);
  }
};

/**
 * Reports that something happened in a game.
 *
 * @param event - Which of the game's moments this is
 * @param params - Counts and redacted text describing it; a raw string does not compile, see {@link GameEventParams}
 *
 * @example
 * void logGameEvent('room_created', { word_count: layout.placedWords.length });
 */
export const logGameEvent = async (
  event: GameEvent,
  params: GameEventParams = {},
): Promise<void> => {
  const instance = await analyticsWhenAvailable();

  if (instance !== null) {
    quietly(`sending "${event}"`, () => {
      logEvent(instance, event, params);
    });
  }
};

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
export const logPageView = async ({ location, path, referrer }: PageView): Promise<void> => {
  // `traffic_type` rides in this object rather than in a call of its own, and
  // it has to: `setDefaultEventParameters` below replaces the whole set of
  // defaults instead of adding to it, and it runs on every page view. A mark
  // set once at start-up would be gone after the first navigation, leaving code
  // that reads as if it worked and a GA4 filter that quietly counted nothing.
  // Why a browser carries that mark at all is in `internal-traffic.ts`.
  const page = {
    page_location: location,
    page_path: path,
    page_referrer: referrer,
    ...internalTrafficParams(),
  };

  // Before Analytics is asked for, not after it answers: Firebase holds these
  // until it starts and applies them to its very first `gtag` call, so not even
  // the events GA4 opens a session with can carry the address bar as `gtag`
  // read it. They are the default for every later event too, for the same
  // reason — `gtag` fills `page_location` in by itself otherwise.
  quietly('setting the page for later events', () => {
    setDefaultEventParameters(page);
  });

  const instance = await analyticsWhenAvailable();

  if (instance !== null) {
    quietly('sending "page_view"', () => {
      logEvent(instance, 'page_view', page);
    });
  }
};
