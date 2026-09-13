import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { FADE_MS, fitToWindow, LAYERS, layerSx } from './canvas-layer';
import type { GardenAir } from './garden-controls';
import { paintPetals } from './petal-brush';
import { driftPetals, fillSky, type Petal, petalsWanted } from './petals';
import { useDocumentVisible } from './use-document-visible';

/**
 * The most a single frame is allowed to be worth, in seconds.
 *
 * A frame that took a fifth of a second — a route being fetched, a phone
 * deciding to do something else — would otherwise move every petal a fifth of
 * a second's worth at once, which reads as the sky jumping. The template's own
 * number (issue #190; `design/templates/state-tree.html` line 1674), tighter
 * than the app's own fifteenth of a second.
 */
export const LONGEST_FRAME_SECONDS = 0.05;

/**
 * The weather: one canvas of petals over the place, and the loop that draws it.
 *
 * Three things switch it off, and they are three different things:
 *
 * - **Animation turned off in the operating system** takes the canvas off the
 *   page altogether. Not fewer petals and not slower ones; there is no setting
 *   in the app that overrides it, and there is not meant to be. The place stays,
 *   because the place was never movement.
 * - **A game** leaves the canvas where it is and fades it out, then stops the
 *   loop once there is nothing left to see.
 * - **A tab nobody is looking at** stops the loop and leaves the last frame on
 *   the canvas, so a phone in a pocket is not drawing a garden.
 *
 * It never stops for a change of picture. Which of the three scenes is
 * standing behind the app is this canvas's neighbour, not its business — this
 * is one layer for the life of the tab, painted over whichever picture
 * `Garden.tsx` is currently showing underneath it, and it never resets when
 * that picture changes (`handoffs/scenes/README.md`). It also no longer culls
 * against a doorway: that rule belonged to a continuous painted world with a
 * camera moving through it (issue #115), and issue #152 replaces that world
 * with three separate pictures, so a petal is either on screen or the whole
 * layer has faded out — there is no third place for one to fall into.
 *
 * @param props.air - Whether petals are falling behind this screen
 */
export const PetalLayer = ({ air }: { readonly air: GardenAir }) => {
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const isAwake = useDocumentVisible();
  const canvas = useRef<HTMLCanvasElement>(null);

  // The sky between frames. Not state: every frame reads it and no frame is a
  // render, so holding it as state would redraw the whole app sixty times a
  // second to move a petal.
  const petals = useRef<readonly Petal[] | null>(null);

  // Not the same thing as the air. The air says what should be seen and the
  // canvas fades between the two; this says whether there is any point drawing,
  // and it outlasts the air by the length of the fade.
  const [isDrawing, setIsDrawing] = useState(air === 'petals');

  // Petals are wanted again, so there is something to draw again — said here
  // rather than from an effect, because the loop should be running by the time
  // this render is painted and not a frame after it.
  if (air === 'petals' && !isDrawing) {
    setIsDrawing(true);
  }

  useEffect(() => {
    if (air === 'petals') {
      return undefined;
    }

    // The canvas is fading out and still worth drawing until it is gone. A loop
    // stopped the moment a game began would freeze the sky in place and then
    // fade the frozen sky, which reads as a photograph of a garden.
    const timer = window.setTimeout(() => setIsDrawing(false), FADE_MS);

    return () => window.clearTimeout(timer);
  }, [air]);

  useEffect(() => {
    const element = canvas.current;

    if (isStill || !isDrawing || !isAwake || element === null) {
      return undefined;
    }

    const brush = element.getContext('2d');

    if (brush === null) {
      return undefined;
    }

    let frame = 0;
    let last: number | null = null;

    const step = (now: number) => {
      const sky = fitToWindow(element, brush);
      const seconds = last === null ? 0 : Math.min((now - last) / 1000, LONGEST_FRAME_SECONDS);

      last = now;

      const wanted = petalsWanted(sky);

      petals.current =
        petals.current === null
          ? fillSky(sky, Math.random)
          : driftPetals(petals.current, seconds, sky, wanted, Math.random);

      paintPetals(brush, petals.current, sky);
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [isAwake, isDrawing, isStill]);

  if (isStill) {
    return null;
  }

  return (
    <Box
      component="canvas"
      ref={canvas}
      aria-hidden
      sx={{
        ...layerSx(LAYERS.petals),
        opacity: air === 'petals' ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    />
  );
};
