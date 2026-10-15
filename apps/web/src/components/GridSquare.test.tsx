import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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

    expect(style.fontFamily).toMatch(/Alegreya Sans/);
    expect(style.fontWeight).toBe('400');
  });

  it('sets a solved square’s letter in the text family, upright and bold', () => {
    renderSquare({ cell: cellAt({ source: 'solved', letter: 'a' }) });

    const style = getComputedStyle(screen.getByLabelText(/row 1, column 1/i));

    expect(style.fontFamily).toMatch(/Alegreya Sans/);
    expect(style.fontWeight).toBe('700');
    expect(style.fontStyle).not.toBe('italic');
    expect(style.outline).not.toMatch(/dashed/);
  });

  it('draws the square this player explains with a dashed outline in ink, not in a rule colour', () => {
    // The cue ADR 0015 holds the board to: a dashed outline where every other
    // square has a solid one. It stays `ink` when the colours move onto the
    // street's roles; `line` would be a rule, and would not be read as a cue.
    renderSquare({ cell: cellAt({ source: 'explained', letter: 'a' }) });

    const style = getComputedStyle(screen.getByLabelText(/row 1, column 1/i));

    expect(style.outline).toBe('1.5px dashed #1b2d38');
    expect(style.fontStyle).toBe('italic');
    expect(style.backgroundColor).toBe('rgb(239, 230, 210)');
  });

  it('draws the answered square on sage, outlined 2px in spruce, in ink at 700', () => {
    renderSquare({ cell: cellAt({ source: 'solved', letter: 'a' }) });

    const style = getComputedStyle(screen.getByLabelText(/row 1, column 1/i));

    expect(style.backgroundColor).toBe('rgb(211, 232, 221)');
    expect(style.color).toBe('rgb(27, 45, 56)');
    expect(style.boxShadow).toMatch(/inset 0 0 0 2px (#2d6658|rgb\(45, 102, 88\))/i);
  });

  /** Every rule the stylesheet holds for an element's pseudo-element, as one string. */
  const pseudoRulesOf = (element: Element, pseudo: '::before' | '::after'): string => {
    const classes = [...element.classList].map((name) => `.${name}${pseudo}`);

    return [...document.querySelectorAll('style')]
      .flatMap((sheet) => (sheet.textContent ?? '').split('}'))
      .filter((rule) => classes.some((selector) => rule.includes(selector)))
      .join('}');
  };

  it('puts a tick in the corner of an answered square and nowhere else', () => {
    const { container, rerender } = renderSquare({
      cell: cellAt({ source: 'solved', letter: 'a' }),
    });
    const wrapper = () => container.firstElementChild as Element;

    expect(pseudoRulesOf(wrapper(), '::after')).toMatch(/border-left:\s*2px solid #2d6658/i);

    rerender(
      <GridSquare
        cell={cellAt({ source: 'blank' })}
        number={null}
        isCursor={false}
        isTabStop={false}
        onTyped={noop}
        onTakenUp={noop}
        onPressed={noop}
      />,
    );

    expect(pseudoRulesOf(wrapper(), '::after')).toBe('');
  });

  it('strikes a refused square through in brick, in bold, and gives it no tick', () => {
    const { container } = renderSquare({
      cell: cellAt({ source: 'own', letter: 'x', isRefused: true, direction: 'across' }),
    });
    const style = getComputedStyle(screen.getByRole('textbox'));

    expect(style.backgroundColor).toBe('rgb(233, 203, 193)');
    expect(style.fontWeight).toBe('700');
    expect(pseudoRulesOf(container.firstElementChild as Element, '::after')).toMatch(
      /background-color:\s*#a33a2c/i,
    );
  });

  it('keeps an empty square on a tile with a solid 1.5px outline of ink and no mark', () => {
    const { container } = renderSquare({
      cell: cellAt({ source: 'own', direction: 'across' }),
    });
    const style = getComputedStyle(screen.getByRole('textbox'));

    expect(style.backgroundColor).toBe('rgb(250, 251, 250)');
    expect(style.boxShadow).toMatch(/inset 0 0 0 1\.5px (#1b2d38|rgb\(27, 45, 56\))/i);
    expect(style.outline).not.toMatch(/dashed/);
    expect(pseudoRulesOf(container.firstElementChild as Element, '::after')).toBe('');
  });

  it('tells an empty, an answered, an explained and a refused square apart with the colour taken out', () => {
    // The test that replaced the one on the fills (issue #228): sage and paper
    // are 1.28 apart in lightness, so the four kinds are held apart by what is
    // drawn on them. A player who reads a word they explain as one already
    // answered stops explaining it (`docs/decisions/0015`).
    const signatureOf = (cell: GuessEntryCell): string => {
      const { container, unmount } = renderSquare({ cell });
      const square = (screen.queryByRole('textbox') ??
        screen.getByLabelText(/row 1, column 1/i)) as HTMLElement;
      const style = getComputedStyle(square);
      const wrapper = container.firstElementChild as Element;
      const mark = (pseudo: '::after' | '::before') =>
        /content/.test(pseudoRulesOf(wrapper, pseudo));
      const signature = [
        style.outline.includes('dashed') ? 'dashed outline' : 'solid outline',
        style.boxShadow.replace(/,.*/, ''),
        style.fontStyle,
        style.fontWeight,
        mark('::after') ? pseudoRulesOf(wrapper, '::after').replace(/^.*\{/, '') : 'no mark',
      ].join(' | ');

      unmount();

      return signature;
    };

    const signatures = [
      cellAt({ source: 'own', direction: 'across' }),
      cellAt({ source: 'solved', letter: 'a' }),
      cellAt({ source: 'explained', letter: 'a' }),
      cellAt({ source: 'own', letter: 'a', direction: 'across', isRefused: true }),
    ].map(signatureOf);

    expect(new Set(signatures).size).toBe(4);
  });

  it('marks the cursor with a spruce ring and a bar under the letter', () => {
    const { container } = renderSquare({
      cell: cellAt({ source: 'own', direction: 'across' }),
      isCursor: true,
    });

    expect(getComputedStyle(screen.getByRole('textbox')).boxShadow).toMatch(/inset 0 0 0 3px/);
    expect(pseudoRulesOf(container.firstElementChild as Element, '::before')).toMatch(
      /background-color:\s*#2d6658/i,
    );
  });

  it('sets a square’s number in the text family', () => {
    const { container } = renderSquare({
      cell: cellAt({ source: 'solved', letter: 'a' }),
      number: 4,
    });

    const number = container.querySelector('[aria-hidden="true"]');
    const style = getComputedStyle(number as Element);

    expect(style.fontFamily).toMatch(/Alegreya Sans/);
    // The drawing's number: 3px down, 4px in, slate, 700.
    expect(style.top).toBe('3px');
    expect(style.left).toBe('4px');
    expect(style.color).toBe('rgb(76, 97, 112)');
    expect(style.fontWeight).toBe('700');
  });

  describe('what a square this player types into takes in', () => {
    const typedSquare = () => {
      const onTyped = vi.fn();

      renderSquare({ cell: cellAt({ source: 'own', direction: 'across' }), onTyped });

      return { onTyped, input: screen.getByRole('textbox') as HTMLInputElement };
    };

    it('carries no limit of one character, which would cut é typed as e and an accent to the e', () => {
      const { input } = typedSquare();

      expect(input).not.toHaveAttribute('maxlength');
    });

    it('hands up an é that arrived as two characters whole, for the entry layer to compose', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.change(input, { target: { value: 'e\u0301' } });

      expect(onTyped).toHaveBeenCalledTimes(1);
      expect(onTyped).toHaveBeenCalledWith('e\u0301');
    });

    it('hands up a precomposed é and an ß as they are', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.change(input, { target: { value: 'é' } });
      fireEvent.change(input, { target: { value: 'ß' } });

      expect(onTyped.mock.calls).toEqual([['é'], ['ß']]);
    });

    it('hands up a letter at once while a keyboard is composing it, as it always did', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'a' } });

      expect(onTyped).toHaveBeenCalledWith('a');
    });

    it('keeps a dead key’s bare accent in the square and hands nothing up until it becomes a letter', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '´' } });

      // Nothing is handed up, so nothing clears the square and ends the composition.
      expect(onTyped).not.toHaveBeenCalled();
      expect(input.value).toBe('´');

      fireEvent.change(input, { target: { value: 'é' } });
      fireEvent.compositionEnd(input, { data: 'é' });

      expect(onTyped).toHaveBeenCalledTimes(1);
      expect(onTyped).toHaveBeenCalledWith('é');
    });

    it('clears the square when the dead key ends without a letter', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '´' } });
      fireEvent.compositionEnd(input, { data: '´' });

      // The entry layer clears a square that is handed no letter.
      expect(onTyped).toHaveBeenCalledTimes(1);
      expect(onTyped).toHaveBeenCalledWith('´');
    });

    it('goes back to handing every change up once the composition has ended', () => {
      const { onTyped, input } = typedSquare();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '´' } });
      fireEvent.compositionEnd(input, { data: '´' });
      onTyped.mockClear();
      fireEvent.change(input, { target: { value: 'x' } });

      expect(onTyped).toHaveBeenCalledWith('x');
    });
  });
});
