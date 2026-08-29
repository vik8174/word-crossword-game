import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import {
  DEFAULT_AIR,
  type GardenAir,
  type GardenControls,
  GardenControlsContext,
} from './garden-controls';
import { paintPetals } from './paint-petals';
import { driftPetals, fillSky, type Petal, petalsWanted, seedSky, type Sky } from './petals';
import { useDocumentVisible } from './use-document-visible';

/**
 * How long the garden takes to go, and to come back.
 *
 * Long enough that the board arrives on a background already settling rather
 * than one that snapped off behind it, and short enough to be over before
 * anybody has read the first clue.
 */
const FADE_MS = 700;

/**
 * The most a single frame is allowed to be worth, in seconds.
 *
 * A frame that took a quarter of a second — a route being fetched, a phone
 * deciding to do something else — would otherwise move every petal a quarter of
 * a second's worth at once, which reads as the sky jumping.
 */
const LONGEST_FRAME_SECONDS = 1 / 15;

/**
 * The canvas resized to the window it is drawn in, and the sky that is.
 *
 * The element is stretched by CSS and the bitmap behind it is not, so on any
 * screen with more than one device pixel to a CSS pixel the petals would be
 * drawn once and then blown up. Everything above this line works in CSS pixels
 * and the transform is what keeps it able to.
 *
 * @param element - The canvas
 * @param brush - Its drawing context
 * @returns The sky, in CSS pixels
 */
const fitToWindow = (element: HTMLCanvasElement, brush: CanvasRenderingContext2D): Sky => {
  const sky: Sky = { width: element.clientWidth, height: element.clientHeight };
  const dots = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const width = Math.round(sky.width * dots);
  const height = Math.round(sky.height * dots);

  // Assigning either of these clears the canvas, so it is done only when the
  // window has actually changed size rather than on every frame.
  if (element.width !== width || element.height !== height) {
    element.width = width;
    element.height = height;
  }

  brush.setTransform(dots, 0, 0, dots, 0, 0);

  return sky;
};

/**
 * The petals themselves: one canvas behind the whole app, and the loop that
 * draws it.
 *
 * It is behind everything and outside everything. The change from one screen of
 * a room to the next slides the screens sideways, and a background inside that
 * would slide with them — a whole garden travelling off to the left with the
 * lobby. It is also why this cannot live in there at all: a `transform` makes a
 * containing block of its own, and `position: fixed` inside one is fixed to the
 * animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * Three things switch it off, and they are three different things:
 *
 * - **Animation turned off in the operating system** takes the canvas off the
 *   page altogether. Not fewer petals and not slower ones; there is no setting
 *   in the app that overrides it, and there is not meant to be.
 * - **A game** leaves the canvas where it is and fades it out, then stops the
 *   loop once there is nothing left to see.
 * - **A tab nobody is looking at** stops the loop and leaves the last frame on
 *   the canvas, so a phone in a pocket is not drawing a garden.
 *
 * @param props.air - Whether petals are falling behind this screen
 * @param props.greeting - How many greetings have been asked for, one per game finished
 */
const PetalLayer = ({ air, greeting }: { readonly air: GardenAir; readonly greeting: number }) => {
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

      paintPetals(brush, petals.current, sky, colour);
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [colour, isAwake, isDrawing, isStill]);

  if (isStill) {
    return null;
  }

  return (
    <Box
      component="canvas"
      ref={canvas}
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        // Behind everything the app draws, and above the paper the page is
        // printed on: a negative layer is painted after the root's own
        // background and before anything in the flow above it.
        zIndex: -1,
        pointerEvents: 'none',
        opacity: air === 'petals' ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    />
  );
};

/**
 * The garden the whole app is drawn in front of.
 *
 * Petals fall behind every screen except the one a game is played on. That is
 * not a preference: the board is what its screen is for, and movement behind a
 * grid is movement in the peripheral vision of somebody who is reading letters
 * and listening to another person talk. The silence during a game is what makes
 * the petals coming back at the end a greeting, which is why no separate
 * celebration is built anywhere
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * The garden is mounted here, above the router, so that it is one canvas for
 * the life of the tab rather than one per page: a background that started again
 * every time an address changed would be a page reloading, said in petals.
 *
 * @param props.children - The app, drawn in front of it
 *
 * @example
 * <Garden>
 *   <BrowserRouter>…</BrowserRouter>
 * </Garden>
 */
export const Garden = ({ children }: { readonly children: ReactNode }) => {
  const [air, setAir] = useState<GardenAir>(DEFAULT_AIR);
  const [greeting, setGreeting] = useState(0);

  // Built once, so that nothing below re-runs an effect because the garden was
  // handed to it again — and every one of those effects is something that says
  // what the air should be.
  const controls = useMemo<GardenControls>(
    () => ({ showAir: setAir, greet: () => setGreeting((given) => given + 1) }),
    [],
  );

  return (
    <GardenControlsContext value={controls}>
      <PetalLayer air={air} greeting={greeting} />
      {children}
    </GardenControlsContext>
  );
};
