import { useEffect, useRef } from 'react';

import type { RoomScreen } from '../rooms/room-screen';
import { DEFAULT_AIR, useGardenControls } from './garden-controls';
import { airFor, isGreeting } from './room-air';

/**
 * The garden behind a room, told what the room is doing.
 *
 * Called once, from above the switch that renders the screens, and that is the
 * whole of why it is a hook rather than something each screen does for itself.
 * While a screen is giving way to the next one there are two of them on the
 * page at once ({@link ScreenShift}), so a game and a finished game would each
 * be saying what the air should be, and the one leaving would have the last
 * word — a greeting switched off by the screen it was greeting.
 *
 * The screen it was last given is remembered here because the greeting is a
 * change and not a state: `finished` is true forever, a completed room being
 * terminal, so a garden that woke to the screen would wake again on every
 * reload (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * @param kind - Which of the room's screens is showing
 *
 * @example
 * useRoomGarden(screen.kind);
 */
export const useRoomGarden = (kind: RoomScreen['kind']): void => {
  const { showAir, greet } = useGardenControls();
  const shown = useRef<RoomScreen['kind'] | null>(null);

  useEffect(() => {
    const before = shown.current;

    shown.current = kind;
    showAir(airFor(kind));

    if (isGreeting(before, kind)) {
      greet();
    }
  }, [greet, kind, showAir]);

  // A room is the only place in this app where the air is anything but petals,
  // so leaving one takes its rules with it: an address opened after a game
  // would otherwise inherit the stillness of a board that is no longer there.
  useEffect(() => () => showAir(DEFAULT_AIR), [showAir]);
};
