// This file has no HMR boundary of its own — it is Storybook's own preview
// config, never a route Vite's fast-refresh plugin reloads in place — so the
// rule's "one component per file" heuristic does not apply to three decorator
// functions exported together on purpose.
/* eslint-disable react-refresh/only-export-components */
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { Decorator } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { LAYERS, layerSx } from '../src/garden/canvas-layer';
import type { SceneId } from '../src/garden/garden-controls';
import { GardenScene } from '../src/garden/GardenScene';
import { VEIL } from '../src/garden/scene-palette';
import { theme } from '../src/theme';

/** Where a story picks its scene backdrop: the `scene` story parameter. */
export interface SceneParameters {
  readonly scene?: SceneId;
}

/**
 * The picture a page stands over in the running app, held fixed instead of
 * asked for by the component through `useGardenControls`.
 *
 * `GardenControlsContext` already defaults to `NO_GARDEN` for exactly this —
 * "a screen rendered on its own" (`garden/garden-controls.ts`) — so a story
 * needs no provider at all: `showScene` calls from `HomePage`/`CreateRoomPage`
 * on mount are silently absorbed, and this decorator paints the picture
 * instead. Reusing `GardenScene` rather than a plain `<img>` is deliberate —
 * it is the very component every route stands on, `<picture>` with the
 * AVIF/JPEG pair and all, so a story shows the same background the template
 * comparison in #184/#185 is measured against. Mounted once with a fixed
 * `scene`, it renders the settled picture directly: `shown` starts `null`, so
 * the first and only change of `scene` never has a previous picture to
 * crossfade from.
 *
 * The veil is painted beside it for the same reason `Garden.tsx` always pairs
 * the two: every page's contrast (`garden/scene-surface.ts`'s `ON_SCENE_SX`)
 * is measured against the picture *with* the veil over it, never against the
 * raw photograph. Petals and the greeting cloth are not: neither issue #184
 * nor #185 needs weather or timers behind a story, and `GardenScene` alone is
 * what "the way `GardenScene` does" in the issue calls for.
 *
 * @param props.scene - Which of the three pictures to stand the story over
 * @param props.children - The story
 */
const SceneBackdrop = ({
  scene,
  children,
}: {
  readonly scene: SceneId;
  readonly children: ReactNode;
}) => (
  <>
    <GardenScene scene={scene} />
    <Box aria-hidden sx={{ ...layerSx(LAYERS.veil), backgroundColor: VEIL }} />
    {children}
  </>
);

/** The MUI theme every page renders in, wired up the same way `App.tsx` does. */
export const withTheme: Decorator = (Story) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Story />
  </ThemeProvider>
);

/**
 * A router in memory, for the pages that read or write one — `HomePage`'s
 * link to `/create`, `CreateRoomPage`'s `useNavigate`. Global rather than
 * per-story: every page in this app is reached through `BrowserRouter` in
 * production, and a component that called a router hook with none mounted
 * would throw before it painted anything.
 */
export const withMemoryRouter: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
);

/**
 * The scene picture a page or a component stands over, chosen per story with
 * the `scene` parameter and defaulting to the gate — the picture `HomePage`
 * and `CreateRoomPage` both claim.
 *
 * @example
 * export const Default: Story = { parameters: { scene: 'doors' } };
 */
export const withScene: Decorator = (Story, context) => {
  const { scene = 'gate' } = context.parameters as SceneParameters;

  return (
    <SceneBackdrop scene={scene}>
      <Story />
    </SceneBackdrop>
  );
};
