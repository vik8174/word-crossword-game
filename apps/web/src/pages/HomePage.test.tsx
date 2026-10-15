import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import { logEvent } from 'firebase/analytics';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../theme';
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

/** Renders the page the way `App.tsx` actually does: in the app's own theme and a router. */
const renderHomePage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('names the game as the template does: Across the Street, in bold ink', () => {
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /across the street/i });
    const style = getComputedStyle(heading);

    expect(heading).toHaveTextContent(/^Across the Street$/);
    expect(style.fontFamily).toContain('Alegreya Sans');
    expect(style.fontWeight).toBe('700');
    expect(style.color).toBe('rgb(27, 45, 56)');
    expect(style.textTransform).not.toBe('uppercase');
  });

  it('says in one sentence what the game is', () => {
    renderHomePage();

    expect(
      screen.getByText(
        'A cooperative crossword. You explain your words out loud, your friend guesses them, and the board fills up between you.',
      ),
    ).toBeInTheDocument();
  });

  it('offers the way into a new game', () => {
    renderHomePage();

    expect(screen.getByRole('link', { name: 'Create a game' })).toHaveAttribute('href', '/create');
  });

  it('draws the street, named for a reader who cannot see it', () => {
    renderHomePage();

    expect(
      screen.getByRole('img', {
        name: 'Two neighbours on facing balconies in a white Andalusian street, with a line strung between them',
      }),
    ).toBeInTheDocument();
  });

  it('lists the three steps of a game in order', () => {
    renderHomePage();

    const steps = within(screen.getByRole('list')).getAllByRole('listitem');

    expect(steps.map((step) => step.textContent)).toEqual([
      '1Type 10 to 20 words',
      '2Send the link to one person',
      '3Explain and guess out loud',
    ]);
  });

  it('does not mention a language, and builds no lesson hint yet', () => {
    const { container } = renderHomePage();

    expect(container.textContent).not.toMatch(/english/i);
    expect(container.textContent).not.toMatch(/teaching a language/i);
  });

  it('reports that the first screen of the funnel was reached', async () => {
    renderHomePage();

    await waitFor(() => {
      expect(reportedEvents()).toEqual([{ name: 'screen_reached', params: { screen: 'home' } }]);
    });
  });
});
