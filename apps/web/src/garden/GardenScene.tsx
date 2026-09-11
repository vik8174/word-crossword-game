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
 * @param props.scene - Which of the three pictures to show
 */
export const GardenScene = ({ scene }: { readonly scene: SceneId }) => {
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
