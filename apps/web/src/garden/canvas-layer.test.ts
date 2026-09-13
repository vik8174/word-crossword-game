import { afterEach, describe, expect, it, vi } from 'vitest';

import { FADE_MS, fitToWindow, LAYERS } from './canvas-layer';

/**
 * A canvas element that remembers the bitmap size it was given, without a
 * real `<canvas>` behind it — jsdom has none to measure a device pixel ratio
 * against.
 *
 * @param clientWidth - The window it is stretched over, in CSS pixels
 * @param clientHeight - The window it is stretched over, in CSS pixels
 */
const fakeCanvas = (clientWidth: number, clientHeight: number) => {
  const element = { clientWidth, clientHeight, width: 0, height: 0 } as HTMLCanvasElement;
  const transforms: number[][] = [];
  const brush = {
    setTransform: (...args: number[]) => {
      transforms.push(args);
    },
  } as unknown as CanvasRenderingContext2D;

  return { element, brush, transforms };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fitToWindow', () => {
  it('stretches the bitmap by the screen its own dots, up to two of them a pixel', () => {
    vi.stubGlobal('devicePixelRatio', 1.5);

    const { element, brush, transforms } = fakeCanvas(400, 300);
    const viewport = fitToWindow(element, brush);

    expect(viewport).toEqual({ width: 400, height: 300 });
    expect(element.width).toBe(600);
    expect(element.height).toBe(450);
    expect(transforms).toEqual([[1.5, 0, 0, 1.5, 0, 0]]);
  });

  it('caps the bitmap at two dots a pixel, however many the screen has', () => {
    // The template's own cap (issue #190; `design/templates/state-tree.html`
    // line 1661): past two, more dots stop reading as a sharper petal and
    // only cost a phone frames it does not get back.
    vi.stubGlobal('devicePixelRatio', 4);

    const { element, brush, transforms } = fakeCanvas(400, 300);

    fitToWindow(element, brush);

    expect(element.width).toBe(800);
    expect(element.height).toBe(600);
    expect(transforms).toEqual([[2, 0, 0, 2, 0, 0]]);
  });

  it('treats a screen with no ratio of its own as one dot a pixel', () => {
    vi.stubGlobal('devicePixelRatio', 0);

    const { element, brush, transforms } = fakeCanvas(200, 100);

    fitToWindow(element, brush);

    expect(element.width).toBe(200);
    expect(transforms).toEqual([[1, 0, 0, 1, 0, 0]]);
  });
});

describe('LAYERS', () => {
  it('stands the weather in front of the dimming, both behind the interface', () => {
    // Issue #190: the weather used to sit behind the dimming, which is why
    // petals barely showed against a picture already put down by it.
    expect(LAYERS.petals).toBeGreaterThan(LAYERS.veil);
    expect(LAYERS.veil).toBeGreaterThan(LAYERS.scene);
    expect(LAYERS.petals).toBeLessThan(0);
  });
});

describe('FADE_MS', () => {
  it('is the 1600 ms fade the petals now use', () => {
    expect(FADE_MS).toBe(1600);
  });
});
