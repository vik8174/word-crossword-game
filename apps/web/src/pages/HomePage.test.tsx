import { render, screen, waitFor } from '@testing-library/react';
import { logEvent } from 'firebase/analytics';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

// Analytics is the system boundary: mocked so what this page reports can be
// read off it without a Firebase project behind it.
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/** Every analytics event reported so far, as name and parameters. */
const reportedEvents = () =>
  vi.mocked(logEvent).mock.calls.map(([, name, params]) => ({ name, params }));

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('renders the game title', () => {
    renderHomePage();

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();
  });

  it('offers the way into a new game', () => {
    renderHomePage();

    expect(screen.getByRole('link', { name: /create a game/i })).toHaveAttribute('href', '/create');
  });

  it('reports that the first screen of the funnel was reached', async () => {
    renderHomePage();

    await waitFor(() => {
      expect(reportedEvents()).toEqual([{ name: 'screen_reached', params: { screen: 'home' } }]);
    });
  });
});
