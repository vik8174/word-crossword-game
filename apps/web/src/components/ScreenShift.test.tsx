import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from './screen-shift';
import { ScreenShift } from './ScreenShift';

/**
 * Answers the reduced-motion query the way the system setting would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off — which is the ordinary case, so it
 * needs no stub and only this one is set up.
 */
const turnAnimationOff = () => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query === REDUCED_MOTION_QUERY,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
};

/**
 * A screen that says when it was started.
 *
 * The screen on its way out must not be started again: it is a whole game with
 * its own effects, and one of them writes the ending of a game
 * (`use-game-completion.ts`).
 */
const Screen = ({
  onStart,
  children,
}: {
  readonly onStart: () => void;
  readonly children: ReactNode;
}) => {
  useEffect(onStart, [onStart]);

  return <>{children}</>;
};

describe('ScreenShift', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the screen it was given, and nothing beside it', () => {
    render(
      <ScreenShift shiftKey="lobby">
        <p>the lobby</p>
      </ScreenShift>,
    );

    expect(screen.getByText('the lobby')).toBeInTheDocument();
  });

  it('keeps the screen that was while the next one arrives, then takes it off', async () => {
    const { rerender } = render(
      <ScreenShift shiftKey="lobby">
        <p>the lobby</p>
      </ScreenShift>,
    );

    rerender(
      <ScreenShift shiftKey="playing">
        <p>the game</p>
      </ScreenShift>,
    );

    // Both at once, which is what makes this a shift rather than a redraw: one
    // screen is drawn over the other for as long as the movement lasts.
    expect(screen.getByText('the lobby')).toBeInTheDocument();
    expect(screen.getByText('the game')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('the lobby')).not.toBeInTheDocument();
    });

    expect(screen.getByText('the game')).toBeInTheDocument();
  });

  it('moves nothing when the screen is redrawn without changing', async () => {
    const started = vi.fn();

    const { rerender } = render(
      <ScreenShift shiftKey="lobby">
        <Screen onStart={started}>the lobby</Screen>
      </ScreenShift>,
    );

    // What a snapshot does: the same screen, built again from a room that has
    // moved on. Every client rewrites its presence mark every fifteen seconds,
    // so this happens roughly every seven for the whole of a game — and none of
    // them is a screen changing.
    rerender(
      <ScreenShift shiftKey="lobby">
        <Screen onStart={started}>the lobby, one player more</Screen>
      </ScreenShift>,
    );

    expect(screen.getByText('the lobby, one player more')).toBeInTheDocument();
    expect(screen.queryByText('the lobby')).not.toBeInTheDocument();
    expect(started).toHaveBeenCalledTimes(1);
  });

  it('does not start the screen on its way out over again', async () => {
    const started = vi.fn();
    const lobby = <Screen onStart={started}>the lobby</Screen>;

    const { rerender } = render(<ScreenShift shiftKey="lobby">{lobby}</ScreenShift>);

    rerender(
      <ScreenShift shiftKey="playing">
        <p>the game</p>
      </ScreenShift>,
    );

    expect(screen.getByText('the lobby')).toBeInTheDocument();
    expect(started).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByText('the lobby')).not.toBeInTheDocument();
    });

    expect(started).toHaveBeenCalledTimes(1);
  });

  it('offers the screen on its way out to nobody', async () => {
    const { rerender } = render(
      <ScreenShift shiftKey="lobby">
        <button>Start the game</button>
      </ScreenShift>,
    );

    rerender(
      <ScreenShift shiftKey="playing">
        <button>End the game</button>
      </ScreenShift>,
    );

    // It is on the page and it is not a control: a reader is not walked through
    // a screen that is leaving, and the focus cannot land in it while a square
    // of the arriving grid is reaching for it.
    expect(screen.getByText('Start the game')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start the game' })).toBeNull();
    expect(screen.getByText('Start the game').closest('[inert]')).not.toBeNull();

    await waitFor(() => {
      expect(screen.queryByText('Start the game')).not.toBeInTheDocument();
    });
  });

  it('changes the screen at once for somebody who turned animation off', () => {
    turnAnimationOff();

    const { rerender } = render(
      <ScreenShift shiftKey="lobby">
        <p>the lobby</p>
      </ScreenShift>,
    );

    rerender(
      <ScreenShift shiftKey="playing">
        <p>the game</p>
      </ScreenShift>,
    );

    // Off rather than slower: the screen that was is not on the page at all, so
    // there is nothing left to wait for.
    expect(screen.getByText('the game')).toBeInTheDocument();
    expect(screen.queryByText('the lobby')).not.toBeInTheDocument();
  });
});
