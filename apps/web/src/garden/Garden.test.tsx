import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { theme } from '../theme';
import { Garden } from './Garden';
import { useGardenControls } from './garden-controls';
import { CAMERA_MS } from './camera';
import { DOORS, GATE } from './locations';

/**
 * Answers the media queries the garden asks, the way a browser would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off, on a window with no room in it.
 * That is the ordinary case for most of this file, and the two below are the
 * two answers that change what the garden does.
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

/** A window with enough of both dimensions for the camera to be worth having. */
const openAWindowWithRoomInIt = () => browserThatAnswers((query) => query.includes('min-width'));

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

/** Hands out one whole frame: everything waiting for one, at the same moment. */
const tick = (at: number) => {
  const waiting = frames;

  frames = [];
  act(() => {
    for (const frame of waiting) {
      frame(at);
    }
  });
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
  const { showAir, showLocation } = useGardenControls();

  return (
    <>
      <button type="button" onClick={() => showAir('still')}>
        deal the words
      </button>
      <button type="button" onClick={() => showAir('petals')}>
        leave the room
      </button>
      <button type="button" onClick={() => showLocation(DOORS)}>
        walk to the doors
      </button>
      <button type="button" onClick={() => showLocation(GATE)}>
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

  it('travels between two places rather than cutting to the second', () => {
    openAWindowWithRoomInIt();

    const { container } = openTheApp();
    // The app is the last of the garden's children: the two canvases and the
    // dimming are drawn behind it, and this is the one the camera touches.
    const app = container.lastElementChild as HTMLElement;

    press('walk to the doors');
    tick(0);
    tick(300);

    // Part way there, and the interface is not on the screen: the middle of a
    // journey belongs to the place alone.
    expect(Number(app.style.opacity)).toBeLessThan(1);

    tick(CAMERA_MS * 2);

    expect(app.style.opacity).toBe('1');
  });

  it('asks for frames only while it is travelling', () => {
    openAWindowWithRoomInIt();
    openTheApp();
    tick(0);

    const settled = frames.length;

    press('walk to the doors');

    expect(frames.length).toBeGreaterThan(settled);

    // The first frame is where a journey starts its clock, and the second is
    // long past the end of it: the camera lands and stops asking, while the
    // weather goes on as it always does.
    tick(0);
    tick(CAMERA_MS * 2);

    expect(frames).toHaveLength(settled);
  });

  it('changes the place at once on a window with no room for a journey', () => {
    // A phone sees a narrow slice of the world, so a journey across it is a
    // stripe of green sliding past — on the device least able to spare the
    // frames it would cost.
    const { container } = openTheApp();
    const app = container.lastElementChild as HTMLElement;

    frames = [];
    press('walk to the doors');

    expect(frames).toHaveLength(0);
    expect(app.style.opacity).toBe('1');
  });

  it('changes the place at once when animation is turned off', () => {
    turnAnimationOff();

    const { container } = openTheApp();
    const app = container.lastElementChild as HTMLElement;

    frames = [];
    press('walk to the doors');

    // Off is off: not a shorter journey and not a gentler one, and the
    // interface is never taken off the screen on the way.
    expect(frames).toHaveLength(0);
    expect(app.style.opacity).toBe('1');
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
