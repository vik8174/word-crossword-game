import { logEvent } from 'firebase/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoomScreen } from '../rooms/room-screen';
import { funnelScreenFor, logScreenReached } from './funnel';

vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

/** Every event reported so far, as name and parameters. */
const reportedEvents = () =>
  vi.mocked(logEvent).mock.calls.map(([, name, params]) => ({ name, params }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('funnelScreenFor', () => {
  it('splits the one room address into the two arrivals a path cannot tell apart', () => {
    expect(funnelScreenFor('join')).toBe('join');
    expect(funnelScreenFor('lobby')).toBe('lobby');
  });

  it('places every other room screen outside the funnel', () => {
    const outside: readonly RoomScreen['kind'][] = [
      'connecting',
      'unavailable',
      'playing',
      'finished',
      'closed-early',
    ];

    expect(outside.map(funnelScreenFor)).toEqual(outside.map(() => null));
  });
});

describe('logScreenReached', () => {
  it('reports the screen by name', async () => {
    await logScreenReached('lobby');

    expect(reportedEvents()).toEqual([{ name: 'screen_reached', params: { screen: 'lobby' } }]);
  });

  it('refuses a screen name that is not one of the four, at compile time', async () => {
    // @ts-expect-error A room id, a nickname and a word are all strings, and
    // none of them is a screen. This line ceasing to be an error is the
    // regression: it would mean text a player wrote can be sent as a screen.
    await logScreenReached(ROOM_ID);
  });
});
