import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { FADE_MS, fitToWindow, LAYERS, layerSx } from './canvas-layer';
import type { GardenAir } from './garden-controls';
import type { Location } from './locations';
import { paintPetals } from './paint-petals';
import { driftPetals, fillSky, type Petal, petalsWanted, seedSky } from './petals';
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
 * Where the window is standing matters here for one reason: the temple's
 * doorway is a hole in the weather, and a petal that falls across it is not
 * drawn (see {@link openingOnScreen}).
 *
 * @param props.air - Whether petals are falling behind this screen
 * @param props.greeting - How many greetings have been asked for, one per game finished
 * @param props.location - Where the window is standing, which is where the doorway is
 */
export const PetalLayer = ({
  air,
  greeting,
  location,
}: {
  readonly air: GardenAir;
  readonly greeting: number;
  readonly location: Location;
}) => {
  const theme = useTheme();
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const isAwake = useDocumentVisible();
  const canvas = useRef<HTMLCanvasElement>(null);

  // The sky between frames, and how long ago the last game ended. Neither is
  // state: every frame reads them and no frame is a render, so holding them as
  // state would redraw the whole app sixty times a second to move a petal.
  const petals = useRef<readonly Petal[] | null>(null);
  const sinceGreeting = useRef<number | null>(null);
  const isBursting = useRef(false);
  const greeted = useRef(0);

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
    // Counted rather than flagged, so that the app starting is not a game
    // ending: both begin at nought, and a greeting on the first render is the
    // very thing this whole arrangement exists to avoid.
    if (greeting === greeted.current) {
      return;
    }

    greeted.current = greeting;

    // A greeting that fell while nobody was looking is dropped rather than
    // kept. Somebody who left the tab and came back after the game ended is
    // shown a calm result, which is the price of a garden that sleeps and is
    // paid knowingly (`docs/decisions/0030-where-movement-is-allowed.md`).
    if (!isAwake) {
      return;
    }

    sinceGreeting.current = 0;
    isBursting.current = true;
  }, [greeting, isAwake]);

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

      if (sinceGreeting.current !== null) {
        sinceGreeting.current += seconds;
      }

      const wanted = petalsWanted(sky, sinceGreeting.current);

      if (petals.current === null) {
        petals.current = fillSky(sky, Math.random);
      } else if (isBursting.current) {
        // The one frame of a greeting. The rest of the sky it asked for is put
        // there at once rather than let in over the top edge, which would still
        // be arriving when the greeting was over.
        isBursting.current = false;
        petals.current = seedSky(petals.current, sky, wanted, Math.random);
      } else {
        petals.current = driftPetals(petals.current, seconds, sky, wanted, Math.random);
      }

      paintPetals(
        brush,
        petals.current,
        sky,
        colour,
        openingOnScreen(frameFor(location, sky), sky),
      );
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [colour, isAwake, isDrawing, isStill, location]);

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
