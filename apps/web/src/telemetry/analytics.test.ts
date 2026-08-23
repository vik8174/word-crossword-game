import type { Analytics } from 'firebase/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyInternalTrafficMark } from './internal-traffic';
import { pageViewFor } from './page-view';
import { redactRoomId } from './redaction';

vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(),
  isSupported: vi.fn(),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

/** Stands in for the SDK's `Analytics` handle, which is opaque to this module. */
const FAKE_ANALYTICS = { app: 'fake-analytics' } as unknown as Analytics;

/**
 * A fresh copy of the module under test, on top of freshly answering SDK mocks.
 * Analytics is started once per page load and the answer remembered, so each
 * test needs its own module registry to have anything to observe.
 */
const loadAnalytics = async () => {
  vi.resetModules();
  vi.resetAllMocks();

  const sdk = vi.mocked(await import('firebase/analytics'));
  sdk.isSupported.mockResolvedValue(true);
  sdk.initializeAnalytics.mockReturnValue(FAKE_ANALYTICS);

  const analytics = await import('./analytics');

  return { ...analytics, ...sdk };
};

/**
 * Marks this browser as internal the way a person does — by opening an address
 * that says so — rather than by writing the storage key the module owns.
 */
const markThisBrowserInternal = () => {
  window.history.replaceState({}, '', '/?internal=1');
  applyInternalTrafficMark();
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('logGameEvent', () => {
  it('sends the event under the name it was given', async () => {
    const { logGameEvent, logEvent } = await loadAnalytics();

    await logGameEvent('room_created', { word_count: 7 });

    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'room_created', { word_count: 7 });
  });

  it('refuses text that has not been through the redaction, at compile time', async () => {
    const { logGameEvent } = await loadAnalytics();

    // @ts-expect-error A room id, a word and a nickname are all strings, and
    // nothing but `redactRoomId` produces the type a parameter takes. This line
    // ceasing to be an error is the regression: it would mean text can reach
    // Analytics without passing the one place room ids are taken out of it.
    await logGameEvent('room_created', { room_id: ROOM_ID });
  });

  it('sends text that has been redacted, with the room taken out of it', async () => {
    const { logGameEvent, logEvent } = await loadAnalytics();

    await logGameEvent('screen_reached', { screen: redactRoomId(`/room/${ROOM_ID}`) });

    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'screen_reached', {
      screen: '/room/:roomId',
    });
  });

  it('turns the automatic page view off, because it carries the full address', async () => {
    const { logGameEvent, initializeAnalytics } = await loadAnalytics();

    await logGameEvent('player_joined');

    expect(initializeAnalytics).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ config: expect.objectContaining({ send_page_view: false }) }),
    );
  });

  it('names the host it is running on as the cookie domain', async () => {
    const { logGameEvent, initializeAnalytics } = await loadAnalytics();
    // Set after the module is loaded: the host has to be read when Analytics
    // starts, not when the file is imported, or the address a value was taken
    // from would depend on import order.
    vi.stubGlobal('location', new URL('https://word-crossword-game-stage.web.app/create'));

    await logGameEvent('player_joined');

    expect(initializeAnalytics).toHaveBeenCalledWith(expect.anything(), {
      config: { send_page_view: false, cookie_domain: 'word-crossword-game-stage.web.app' },
    });
  });

  it('initializes Analytics once, however many events are sent', async () => {
    const { logGameEvent, initializeAnalytics } = await loadAnalytics();

    await logGameEvent('room_created', { word_count: 7 });
    await logGameEvent('player_joined');
    await logGameEvent('game_completed', { word_count: 7 });

    expect(initializeAnalytics).toHaveBeenCalledTimes(1);
  });

  it('sends nothing where Analytics is not supported', async () => {
    const { logGameEvent, isSupported, initializeAnalytics, logEvent } = await loadAnalytics();
    isSupported.mockResolvedValue(false);

    await expect(logGameEvent('room_created', { word_count: 7 })).resolves.toBeUndefined();

    expect(initializeAnalytics).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('stays quiet when Analytics itself fails to start', async () => {
    const { logGameEvent, isSupported, logEvent } = await loadAnalytics();
    isSupported.mockRejectedValue(new Error('measurement id missing'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(logGameEvent('room_created', { word_count: 7 })).resolves.toBeUndefined();

    expect(logEvent).not.toHaveBeenCalled();
  });

  it('says so once when Analytics fails to start, not once per event', async () => {
    const { logGameEvent, isSupported } = await loadAnalytics();
    isSupported.mockRejectedValue(new Error('measurement id missing'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await logGameEvent('room_created', { word_count: 7 });
    await logGameEvent('player_joined');
    await logGameEvent('game_completed', { word_count: 7 });

    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('logPageView', () => {
  it('reports the page without naming the room it is', async () => {
    const { logPageView, logEvent } = await loadAnalytics();

    await logPageView(
      pageViewFor({ origin: 'https://example.com', pathname: `/room/${ROOM_ID}`, referrer: '' }),
    );

    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'page_view',
      expect.objectContaining({
        page_location: 'https://example.com/room/:roomId',
        page_path: '/room/:roomId',
      }),
    );
  });

  it('makes the redacted address the one every later event carries', async () => {
    const { logPageView, setDefaultEventParameters } = await loadAnalytics();

    await logPageView(
      pageViewFor({ origin: 'https://example.com', pathname: `/room/${ROOM_ID}`, referrer: '' }),
    );

    expect(setDefaultEventParameters).toHaveBeenCalledWith(
      expect.objectContaining({ page_location: 'https://example.com/room/:roomId' }),
    );
  });

  it('names the page before Analytics starts, not after', async () => {
    const { logPageView, setDefaultEventParameters, initializeAnalytics } = await loadAnalytics();
    const order: string[] = [];
    setDefaultEventParameters.mockImplementation(() => order.push('page named'));
    initializeAnalytics.mockImplementation(() => {
      order.push('Analytics started');

      return FAKE_ANALYTICS;
    });

    await logPageView(
      pageViewFor({ origin: 'https://example.com', pathname: `/room/${ROOM_ID}`, referrer: '' }),
    );

    // The other way round, the events GA4 opens a session with would go out
    // between the two, carrying the address bar as `gtag` read it.
    expect(order).toEqual(['page named', 'Analytics started']);
  });

  it('sends nothing where Analytics is not supported', async () => {
    const { logPageView, isSupported, logEvent } = await loadAnalytics();
    isSupported.mockResolvedValue(false);

    await logPageView(pageViewFor({ origin: 'https://example.com', pathname: '/', referrer: '' }));

    expect(logEvent).not.toHaveBeenCalled();
  });

  it('says nothing about the traffic type from a browser nobody marked', async () => {
    const { logPageView, setDefaultEventParameters, logEvent } = await loadAnalytics();

    await logPageView(pageViewFor({ origin: 'https://example.com', pathname: '/', referrer: '' }));

    expect(setDefaultEventParameters).toHaveBeenCalledWith(
      expect.not.objectContaining({ traffic_type: expect.anything() }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'page_view',
      expect.not.objectContaining({ traffic_type: expect.anything() }),
    );
  });

  it('marks the page view of a browser that was marked as internal', async () => {
    markThisBrowserInternal();
    const { logPageView, logEvent } = await loadAnalytics();

    await logPageView(pageViewFor({ origin: 'https://example.com', pathname: '/', referrer: '' }));

    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'page_view',
      expect.objectContaining({ traffic_type: 'internal' }),
    );
  });

  it('keeps the mark on the second navigation, not only on the first', async () => {
    markThisBrowserInternal();
    const { logPageView, setDefaultEventParameters } = await loadAnalytics();

    await logPageView(pageViewFor({ origin: 'https://example.com', pathname: '/', referrer: '' }));
    await logPageView(
      pageViewFor({ origin: 'https://example.com', pathname: '/create', referrer: '' }),
    );

    // The regression this guards against is a `traffic_type` set by a call of
    // its own: `setDefaultEventParameters` replaces the whole set of defaults
    // rather than adding to it, so the last call is the entirety of what every
    // later event carries — and after a navigation it would hold the page and
    // nothing else. Hence an exact match rather than `objectContaining`.
    expect(setDefaultEventParameters).toHaveBeenLastCalledWith({
      page_location: 'https://example.com/create',
      page_path: '/create',
      page_referrer: '',
      traffic_type: 'internal',
    });
  });
});
