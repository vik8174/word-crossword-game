import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState } from 'react';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { DOORS_AVIF, DOORS_JPG } from '../scenes/doors-scene-paths';
import { GATE_AVIF, GATE_JPG } from '../scenes/gate-scene-paths';
import { HALL_AVIF, HALL_JPG } from '../scenes/hall-scene-paths';
import { LAYERS, layerSx } from './canvas-layer';
import type { SceneId } from './garden-controls';
import { SCENE } from './scene-palette';
import {
  KEN_BURNS_PUSH,
  SCENE_ARRIVES,
  SCENE_BLOOM_SX,
  SCENE_FADE_MS,
  SCENE_LEAVES,
  SCENE_SUN_SX,
} from './scene-transition';

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

/** What a picture on the page is doing in the transition around it. */
type PictureRole = 'settled' | 'arriving' | 'leaving';

/** A picture the garden has shown, and which instance of showing it this is. */
interface ShownPicture {
  readonly id: SceneId;
  /**
   * Which time this picture was shown, not which picture it is.
   *
   * Used as the React key of the element this picture is drawn in, so that
   * showing `doors` again later — `connecting` to `join` to `lobby`, the
   * ordinary way a guest joins a room, having stood on `gate` in between —
   * mounts a fresh element rather than reusing the one from the session's
   * first picture. A fresh element is a fresh `animation`, which is this
   * component's answer to the prototype's "replay the bloom and the sun,
   * remove the class, force a reflow, add it back" — React already
   * guarantees a new element the browser has never animated before, so
   * there is nothing left to force by hand.
   */
  readonly generation: number;
}

/**
 * One picture, pushed forward and drawn with whichever crossfade its role
 * calls for.
 *
 * The push and the fade are two different `animation`s on two different boxes
 * on purpose: one shorthand property cannot hold both a fade
 * ({@link SCENE_ARRIVES}/{@link SCENE_LEAVES}, on the outer box) and a
 * 26-second push ({@link KEN_BURNS_PUSH}, on the inner one) without one
 * silently overwriting the other.
 *
 * @param props.id - Which picture to draw
 * @param props.role - Whether it is arriving, leaving, or simply the one
 * being shown with nothing moving around it
 * @param props.pushed - Whether the picture pushes forward at all; `false`
 * under `prefers-reduced-motion`, where a scene changes without travelling
 */
const ScenePictureLayer = ({
  id,
  role,
  pushed,
}: {
  readonly id: SceneId;
  readonly role: PictureRole;
  readonly pushed: boolean;
}) => {
  const picture = SCENES[id];
  const fade = role === 'arriving' ? SCENE_ARRIVES : role === 'leaving' ? SCENE_LEAVES : undefined;

  return (
    <Box
      data-scene-role={role}
      sx={{ position: 'absolute', inset: 0, opacity: role === 'leaving' ? 1 : undefined, ...fade }}
    >
      <Box
        data-pushed={pushed}
        sx={{ position: 'absolute', inset: 0, ...(pushed ? KEN_BURNS_PUSH : undefined) }}
      >
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
    </Box>
  );
};

/**
 * The warm bloom and the opening sun, played once for a real change of scene
 * and never for the picture that was already standing when the session
 * started.
 *
 * A fresh instance per transition, given a key by the caller for the same
 * reason {@link ShownPicture} keys its own picture by generation: mounted
 * anew every time `GardenScene` gives it a new one, which is what lets the
 * same two animations replay a second time in the same session rather than
 * being found already spent — `connecting` to `join` to `lobby`, the
 * ordinary way a guest joins a room, plays both crossfades back to back.
 */
const SceneLight = () => (
  <>
    <Box aria-hidden sx={SCENE_BLOOM_SX} />
    <Box aria-hidden sx={{ ...SCENE_SUN_SX, backgroundColor: SCENE.vermilion }} />
  </>
);

