import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { FADE_MS, fitToWindow, LAYERS, layerSx } from './canvas-layer';
import type { GardenAir } from './garden-controls';
import { paintPetals } from './paint-petals';
import { driftPetals, fillSky, type Petal, petalsWanted } from './petals';
import type { Camera } from './use-camera';
import { useDocumentVisible } from './use-document-visible';
import { frameFor, openingOnScreen } from './world';

/**
 * The most a single frame is allowed to be worth, in seconds.
 *
 * A frame that took a quarter of a second — a route being fetched, a phone
 * deciding to do something else — would otherwise move every petal a quarter of
 * a second's worth at once, which reads as the sky jumping.
 */
const LONGEST_FRAME_SECONDS = 1 / 15;

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
 * It has nothing to say about the end of a game any more. The petals were the
 * greeting once, and a finished game now stands inside the temple where they do
 * not fall at all, so what greets a player is the cloth the room lays over its
 * own table ({@link RewardCloth},
 * `docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * Where the window is standing matters here for one reason: the temple's
 * doorway is a hole in the weather, and a petal that falls across it is not
 * drawn (see {@link openingOnScreen}). The camera is asked for that place once
 * a frame rather than given it, because the doorway moves and grows for the
 * length of every journey, and a petal culled against the doorway as it stood a
 * second ago is a petal missing out of the middle of the sky.
 *
 * @param props.air - Whether petals are falling behind this screen
 * @param props.camera - Where the window is standing, which is where the doorway is
 */
export const PetalLayer = ({
  air,
  camera,
}: {
  readonly air: GardenAir;
  readonly camera: Camera;
}) => {
  const theme = useTheme();
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
  const colour = theme.palette.sakura.main;

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

      paintPetals(
        brush,
        petals.current,
        sky,
        colour,
        openingOnScreen(frameFor(camera.at(), sky), sky),
      );
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [camera, colour, isAwake, isDrawing, isStill]);

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
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    />
  );
};
