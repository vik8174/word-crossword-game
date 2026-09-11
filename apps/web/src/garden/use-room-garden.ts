import { useEffect, useRef, useState } from 'react';

import type { RoomScreen } from '../rooms/room-screen';
import { DEFAULT_AIR, DEFAULT_SCENE, type SceneId, useGardenControls } from './garden-controls';
import { airFor, isGreeting } from './room-air';

/**
 * Which picture a room's screen stands in front of.
 *
 * Written as a switch over every kind, with no `default`, for the same reason
 * `airFor` is: a screen added to `RoomScreen` and not placed here fails to
 * compile. Unlike the world this replaces (issue #152), every screen has a
 * picture of its own — there is no screen left that stands "wherever the
 * garden already was", because there is no travelling between the pictures
 * for one to stand still in the middle of.
 *
 * `connecting` and `unavailable` go to `doors` rather than to `gate`: both are
 * what a visitor sees while the room decides whether to let them in, which is
 * the temple's threshold rather than the way in from outside
 * (`handoffs/scenes/README.md`).
 *
 * @param kind - Which screen the room is showing
 * @returns The picture it stands in front of
 *
 * @example
 * sceneFor('playing'); // 'hall' — inside, with the board on the shoji
 * sceneFor('connecting'); // 'doors' — waiting at the threshold
 */
const sceneFor = (kind: RoomScreen['kind']): SceneId => {
  switch (kind) {
    case 'connecting':
    case 'unavailable':
    case 'lobby':
      return 'doors';
    case 'join':
      return 'gate';
    case 'playing':
    case 'finished':
    case 'closed-early':
      return 'hall';
  }
};

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
 * greeted with is no longer anything the garden does — the reward is a cloth
 * the room lays over its own table instead, and this is where the one moment
 * it does so is known
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * @param kind - Which of the room's screens is showing
 * @returns Whether the game ended while this session was watching
 *
 * @example
 * const hasEnded = useRoomGarden(screen.kind);
 */
export const useRoomGarden = (kind: RoomScreen['kind']): boolean => {
  const { showAir, showScene } = useGardenControls();
  const shown = useRef<RoomScreen['kind'] | null>(null);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const before = shown.current;

    shown.current = kind;
    showAir(airFor(kind));
    showScene(sceneFor(kind));

    if (isGreeting(before, kind)) {
      setHasEnded(true);
    }
  }, [kind, showAir, showScene]);

  // A room is the only place in this app where the air is anything but petals
  // and the picture is anything but the gate, so leaving one takes both of its
  // rules with it: an address opened after a game would otherwise inherit the
  // stillness of a board that is no longer there, and the inside of a temple
  // nobody is in.
  useEffect(
    () => () => {
      showAir(DEFAULT_AIR);
      showScene(DEFAULT_SCENE);
    },
    [showAir, showScene],
  );

  return hasEnded;
};
