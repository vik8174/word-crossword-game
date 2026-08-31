import Box from '@mui/material/Box';
import { useEffect, useRef } from 'react';

import { fitToWindow, LAYERS, layerSx } from './canvas-layer';
import type { Camera } from './use-camera';
import { paintScene } from './paint-scene';
import { frameFor } from './world';

/**
 * The place itself: the forest, the temple, and the hall behind its open front.
 *
 * It is painted from wherever the camera is standing at the moment of painting,
 * and that is the whole of what a journey is here — the same few thousand brush
 * strokes laid down again through a frame that has moved a little and grown a
 * little. There is no second scene for the inside of the temple and no picture
 * being swapped for another: the hall is painted inside the doorway, so walking
 * in is a magnification (`world.ts`, {@link paintScene}).
 *
 * When nothing is travelling nothing is painted either. The camera says when the
 * view has changed and this listens, so a settled screen costs no frames at all,
 * and a window being dragged costs one painting rather than one for every pixel
 * of the drag.
 *
 * This outlives `prefers-reduced-motion` while the petals do not: a painting is
 * not movement, and a reader who has asked for stillness has asked for
 * stillness rather than for a blank page. What that setting takes away is the
 * travelling, which is the camera's own answer ({@link useCamera}).
 *
 * @param props.camera - Where the window is standing, and when that changed
 */
export const SceneLayer = ({ camera }: { readonly camera: Camera }) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;

    if (element === null) {
      return undefined;
    }

    const brush = element.getContext('2d');

    if (brush === null) {
      return undefined;
    }

    let pending = 0;

    const paint = () => {
      const viewport = fitToWindow(element, brush);

      paintScene(brush, frameFor(camera.at(), viewport), viewport);
    };

    // A window being dragged fires this many times a second, and each one is a
    // whole forest. Coalesced onto the next frame, so a resize costs one
    // painting rather than one for every pixel of the drag.
    const repaint = () => {
      if (pending === 0) {
        pending = window.requestAnimationFrame(() => {
          pending = 0;
          paint();
        });
      }
    };

    const forget = camera.onFrame(paint);

    paint();
    window.addEventListener('resize', repaint);

    return () => {
      forget();
      window.removeEventListener('resize', repaint);

      if (pending !== 0) {
        window.cancelAnimationFrame(pending);
      }
    };
  }, [camera]);

  return <Box component="canvas" ref={canvas} aria-hidden sx={layerSx(LAYERS.scene)} />;
};
