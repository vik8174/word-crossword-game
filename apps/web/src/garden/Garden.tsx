import Box from '@mui/material/Box';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { LAYERS, layerSx } from './canvas-layer';
import {
  DEFAULT_AIR,
  type GardenAir,
  type GardenControls,
  GardenControlsContext,
} from './garden-controls';
import { DEFAULT_LOCATION, type Location } from './locations';
import { PetalLayer } from './PetalLayer';
import { VEIL } from './scene-palette';
import { SceneLayer } from './SceneLayer';
import { useCamera } from './use-camera';

/**
 * The garden the whole app is drawn in front of: a place, the weather in it,
 * the dimming that lets an interface be read off both, and the one camera that
 * moves between the places.
 *
 * The place is a forest with a temple in it, and every screen of this app stands
 * somewhere in it (see {@link locationFor}). That is not decoration: the lobby
 * is the doors of the temple, a game is the hall behind them, and going from one
 * to the other is a camera travelling and getting closer rather than a page
 * being replaced. Walking into the temple needs no second scene at all — the
 * hall is painted inside the doorway, so arriving is a magnification
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * The interface is taken off the screen while the camera travels and put back
 * as it arrives, and that is what this component's own element is for: one
 * `opacity`, set from inside the camera's frame rather than rendered, because a
 * journey rendered sixty times a second would spend the frames it is made of.
 * The screen ahead is already mounted and laid out by then — it is the screen
 * changing that starts the camera, so being ready is not a promise anything has
 * to keep, it is the order things happen in.
 *
 * Petals fall over all of it except the one screen a game is played on, and
 * never inside the doorway (`docs/decisions/0030-where-movement-is-allowed.md`).
 * What a finished game is answered with is no longer here: the hall has no sky
 * in it, so the weather cannot greet anybody indoors, and the greeting is a
 * cloth the room lays over its own table ({@link RewardCloth}).
 *
 * All the layers are mounted outside the shift, so that they are one canvas
 * for as long as a session stays among the screens that share it rather than
 * one per page: a background that started again every time an address
 * changed within them would be a page reloading, said in petals. It is also
 * why they cannot live any lower down at all — a `transform` makes a
 * containing block of its own, and `position: fixed` inside one is fixed to
 * the animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * It no longer wraps every route. `/` stands on its own photograph now and
 * creates no canvas at all (`scenes/GateScene.tsx`, issue #151), so `App.tsx`
 * mounts this component for every other route and leaves the gate outside it
 * — one canvas for the eight screens that still share a place, rather than a
 * canvas nobody there is looking at.
 *
 * @param props.children - The app, drawn in front of it
 *
 * @example
 * <Garden>
 *   <Routes>…</Routes>
 * </Garden>
 */
export const Garden = ({ children }: { readonly children: ReactNode }) => {
  const [air, setAir] = useState<GardenAir>(DEFAULT_AIR);
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const camera = useCamera(location);
  const screen = useRef<HTMLDivElement>(null);

  // Built once, so that nothing below re-runs an effect because the garden was
  // handed to it again — and every one of those effects is something that says
  // what the garden should be doing.
  const controls = useMemo<GardenControls>(
    () => ({ showAir: setAir, showLocation: setLocation }),
    [],
  );

  useEffect(
    () =>
      camera.onFrame(() => {
        const element = screen.current;

        if (element !== null) {
          element.style.opacity = String(camera.screenOpacity());
        }
      }),
    [camera],
  );

  return (
    <GardenControlsContext value={controls}>
      <SceneLayer camera={camera} />
      <PetalLayer air={air} camera={camera} />

      {/* The place, put down under the interface. One dimming over the whole
        picture rather than a plate behind every sentence: a plate a line would
        cut the place into pieces, and this leaves it a place. */}
      <Box aria-hidden sx={{ ...layerSx(LAYERS.veil), backgroundColor: VEIL }} />

      {/* The app, and the one thing the camera does to it. It is a plain box
        with nothing but that opacity on it: anything else here would be a rule
        about how the application is laid out, decided in the background it
        happens to be drawn on. */}
      <Box ref={screen}>{children}</Box>
    </GardenControlsContext>
  );
};
