import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { SCENE } from './scene-palette';
import { stepTitleSx } from './scene-surface';

/**
 * The name of a step is one drawing shared by `/create`, join, the lobby,
 * `finished` and `closed-early` (`design/templates/state-tree.html`'s
 * `.step-title`, line 112): sentence case as written, 700 at 34px, a line
 * height of 1.1, no capitals and no tracking. The theme's `stepTitle` variant
 * is that drawing; `stepTitleSx` adds only what the garden needs under it, and
 * carries no rule any more (issue #244).
 */
describe('the name of a step', () => {
  const renderTitle = () => {
    render(
      <ThemeProvider theme={theme}>
        <Typography component="h1" variant="stepTitle" sx={stepTitleSx()}>
          New game
        </Typography>
      </ThemeProvider>,
    );
    return getComputedStyle(screen.getByRole('heading', { name: 'New game' }));
  };

  it('is set as the template draws it: 700 at 34px on a line of 1.1', () => {
    const style = renderTitle();

    expect(style.fontSize).toBe('34px');
    expect(style.fontWeight).toBe('700');
    expect(style.lineHeight).toBe('1.1');
  });

  it('is in Alegreya Sans, in sentence case, with no tracking', () => {
    const style = renderTitle();

    expect(style.fontFamily).toContain('Alegreya Sans');
    expect(style.textTransform).not.toBe('uppercase');
    expect(['normal', '0px', '']).toContain(style.letterSpacing);
  });

  it('keeps the garden’s cream, its dark shadow and its 6px margin, and draws no rule', () => {
    const title = stepTitleSx();

    expect(title.color).toBe(SCENE.cream);
    expect(title.textShadow).toBe('0 1px 8px rgba(6, 12, 10, 0.9)');
    expect(title.margin).toBe('0 0 0.375rem');
    expect(title).not.toHaveProperty('&::after');
  });

  it('is a heading of the first level', () => {
    renderTitle();

    expect(screen.getByRole('heading', { level: 1, name: 'New game' })).toBeInTheDocument();
  });
});
