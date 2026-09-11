import Box from '@mui/material/Box';

import { VEIL } from '../garden/scene-palette';

/** Where the shipped gate images live, cut fresh from the source PNG (issue #151). */
const GATE_AVIF = '/scenes/gate.avif';
const GATE_JPG = '/scenes/gate.jpg';

/**
 * The gate itself: a photograph rather than a place painted stroke by stroke.
 *
 * `/` used to stand on the same canvas every other screen still does — the
 * forest `SceneLayer` paints from `world.ts`, with a camera that could in
 * principle travel to it. Issue #151 takes the landing page off that canvas
 * entirely: no `<canvas>` is created on this route, and what stands behind the
 * interface here is `gate.avif` (with a JPEG fallback for a browser that
 * cannot decode it), full-bleed and cropped to the window by `object-fit:
 * cover` rather than panned to it. `garden/` goes on painting the same forest
 * for `/create`, `/join` and every screen of a room — this component is not a
 * second way of drawing that place, it is the one route that no longer stands
 * in it.
 *
 * The veil is the one piece the two share on purpose: {@link VEIL} is the
 * general answer to reading an interface off a picture, painted or
 * photographed, and a dedicated copy of the same rgba value here would be the
 * one thing this ticket was told not to invent twice.
 *
 * Sized to the stage it is drawn in — `position: fixed`, the full viewport —
 * so that a percentage against that stage (see `gate-chrome.ts`) is a
 * percentage against exactly what the image covers, with nothing letterboxed
 * on any side.
 */
export const GateScene = () => (
  <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' }}>
    <picture>
      <source srcSet={GATE_AVIF} type="image/avif" />
      <Box
        component="img"
        src={GATE_JPG}
        alt=""
        sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </picture>
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: VEIL }} />
  </Box>
);
