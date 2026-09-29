import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WaitingMark } from './WaitingMark';
import { ringSx, SUN_OUT_DELAYS_MS, SUN_OUT_MS, WAIT_RING_CLASS } from './waiting-mark-styles';

describe('WaitingMark', () => {
  it('says what is being waited for, as a status', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting to the game…');
  });

  it('draws three rings, one for each delay', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    expect(document.querySelectorAll(`.${WAIT_RING_CLASS}`)).toHaveLength(SUN_OUT_DELAYS_MS.length);
    expect(SUN_OUT_DELAYS_MS).toEqual([0, 633, 1266]);
  });

  it('turns each ring for 1900ms, for ever, a third of a period after the one before', () => {
    // Read off the style rather than off the page: jsdom does not parse the
    // `animation` shorthand, so what it would report is `auto` whatever was written.
    SUN_OUT_DELAYS_MS.forEach((delay) => {
      const ring = ringSx(delay);

      expect(ring.animation).toBe(`sun-out ${SUN_OUT_MS}ms cubic-bezier(.2,.7,.3,1) infinite`);
      expect(ring.animationDelay).toBe(`${delay}ms`);
    });
    expect(SUN_OUT_MS).toBe(1900);
  });

  it('is not a spinner: nothing in it is a progressbar', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps the rings out of what a reader is told', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    const ring = document.querySelector(`.${WAIT_RING_CLASS}`);

    expect(ring?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
