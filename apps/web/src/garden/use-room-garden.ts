import { useEffect, useRef, useState } from 'react';

import type { RoomScreen } from '../rooms/room-screen';
import { DEFAULT_AIR, useGardenControls } from './garden-controls';
import { DEFAULT_LOCATION, locationFor } from './locations';
import { airFor, isGreeting } from './room-air';

/**
 * The garden behind a room, told what the room is doing and where it is
 * happening — and the one thing it tells the room back.
 *
 * Called once, from above the switch that renders the screens, and that is the
 * whole of why it is a hook rather than something each screen does for itself.
 * While a screen is giving way to the next one there are two of them on the
 * page at once ({@link ScreenShift}), so a game and a finished game would each
 * be saying what the air should be, and the one leaving would have the last
 * word — an ending switched off by the screen it was ending.
 *
 * The screen it was last given is remembered here because the end of a game is
 * a change and not a state: `finished` is true forever, a completed room being
 * terminal, so a room that woke to the screen would wake again on every reload
 * (`docs/decisions/0030-where-movement-is-allowed.md`). That memory is the
 * reason this hook answers rather than only telling: what a finished game is
 * greeted with is no longer anything the garden does — the hall has no sky in
 * it — so the room lays a cloth over its own table instead, and this is where
 * the one moment it does so is known
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * Where the screen stands is told from here for a third reason of its own: two
 * of the seven screens have no place of their own, and `locationFor` says so by
 * answering `null`. A room that cannot be reached is news about the room and
 * not a journey, so the garden is left standing wherever it already was — which
 * for an invite link opened cold is the gate, and for a room that expired
 * mid-game is the hall it expired in.
 *
 * @param kind - Which of the room's screens is showing
 * @returns Whether the game ended while this session was watching
 *
 * @example
 * const hasEnded = useRoomGarden(screen.kind);
 */
export const useRoomGarden = (kind: RoomScreen['kind']): boolean => {
  const { showAir, showLocation } = useGardenControls();
  const shown = useRef<RoomScreen['kind'] | null>(null);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const before = shown.current;
    const location = locationFor(kind);

    shown.current = kind;
    showAir(airFor(kind));

    if (location !== null) {
      showLocation(location);
    }

    if (isGreeting(before, kind)) {
      setHasEnded(true);
    }
  }, [kind, showAir, showLocation]);

  // A room is the only place in this app where the air is anything but petals
  // and the window stands anywhere but at the gate, so leaving one takes both
  // of its rules with it: an address opened after a game would otherwise
  // inherit the stillness of a board that is no longer there, and the inside of
  // a temple nobody is in.
  useEffect(
    () => () => {
      showAir(DEFAULT_AIR);
      showLocation(DEFAULT_LOCATION);
    },
    [showAir, showLocation],
  );

  return hasEnded;
};
