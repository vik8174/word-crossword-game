import Box from '@mui/material/Box';
import { type ReactNode, useMemo, useState } from 'react';

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

/**
 * The garden the whole app is drawn in front of: a place, the weather in it,
 * and the dimming that lets an interface be read off both.
 *
 * The place is a forest with a temple in it, and every screen of this app
 * stands somewhere in it (see {@link locationFor}). That is not decoration: the
 * lobby is the doors of the temple, a game is the hall behind them, and going
 * from one to the other is going somewhere rather than replacing a page. The
 * places change instantly in this release; what moves between them is the next
 * ticket.
 *
 * Petals fall over all of it except the one screen a game is played on, and
 * never inside the doorway. The silence during a game is what makes the petals
 * coming back at the end a greeting, which is why no separate celebration is
 * built anywhere (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * All three layers are mounted here, above the router and outside the shift, so
 * that they are one canvas for the life of the tab rather than one per page: a
 * background that started again every time an address changed would be a page
 * reloading, said in petals. It is also why they cannot live any lower down at
 * all — a `transform` makes a containing block of its own, and `position: fixed`
 * inside one is fixed to the animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
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
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [greeting, setGreeting] = useState(0);

  // Built once, so that nothing below re-runs an effect because the garden was
  // handed to it again — and every one of those effects is something that says
  // what the garden should be doing.
  const controls = useMemo<GardenControls>(
    () => ({
      showAir: setAir,
      showLocation: setLocation,
      greet: () => setGreeting((given) => given + 1),
    }),
    [],
  );

  return (
    <GardenControlsContext value={controls}>
      <SceneLayer location={location} />
      <PetalLayer air={air} greeting={greeting} location={location} />

      {/* The place, put down under the interface. One dimming over the whole
        picture rather than a plate behind every sentence: a plate a line would
        cut the place into pieces, and this leaves it a place. */}
      <Box aria-hidden sx={{ ...layerSx(LAYERS.veil), backgroundColor: VEIL }} />

      {children}
    </GardenControlsContext>
  );
};
