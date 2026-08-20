import type { Analytics } from 'firebase/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => {
  vi.restoreAllMocks();
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

    expect(initializeAnalytics).toHaveBeenCalledWith(expect.anything(), {
      config: { send_page_view: false },
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
});
