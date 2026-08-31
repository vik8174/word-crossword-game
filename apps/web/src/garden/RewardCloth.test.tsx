import { ThemeProvider } from '@mui/material/styles';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { theme } from '../theme';
import { CLOTH_MS } from './cloth';
import { RewardCloth } from './RewardCloth';

const SUMMARY = 'You finished the crossword together — all 6 of its words, between the 2 of you.';

/** How many times the cloth has been painted since the last time this was read. */
let painted = 0;

/** Frames the cloth has asked for and not yet been given. */
let frames: FrameRequestCallback[] = [];

/**
 * Answers the reduced-motion query the way the system setting would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off — the ordinary case.
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

/** Puts the tab in front or behind. */
const watching = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
};

/**
 * A canvas that draws nothing and counts the one call that says a frame was
 * drawn.
 *
 * jsdom has no canvas behind `getContext`, so without this the cloth finds
 * nothing to draw through and every count below would be nought — which is what
 * two of these tests are asserting.
 */
const stubCanvas = () => {
  painted = 0;

  const gradient = { addColorStop: () => {} } as unknown as CanvasGradient;

  const brush = {
    clearRect: () => {
      painted += 1;
    },
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    ellipse: () => {},
    clip: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    createLinearGradient: () => gradient,
    setTransform: () => {},
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
  };

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    brush as unknown as CanvasRenderingContext2D,
  );
};

/** Hands the cloth the next frame it asked for. */
const drawFrame = (at: number) => {
  const next = frames.shift();

  act(() => {
    next?.(at);
  });
};

const layTheCloth = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <RewardCloth summary={SUMMARY} />
      </MemoryRouter>
    </ThemeProvider>,
  );

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  watching('visible');
  stubCanvas();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  watching('visible');
});

describe('RewardCloth', () => {
  it('says what the room did, and offers one thing to do', () => {
    layTheCloth();

    expect(screen.getByRole('heading', { name: /congratulations/i })).toBeInTheDocument();
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the gate/i })).toHaveAttribute('href', '/');
  });

  it('draws the cloth on every frame until it is down, and then stops asking', () => {
    layTheCloth();

    // Painted once as it is mounted, so there is no frame of nothing before the
    // first one the browser hands out.
    expect(painted).toBe(1);

    drawFrame(0);
    drawFrame(500);

    expect(painted).toBe(3);
    expect(frames).toHaveLength(1);

    drawFrame(CLOTH_MS);

    // Over. The last frame stays on the canvas and nothing goes on drawing it.
    expect(frames).toHaveLength(0);
  });

  it('is already down, with the words on it, when animation is turned off', () => {
    turnAnimationOff();
    layTheCloth();

    // Not a faster cloth: there is no event at all, and the words are not
    // waiting on one either.
    expect(painted).toBe(1);
    expect(frames).toHaveLength(0);
    expect(screen.getByRole('heading', { name: /congratulations/i })).toBeInTheDocument();
  });

  it('is already down for somebody who was not there to see it laid', () => {
    // A game that ended while the tab was behind another one has ended by the
    // time they look, and an event played for them on their return is the
    // reload case wearing a different hat
    // (`docs/decisions/0030-where-movement-is-allowed.md`).
    watching('hidden');
    layTheCloth();

    expect(painted).toBe(1);
    expect(frames).toHaveLength(0);
  });
});
