import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
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
  it('renders the game title', () => {
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /across the street/i });

    expect(heading).toBeInTheDocument();
    // No dot, mark or rule after the name (settled in PRD #145) — a regexp
    // anchored on both ends catches trailing punctuation a substring match
    // would miss. The name is "Across the Street" in the text; the capitals
    // are the page's own lettering.
    expect(heading).toHaveTextContent(/^Across the Street$/);
  });

  it('sets the name in Alegreya Sans at its bold, keeping its capitals and tracking', () => {
    // There is no logotype face any more (issue #244): the name is the one
    // face at 700, with the capitals and the tracking it had until the screen
    // is redrawn (#224). Checked on the rendered element's computed style, as
    // a test on a constant would pass whether or not this component reached
    // for it.
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /across the street/i });
    const style = getComputedStyle(heading);

    expect(style.fontFamily).toContain('Alegreya Sans');
    expect(style.fontWeight).toBe('700');
    expect(style.textTransform).toBe('uppercase');
    // 0.34em of the computed size, which jsdom resolves to pixels.
    expect(parseFloat(style.letterSpacing)).toBeCloseTo(parseFloat(style.fontSize) * 0.34, 3);
  });

  it('renders the tagline in capitals, in the text face, with no number', () => {
    renderHomePage();

    const tagline = screen.getByText(/cooperative crossword/i);

    expect(tagline).toHaveTextContent(/^A COOPERATIVE CROSSWORD$/i);
    expect(getComputedStyle(tagline).fontFamily).toContain('Alegreya Sans');
    expect(getComputedStyle(tagline).textTransform).toBe('uppercase');
    expect(tagline).not.toHaveTextContent(/\d/);
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

  it('draws no picture: the page stands on the ground the theme paints', () => {
    const { container } = renderHomePage();

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('renders the name in ink from the theme', () => {
    // Checked on the rendered element's computed style, the way a screen
    // actually resolves it, rather than on the value handed to `sx`.
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /across the street/i });

    expect(getComputedStyle(heading).color).toBe('rgb(27, 45, 56)');
  });

  it('draws no shadow behind the name: it was a cream offset for the picture', () => {
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /across the street/i });

    // A shadow has an offset in it; the absence of one computes to `none`, to
    // nothing, or to a transparent black, depending on the engine.
    expect(getComputedStyle(heading).textShadow).not.toMatch(/\d(px|em)/);
  });

  it('is called Across the Street, and nothing on it says anything else', () => {
    const { container } = renderHomePage();

    expect(container.textContent?.toLowerCase()).not.toContain('word garden');
  });
});
