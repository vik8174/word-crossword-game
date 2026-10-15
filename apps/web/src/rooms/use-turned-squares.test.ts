import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTurnedSquares } from './use-turned-squares';

const CAT = ['0:0', '0:1', '0:2'];
const CAR = ['0:0', '1:0', '2:0'];

describe('useTurnedSquares', () => {
  it('turns nothing in a room opened with words already answered', () => {
    const { result } = renderHook(() => useTurnedSquares([CAT]));

    expect(result.current.size).toBe(0);
  });

  it('turns the squares of a word answered while the board is on the screen, each at its place', () => {
    const { result, rerender } = renderHook(({ answered }) => useTurnedSquares(answered), {
      initialProps: { answered: [] as readonly (readonly string[])[] },
    });

    rerender({ answered: [CAT] });

    expect([...result.current]).toEqual([
      ['0:0', 0],
      ['0:1', 1],
      ['0:2', 2],
    ]);
  });

  it('does not turn anything again on a redraw that answers nothing new', () => {
    const { result, rerender } = renderHook(({ answered }) => useTurnedSquares(answered), {
      initialProps: { answered: [] as readonly (readonly string[])[] },
    });

    rerender({ answered: [CAT] });
    const turned = result.current;

    rerender({ answered: [[...CAT]] });

    expect(result.current).toBe(turned);
  });

  it('keeps the place a shared square first had when a crossing word is answered', () => {
    const { result, rerender } = renderHook(({ answered }) => useTurnedSquares(answered), {
      initialProps: { answered: [] as readonly (readonly string[])[] },
    });

    rerender({ answered: [CAT] });
    rerender({ answered: [CAT, CAR] });

    expect(result.current.get('0:0')).toBe(0);
    expect(result.current.get('1:0')).toBe(1);
    expect(result.current.get('2:0')).toBe(2);
  });
});
