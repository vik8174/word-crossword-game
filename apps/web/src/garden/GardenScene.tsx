import Box from '@mui/material/Box';

import { DOORS_AVIF, DOORS_JPG } from '../scenes/doors-scene-paths';
import { GATE_AVIF, GATE_JPG } from '../scenes/gate-scene-paths';
import { HALL_AVIF, HALL_JPG } from '../scenes/hall-scene-paths';
import { LAYERS, layerSx } from './canvas-layer';
import type { SceneId } from './garden-controls';

/** One picture, in the two formats it ships in. */
interface ScenePicture {
  readonly avif: string;
  readonly jpg: string;
}

/**
 * The three pictures the garden switches between, keyed by {@link SceneId}.
 *
 * `gate` reuses the exact files `scenes/GateScene.tsx` draws on `/` (issue
 * #151) rather than a second copy of the same picture: `/create` and `/join`
 * stand in front of the same torii the landing page does, so a visitor who
 * has already fetched it for `/` pays nothing to see it again here.
 */
const SCENES: Record<SceneId, ScenePicture> = {
  gate: { avif: GATE_AVIF, jpg: GATE_JPG },
  doors: { avif: DOORS_AVIF, jpg: DOORS_JPG },
  hall: { avif: HALL_AVIF, jpg: HALL_JPG },
};

/**
 * The picture standing behind the app: one of three, full-bleed and cropped to
 * the window.
 *
 * A plain `<img>` rather than a canvas, because there is nothing left to paint
 * — the forest, the temple and the hall are photographs now, not a few
 * thousand brush strokes (issue #152). Swapping which one is shown is
 * therefore an attribute change rather than a redraw, and `object-fit: cover`
 * is what `GateScene.tsx` already draws `/` with, so a percentage measured
 * against one of these pictures (`scenes/gate-chrome.ts`) is a percentage
 * measured against exactly what this component shows.
 *
 * The swap is instant on purpose. A crossfade between two scenes is the next
 * ticket's to build (#153); this one only has to stop painting a world that no
 * longer exists.
 *
 * `scene` is nullable and drawing nothing when it is `null` is the point, not
 * a loading state to be tidied away. `Garden` mounts before anything has said
 * which picture it wants — a lazy route's own chunk has to arrive and render
 * before `useRoomGarden` can call `showScene` — and defaulting eagerly to
 * `gate` here used to mean every `/room/<id>` fetched the gate's picture in
 * full before ever showing it, on top of whichever picture the room actually
 * needed. Drawing nothing until a real answer arrives costs one thing instead:
 * a frame or two with no picture at all, behind a `Suspense` fallback that was
 * already covering the same frames.
 *
 * @param props.scene - Which of the three pictures to show, or `null` before
 * anything has said
 */
export const GardenScene = ({ scene }: { readonly scene: SceneId | null }) => {
  if (scene === null) {
    return null;
  }

  const picture = SCENES[scene];

  return (
    <Box aria-hidden sx={{ ...layerSx(LAYERS.scene), overflow: 'hidden' }}>
      <picture>
        <source srcSet={picture.avif} type="image/avif" />
        <Box
          component="img"
          src={picture.jpg}
          alt=""
          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </picture>
    </Box>
  );
};