/**
 * The picture standing behind the app: one of three, full-bleed and cropped to
 * the window, crossfading into the next one whenever the picture itself
 * changes.
 *
 * A plain `<img>` rather than a canvas, because there is nothing left to paint
 * — the forest, the temple and the hall are photographs now, not a few
 * thousand brush strokes (issue #152). Which one is shown is still decided by
 * `garden-controls.ts`/`use-room-garden.ts`; `object-fit: cover` is what
 * `GateScene.tsx` already draws `/` with, so a percentage measured against one
 * of these pictures (`scenes/gate-chrome.ts`) is a percentage measured against
 * exactly what this component shows.
 *
 * **A change of scene now plays the one standard transition** — an 1800ms
 * crossfade, a 26-second forward push, a warm bloom and the temple's own red
 * opening out of the middle (`scene-transition.ts`, issue #153) — and it plays
 * only on a change of *scene*: two screens standing on the same picture
 * (`create` and `create/errors`, say) never reach the branch below at all,
 * because `Garden.tsx` holds `scene` in a `useState` and React does not
 * re-render for a value set to what it already is. The guard here is a second
 * line of the same defence, for anything that reads `scene` some other way.
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
 * The picture that does not crossfade in is not an edge case about the start
 * of a session: `Garden` mounts fresh every time `/` is left — `App.tsx`
 * mounts it for every route but the landing page — so this is what happens on
 * **every arrival from the landing page**, the ordinary way into the app
 * rather than a rare first visit. That picture has nothing behind it to fade
 * from, `scene` having been `null` rather than another picture, but it
 * pushes forward from the moment it appears, the same as every picture after
 * it. [Issue #166](https://github.com/vik8174/word-crossword-game/issues/166)
 * is where `/` joins this component, and this is the sentence it will make
 * untrue.
 *
 * @param props.scene - Which of the three pictures to show, or `null` before
 * anything has said
 */
export const GardenScene = ({ scene }: { readonly scene: SceneId | null }) => {
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const [shown, setShown] = useState<ShownPicture | null>(null);
  const [leaving, setLeaving] = useState<ShownPicture | null>(null);

  if (scene !== null && scene !== shown?.id) {
    // A real change of scene: the picture asked for is not the one already
    // shown. Two screens of the same picture never reach this branch, because
    // `scene` itself does not change value for them.
    //
    // The generation is derived from the state this render already has,
    // rather than counted in a ref, so that showing the same picture twice —
    // `connecting` to `join` and back to `lobby`, doors to gate and back to
    // doors, which is the ordinary way a guest joins a room — never risks the
    // second `doors` being reconciled against the element the first one left
    // behind. A ref bumped here would still work, but would be a value
    // mutated during render for no reason: everything this needs is already
    // sitting in `shown`.
    const generation = (shown?.generation ?? 0) + 1;

    if (shown !== null && !isStill) {
      setLeaving(shown);
    }

    setShown({ id: scene, generation });
  }

  useEffect(() => {
    if (leaving === null) {
      return undefined;
    }

    // The crossfade's own duration, imported rather than repeated: after this
    // the outgoing picture has faded out and is taken off the page, which is
    // what frees it from a 26-second `animation` it no longer needs to keep
    // running while invisible.
    const timer = window.setTimeout(() => setLeaving(null), SCENE_FADE_MS);

    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (shown === null) {
    return null;
  }

  return (
    <Box aria-hidden sx={{ ...layerSx(LAYERS.scene), overflow: 'hidden' }}>
      {leaving !== null && (
        <ScenePictureLayer
          key={`picture-${leaving.generation}`}
          id={leaving.id}
          role="leaving"
          pushed={!isStill}
        />
      )}
      <ScenePictureLayer
        key={`picture-${shown.generation}`}
        id={shown.id}
        role={leaving !== null ? 'arriving' : 'settled'}
        pushed={!isStill}
      />
      {leaving !== null && <SceneLight key={`light-${shown.generation}`} />}
    </Box>
  );
};
