import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { theme } from './theme';

/**
 * The page every route stands on: `duck`, with ink text at 18px on a line of
 * 1.5 (`design/templates/state-tree.html`, lines 57-60). `CssBaseline` paints it
 * on the body from the theme, so it is the same behind every screen and nothing
 * on a screen has to say it.
 */
describe('the ground of the page', () => {
  it('is duck, with ink text at 18px on a line of 1.5', () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
      </ThemeProvider>,
    );

    const body = getComputedStyle(document.body);

    expect(body.backgroundColor).toBe('rgb(230, 238, 236)');
    expect(body.color).toBe('rgb(27, 45, 56)');
    expect(body.fontSize).toBe('18px');
    expect(body.lineHeight).toBe('1.5');
  });

  it('is the one the app stands on, on the landing route', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    const body = getComputedStyle(document.body);

    expect(body.backgroundColor).toBe('rgb(230, 238, 236)');
  });

  it('is painted by nothing but the body: no route renders a picture or a canvas', () => {
    window.history.pushState({}, '', '/');
    const { container } = render(<App />);

    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('picture')).toBeNull();
  });
});
