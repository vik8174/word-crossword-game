import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { theme } from '../theme';
import { Garden } from './Garden';
import { useGardenControls } from './garden-controls';

/**
 * Answers the media queries the garden asks, the way a browser would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off.
 *
 * @param answer - Which queries match
 */
const browserThatAnswers = (answer: (query: string) => boolean) => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: answer(query),
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

/** Somebody who has turned animation off in their operating system. */
const turnAnimationOff = () => browserThatAnswers((query) => query === REDUCED_MOTION_QUERY);

/** Puts the tab in front or behind and tells the document about it. */
const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

/** How many petals the last frame drew, counted off the canvas it drew through. */
let petalsDrawn = 0;

/** Frames the garden has asked for and not yet been given. */
let frames: FrameRequestCallback[] = [];

/** Frames it gave up on. */
const dropFrame = vi.fn();

/**
 * A canvas that draws nothing and counts everything.
 *
 * jsdom has no canvas behind `getContext`, so without this the petal layer
 * finds nothing to draw through and every test below would pass by drawing
 * nothing at all — which is exactly what two of them are asserting.
 */
const stubCanvas = () => {
  petalsDrawn = 0;

  const brush = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    quadraticCurveTo: () => {},
    setTransform: () => {},
    fill: () => {
      petalsDrawn += 1;
    },
    globalAlpha: 1,
    fillStyle: '',
  };

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    brush as unknown as CanvasRenderingContext2D,
  );
};

/** Hands the garden the next frame it asked for. */
const drawFrame = (at: number) => {
  const next = frames.shift();

  petalsDrawn = 0;
  act(() => {
    next?.(at);
  });
};

/**
 * Somebody in the app who can tell the garden what the screen is doing.
 *
 * Claims the gate on mount, the way `CreateRoomPage` does — the scene starts
 * `null` and stays that way until somebody says otherwise, so a fixture that
 * never claimed one would leave every test below staring at no picture at all
 * (issue #152's second finding).
 */
const Player = () => {
  const { showAir, showScene } = useGardenControls();

  useEffect(() => {
    showScene('gate');
  }, [showScene]);

  return (
    <>
      <button type="button" onClick={() => showAir('still')}>
        deal the words
      </button>
      <button type="button" onClick={() => showAir('petals')}>
        leave the room
      </button>
      <button type="button" onClick={() => showScene('doors')}>
        walk to the doors
      </button>
      <button type="button" onClick={() => showScene('gate')}>
        walk back to the gate
      </button>
    </>
  );
};

const openTheApp = () =>
  render(
    <ThemeProvider theme={theme}>
      <Garden>
        <Player />
      </Garden>
    </ThemeProvider>,
  );

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

/** The jpg the scene picture is currently drawn from. */
const pictureSrc = (container: HTMLElement): string | null =>
  container.querySelector('img')?.getAttribute('src') ?? null;

beforeEach(() => {
  frames = [];
  dropFrame.mockClear();
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal('cancelAnimationFrame', dropFrame);
  stubCanvas();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

describe('Garden', () => {
  it('draws a sky of petals behind the app, and goes on drawing it', () => {
    openTheApp();

    drawFrame(0);

    expect(petalsDrawn).toBeGreaterThan(0);
    expect(frames).toHaveLength(1);
  });

  it('leaves the picture standing when animation is turned off, and takes the weather away', () => {
    turnAnimationOff();

    const { container } = openTheApp();

    // Not fewer petals and not slower ones: the canvas they fall on is not on
    // the page at all, and there is no loop asking for frames. The picture
    // stays, because a photograph is not movement — somebody who has turned
    // animation off has asked for stillness, not for a blank page.
    expect(container.querySelectorAll('canvas')).toHaveLength(0);
    expect(pictureSrc(container)).not.toBeNull();
    expect(frames).toHaveLength(0);
  });

  it('sleeps while the tab is behind another one, and wakes when it comes back', () => {
    openTheApp();
    drawFrame(0);
    frames = [];

    setVisibility('hidden');

    expect(dropFrame).toHaveBeenCalled();
    expect(frames).toHaveLength(0);

    setVisibility('visible');

    expect(frames).toHaveLength(1);
  });

  it('starts drawing again when the weather is wanted after the garden had stopped', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    openTheApp();
    drawFrame(0);

    press('deal the words');
    frames = [];
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // The whole point of the step: the loop is genuinely stopped by now, so
    // what follows is a garden starting from nothing rather than one that never
    // paused. This is the sequence a real session goes through — a game, and
    // then the room being left — and the one place the layer restarts itself.
    expect(frames).toHaveLength(0);

    press('leave the room');

    expect(frames).toHaveLength(1);

    drawFrame(16);

    expect(petalsDrawn).toBeGreaterThan(0);
  });

  it('draws no picture at all until something has said which one it wants', () => {
    // Regression coverage for a real bug: a default scene here used to mean a
    // cold `/room/<id>` fetched the gate's picture in full before the room's
    // own lazy chunk had even loaded, on top of whichever picture the room
    // then turned out to need (issue #152's second finding). Nobody in this
    // render — unlike `Player` — has claimed a scene yet.
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Garden>
          <button type="button">say nothing about the scene</button>
        </Garden>
      </ThemeProvider>,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('picture')).toBeNull();
  });

  it('shows a different picture at once when the screen says to', () => {
    const { container } = openTheApp();
    const before = pictureSrc(container);

    press('walk to the doors');

    const after = pictureSrc(container);

    // A plain attribute swap rather than a journey: the transition between two
    // pictures is the next ticket's to build (#153).
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
    expect(after).toContain('doors');
  });

  it('fades the garden out for a game and then stops drawing it', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const { container } = openTheApp();
    drawFrame(0);

    press('deal the words');

    // Still on the page and still being drawn, because it is going rather than
    // gone — the board arrives over a background that is settling, not one that
    // snapped off behind it. The picture behind it never went anywhere.
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(frames).toHaveLength(1);

    frames = [];
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(dropFrame).toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });
});
