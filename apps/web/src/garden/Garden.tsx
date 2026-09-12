import Box from '@mui/material/Box';
import { type ReactNode, useMemo, useState } from 'react';

import { LAYERS, layerSx } from './canvas-layer';
import {
  DEFAULT_AIR,
  type GardenAir,
  type GardenControls,
  GardenControlsContext,
  type SceneId,
} from './garden-controls';
import { GardenScene } from './GardenScene';
import { PetalLayer } from './PetalLayer';
import { VEIL } from './scene-palette';

/**
 * The garden the whole app is drawn in front of: one of three pictures, the
 * weather over it, and the dimming that lets an interface be read off both.
 *
 * The place used to be one continuous painted world with a camera flying
 * between four points of it (issue #115, ADR 0031). Issue #152 replaces the
 * painting with three photographs — the gate, the doors and the hall — and
 * the camera with a picture being shown instead of another: a screen says
 * which of the three it stands in front of, and `GardenScene` shows that one.
 * Issue #153 gives the change between them the one standard transition — an
 * 1800ms crossfade, a slow forward push, a warm bloom and the temple's own
 * red opening out of the middle (`scene-transition.ts`) — which this
 * component holds the state for and `GardenScene` plays. It runs on a change
 * of scene and not on a change of screen: `scene` lives in a `useState` here,
 * so two screens standing on the same picture do not change it and nothing
 * below re-renders for them at all.
 *
 * Petals fall over all of it except the one screen a game is played on, and
 * they never stop or reset for a change of picture — they are a canvas of
 * their own that knows nothing about which scene is underneath it
 * (`PetalLayer.tsx`, `handoffs/scenes/README.md`). What a finished game is
 * greeted with is not here at all: the hall has no sky in it, so the greeting
 * is a cloth the room lays over its own table ({@link RewardCloth}).
 *
 * The scene starts as `null`, not as a guess. Every screen that stands here
 * says which picture it wants — `/create` on its own mount, a room through
 * {@link useRoomGarden} — and until one of them has, {@link GardenScene} draws
 * nothing rather than a default that might be wrong. A default of `gate` used
 * to mean a cold `/room/<id>` fetched the gate's picture in full before the
 * room's own lazy chunk had even finished loading, on top of whichever
 * picture that room turned out to need (issue #152's own second finding).
 *
 * All the layers are mounted outside the shift, so that they are one garden
 * for as long as a session stays among the screens that share it rather than
 * one per page: a background that started again every time an address
 * changed within them would be a page reloading, said in petals. It is also
 * why they cannot live any lower down at all — a `transform` makes a
 * containing block of its own, and `position: fixed` inside one is fixed to
 * the animation rather than to the window
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * It does not wrap every route. `/` stands on its own photograph and creates
 * no extra picture underneath it (`scenes/GateScene.tsx`, issue #151), so
 * `App.tsx` mounts this component for every other route and leaves the gate
 * outside it — one garden for the eight screens that still share one, rather
 * than a picture nobody there is looking at.
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
  const [scene, setScene] = useState<SceneId | null>(null);

  // Built once, so that nothing below re-runs an effect because the garden was
  // handed to it again — and every one of those effects is something that says
  // what the garden should be doing.
  const controls = useMemo<GardenControls>(() => ({ showAir: setAir, showScene: setScene }), []);

  return (
    <GardenControlsContext value={controls}>
      <GardenScene scene={scene} />
      <PetalLayer air={air} />

      {/* The place, put down under the interface. One dimming over the whole
        picture rather than a plate behind every sentence: a plate a line would
        cut the place into pieces, and this leaves it a place. */}
      <Box aria-hidden sx={{ ...layerSx(LAYERS.veil), backgroundColor: VEIL }} />

      {children}
    </GardenControlsContext>
  );
};
