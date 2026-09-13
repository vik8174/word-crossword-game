import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GardenControlsContext } from '../garden/garden-controls';
import { theme } from '../theme';
import { NotFoundPage } from './NotFoundPage';

const renderNotFoundPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('NotFoundPage', () => {
  it('offers a way back to the start', () => {
    renderNotFoundPage();

    expect(screen.getByRole('link', { name: /go to the start/i })).toHaveAttribute('href', '/');
  });

  it('claims the gate as its own picture on mount, rather than trusting a default', () => {
    // The scene `Garden` starts on is `null`, not a guess (issue #152's second
    // finding): a screen that never says which picture it wants is left with
    // none, which is a silent failure a green CI run would not otherwise
    // catch — nothing here renders visibly differently either way.
    // `GardenControlsContext`'s own default (`NO_GARDEN`) makes `showScene` a
    // no-op, so a render that never wraps this page in a spied context would
    // pass whether or not the page actually claims anything.
    const showScene = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <GardenControlsContext value={{ showAir: vi.fn(), showScene }}>
          <MemoryRouter>
            <NotFoundPage />
          </MemoryRouter>
        </GardenControlsContext>
      </ThemeProvider>,
    );

    expect(showScene).toHaveBeenCalledWith('gate');
  });

  it('sets its heading in the text family at the bold weight', () => {
    // The one visible `h1` in the app (`RoomShell.tsx` and `RoomPage.tsx`
    // hide theirs). Issue #147 moved it off the serif and onto the text
    // family, checked on the rendered element's computed style rather than
    // on the theme's own config object.
    renderNotFoundPage();

    const style = getComputedStyle(
      screen.getByRole('heading', { name: /this page does not exist/i }),
    );

    expect(style.fontFamily).toMatch(/Zen Kaku Gothic New/);
    expect(style.fontFamily).not.toMatch(/Zen Old Mincho/);
    expect(style.fontWeight).toBe('700');
  });
});
