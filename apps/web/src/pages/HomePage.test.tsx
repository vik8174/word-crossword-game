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

  it('stands on a picture rather than a canvas (issue #151)', () => {
    // The one acceptance criterion a screenshot cannot argue with: this route
    // creates no `<canvas>` at all, whatever `getContext` would answer if it
    // did. `App.test.tsx` covers the same claim at the routing level, where
    // the boundary between this page and the garden is actually decided.
    const { container } = renderHomePage();

    expect(container.querySelector('canvas')).toBeNull();
  });

  it('draws the gate as an image with a decoding fallback', () => {
    const { container } = renderHomePage();

    // A screen reader has nothing to read off a picture that is entirely
    // lettering and one button already on the page, so the image itself is
    // decorative (`alt=""`) rather than described a second time.
    const img = container.querySelector('img');

    expect(img).toHaveAttribute('src', '/scenes/gate.jpg');
    expect(img).toHaveAttribute('alt', '');
    expect(container.querySelector('source[type="image/avif"]')).toHaveAttribute(
      'srcset',
      '/scenes/gate.avif',
    );
  });

  it('renders the name in sumi, not the cream a descendant rule would otherwise win with', () => {
    // `GATE_INK === '#1C1A1A'` is true regardless of what actually reaches the
    // screen — `gate-chrome.test.ts` already asserts that constant and cannot
    // catch this. `ON_SCENE_SX` on this page's own `<main>` carries `'&
    // .MuiTypography-root': { color: 'inherit' }` (`garden/scene-surface.ts`),
    // a descendant rule at specificity (0,2,0); a plain one-class `sx` rule on
    // the heading itself is only (0,1,0), so cream from `<main>` won
    // regardless of source order until the heading's own rule was written as
    // `&&&` (0,3,0). Checked on the rendered element's computed style, the way
    // a screen actually resolves it, rather than on the value handed to `sx`.
    renderHomePage();

    const heading = screen.getByRole('heading', { name: /word crossword game/i });

    expect(getComputedStyle(heading).color).toBe('rgb(28, 26, 26)');
  });
});
