import { render } from '@testing-library/react';
import { logEvent } from 'firebase/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FunnelScreen } from './funnel';
import { useScreenReached } from './use-screen-reached';

vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/** The screens reported so far, in the order they were reported. */
const reportedScreens = () =>
  vi
    .mocked(logEvent)
    .mock.calls.filter(([, name]) => name === 'screen_reached')
    .map(([, , params]) => (params as { screen: string }).screen);

/** A component that does nothing but report the screen it is handed. */
const Reporter = ({ screen }: { readonly screen: FunnelScreen | null }) => {
  useScreenReached(screen);

  return null;
};

const open = (screen: FunnelScreen | null) => render(<Reporter screen={screen} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useScreenReached', () => {
  it('reports the screen the visitor arrived at', async () => {
    open('home');

    await vi.waitFor(() => {
      expect(reportedScreens()).toEqual(['home']);
    });
  });

  it('reports nothing for a screen that is not part of the funnel', async () => {
    open(null);

    await Promise.resolve();
    expect(reportedScreens()).toEqual([]);
  });

  it('reports one arrival however many times the screen re-renders', async () => {
    const { rerender } = open('lobby');

    await vi.waitFor(() => {
      expect(reportedScreens()).toEqual(['lobby']);
    });

    // What a lobby really does: a snapshot arrives every fifteen seconds
    // because each client marks itself present in the room it is sitting in
    // (issue #47), and every one of them re-renders this screen.
    for (let beat = 0; beat < 8; beat += 1) {
      rerender(<Reporter screen="lobby" />);
    }

    await Promise.resolve();
    expect(reportedScreens()).toEqual(['lobby']);
  });

  it('reports each screen once as the visitor walks through them', async () => {
    const { rerender } = open('join');

    await vi.waitFor(() => {
      expect(reportedScreens()).toEqual(['join']);
    });

    rerender(<Reporter screen="lobby" />);

    await vi.waitFor(() => {
      expect(reportedScreens()).toEqual(['join', 'lobby']);
    });
  });

  it('reports a screen the visitor comes back to, because arriving twice is two arrivals', async () => {
    const { rerender } = open('join');
    rerender(<Reporter screen="lobby" />);
    rerender(<Reporter screen="join" />);

    await vi.waitFor(() => {
      expect(reportedScreens()).toEqual(['join', 'lobby', 'join']);
    });
  });
});
