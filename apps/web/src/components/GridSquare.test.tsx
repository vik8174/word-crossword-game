import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { GuessEntryCell } from '../rooms/guess-board';
import { theme } from '../theme';
import { GridSquare } from './GridSquare';

/**
 * The app's own theme, around whatever is being rendered.
 *
 * A square reads its colour from `theme.palette.grid`, which MUI's stock theme
 * does not have — so a square drawn outside this is a square drawn somewhere
 * this app never puts one.
 */
const InTheme = ({ children }: { readonly children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

/** A square, with only what a test cares about said explicitly. */
const cellAt = (overrides: Partial<GuessEntryCell>): GuessEntryCell => ({
  row: 0,
  col: 0,
  letter: '',
  source: 'blank',
  nextCellKey: null,
  previousCellKey: null,
  direction: null,
  isActive: false,
  isCrossing: false,
  isRefused: false,
  ...overrides,
});

const noop = () => {};

const renderSquare = (props: Partial<Parameters<typeof GridSquare>[0]> = {}) =>
  render(
    <GridSquare
      cell={cellAt({})}
      number={null}
      isCursor={false}
      isTabStop={false}
      onTyped={noop}
      onTakenUp={noop}
      onPressed={noop}
      {...props}
    />,
    { wrapper: InTheme },
  );

describe('GridSquare', () => {
  it('sets a square this player types into in the text family at the regular weight', () => {
    // Issue #147 moved the board's letters off a serif and onto the text
    // family already fetched for every sentence in the app — checked on the
    // rendered element's computed style, the way a screen actually resolves
    // it, rather than on the value handed to `sx` (issue #147's own trap:
    // a test on a constant proves nothing about a pixel).
    renderSquare({ cell: cellAt({ source: 'own', letter: 'a', direction: 'across' }) });

    const style = getComputedStyle(screen.getByRole('textbox'));

    expect(style.fontFamily).toMatch(/Zen Kaku Gothic New/);
    expect(style.fontFamily).not.toMatch(/Zen Old Mincho/);
    expect(style.fontWeight).toBe('400');
  });

  it('sets a solved square’s letter in the text family at the regular weight, upright and not dashed', () => {
    renderSquare({ cell: cellAt({ source: 'solved', letter: 'a' }) });

    const style = getComputedStyle(screen.getByLabelText(/row 1, column 1/i));

    expect(style.fontFamily).toMatch(/Zen Kaku Gothic New/);
    expect(style.fontFamily).not.toMatch(/Zen Old Mincho/);
    expect(style.fontWeight).toBe('400');
  });

  it('sets a square’s number in the text family', () => {
    const { container } = renderSquare({
      cell: cellAt({ source: 'solved', letter: 'a' }),
      number: 4,
    });

    const number = container.querySelector('[aria-hidden="true"]');
    const style = getComputedStyle(number as Element);

    expect(style.fontFamily).toMatch(/Zen Kaku Gothic New/);
    expect(style.fontFamily).not.toMatch(/Zen Old Mincho/);
  });
});
