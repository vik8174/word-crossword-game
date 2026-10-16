import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LobbyStreet } from './LobbyStreet';

/** A window that is wide (or not) as far as `matchMedia` is asked. */
const windowIs = (wide: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: wide && query.includes('min-width: 1200px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
};

const viewBoxOf = (container: HTMLElement) =>
  container.querySelector('svg')?.getAttribute('viewBox');

afterEach(() => vi.unstubAllGlobals());

describe('LobbyStreet: how much of the street it shows', () => {
  it.each([
    ['one in', 1],
    ['both in', 2],
    ['nobody in', 0],
  ])('shows the houses whole on a wide window (%s)', (_name, players) => {
    windowIs(true);
    const { container } = render(<LobbyStreet players={players} seatFreedBySilence={false} />);
    expect(viewBoxOf(container)).toBe('0 30 640 498');
  });

  it.each([
    ['one in', 1],
    ['both in', 2],
    ['nobody in', 0],
  ])('keeps the top crop on a tablet and a phone (%s)', (_name, players) => {
    windowIs(false);
    const { container } = render(<LobbyStreet players={players} seatFreedBySilence={false} />);
    expect(viewBoxOf(container)).toBe('0 40 640 312');
  });
});
