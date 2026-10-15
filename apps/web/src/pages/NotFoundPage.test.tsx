import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

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

  it('stands on a tile down the middle of the window, not on a picture', () => {
    const { container } = renderNotFoundPage();

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();

    const band = container.querySelector('[aria-hidden="true"]') as HTMLElement;

    expect(getComputedStyle(band).backgroundColor).toBe('rgb(250, 251, 250)');
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

    expect(style.fontFamily).toMatch(/Alegreya Sans/);
    expect(style.fontWeight).toBe('700');
  });
});
