import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { theme } from '../theme';
import { Garden } from './Garden';
import { useGardenControls } from './garden-controls';

/**
 * Answers the reduced-motion query the way the system setting would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off — the ordinary case, which is why
 * only this one is set up.
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
 * jsdom has no canvas behind `getContext`, so without this the garden finds
 * nothing to draw through and every test below would pass by drawing nothing at
 * all — which is exactly what two of them are asserting.
 *
 * It is wide enough for the scene as well as the weather. Both layers draw
 * through the same stub, and the count above is only ever read across one frame
 * of the weather — the scene is painted when the layer is mounted and not
 * again, so it is never inside anything being counted.
 */
const stubCanvas = () => {
  petalsDrawn = 0;

  const gradient = { addColorStop: () => {} } as unknown as CanvasGradient;

  const brush = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    rect: () => {},
    roundRect: () => {},
    ellipse: () => {},
    clip: () => {},
    fillRect: () => {},
    stroke: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    setTransform: () => {},
    fill: () => {
      petalsDrawn += 1;
    },
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
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

/** Somebody in the app who can tell the garden what the screen is doing. */
const Player = () => {
  const { showAir, greet } = useGardenControls();

  return (
    <>
      <button type="button" onClick={() => showAir('still')}>
        deal the words
      </button>
      {/* Both, and in this order, because that is what the room does: the air
        and the greeting are set from one effect as a screen becomes the next
        one (`use-room-garden.ts`). */}
      <button
        type="button"
        onClick={() => {
          showAir('petals');
          greet();
        }}
      >
        finish the game
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

  it('leaves the place standing when animation is turned off, and takes the weather away', () => {
    turnAnimationOff();

    const { container } = openTheApp();

    // Not fewer petals and not slower ones: the canvas they fall on is not on
    // the page at all, and there is no loop asking for frames. The scene stays,
    // because a painting is not movement — somebody who has turned animation
    // off has asked for stillness, not for a blank page.
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
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

  it('fills the sky when a game is finished, thicker than the background it settles into', () => {
    openTheApp();
    drawFrame(0);
    drawFrame(16);

    const background = petalsDrawn;

    press('finish the game');
    drawFrame(32);

    expect(petalsDrawn).toBeGreaterThan(background);
  });

  it('starts drawing again when a game ends after the garden had stopped', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    openTheApp();
    drawFrame(0);

    const background = petalsDrawn;

    press('deal the words');
    frames = [];
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // The whole point of the step: the loop is genuinely stopped by now, so
    // what follows is a garden starting from nothing rather than one that never
    // paused. This is the sequence a real game goes through and the one place
    // the layer restarts itself.
    expect(frames).toHaveLength(0);

    press('finish the game');

    expect(frames).toHaveLength(1);

    drawFrame(16);

    expect(petalsDrawn).toBeGreaterThan(background);
  });

  it('drops a greeting that fell while the tab was behind another one', () => {
    openTheApp();
    drawFrame(0);

    const background = petalsDrawn;

    setVisibility('hidden');
    press('finish the game');
    setVisibility('visible');
    drawFrame(16);
    drawFrame(32);

    // Not kept for later: the person came back to a game that had ended, and a
    // greeting replayed for them is the reload case wearing a different hat.
    expect(petalsDrawn).toBeLessThanOrEqual(background);
  });

  it('fades the garden out for a game and then stops drawing it', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const { container } = openTheApp();
    drawFrame(0);

    press('deal the words');

    // Still on the page and still being drawn, because it is going rather than
    // gone — the board arrives over a background that is settling, not one that
    // snapped off behind it. The place behind it never went anywhere.
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(frames).toHaveLength(1);

    frames = [];
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(dropFrame).toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });
});
