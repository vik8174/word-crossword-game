import Box from '@mui/material/Box';
import { useEffect, useRef } from 'react';

import { fitToWindow, LAYERS, layerSx } from './canvas-layer';
import type { Location } from './locations';
import { paintScene } from './paint-scene';
import { frameFor } from './world';

/**
 * The place itself: the forest, the temple, and the hall behind its open front.
 *
 * It is painted once and then left alone, which is the whole of its performance
 * story. Nothing in the scene moves — there is no camera in this release and
 * the trees are not in a wind — so a few thousand brush strokes are laid down
 * when the window changes size or the app arrives somewhere else, and never on
 * a frame. That is also why this outlives `prefers-reduced-motion` while the
 * petals do not: a painting is not movement, and a reader who has asked for
 * stillness has asked for stillness rather than for a blank page.
 *
 * @param props.location - Which of the four places the window is standing in
 */
export const SceneLayer = ({ location }: { readonly location: Location }) => {
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
      pending = 0;

      const viewport = fitToWindow(element, brush);

      paintScene(brush, frameFor(location, viewport), viewport);
    };

    // A window being dragged fires this many times a second, and each one is a
    // whole forest. Coalesced onto the next frame, so a resize costs one
    // painting rather than one for every pixel of the drag.
    const repaint = () => {
      if (pending === 0) {
        pending = window.requestAnimationFrame(paint);
      }
    };

    paint();
    window.addEventListener('resize', repaint);

    return () => {
      window.removeEventListener('resize', repaint);

      if (pending !== 0) {
        window.cancelAnimationFrame(pending);
      }
    };
  }, [location]);

  return <Box component="canvas" ref={canvas} aria-hidden sx={layerSx(LAYERS.scene)} />;
};
