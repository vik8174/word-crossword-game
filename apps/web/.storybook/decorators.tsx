// This file has no HMR boundary of its own — it is Storybook's own preview
// config, never a route Vite's fast-refresh plugin reloads in place — so the
// rule's "one component per file" heuristic does not apply to three decorator
// functions exported together on purpose.
/* eslint-disable react-refresh/only-export-components */
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import { STREET } from '../src/street';
import { theme } from '../src/theme';

/**
 * The ground every story stands on: `duck`, the page's own colour, painted over
 * the whole window and behind the story.
 *
 * It is drawn by a layer of its own rather than left to `CssBaseline`'s body
 * colour so that a story reads the ground it will have in the app wherever the
 * workshop puts it, and so that a story's own `position: fixed` root is still
 * standing on something. The layer is fixed and behind everything, the way the
 * garden's picture was.
 */
const Ground = () => (
  <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: STREET.duck }} />
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
 * `duck` behind every story, instead of the garden's picture.
 *
 * @example
 * decorators: [withTheme, withMemoryRouter, withGround]
 */
export const withGround: Decorator = (Story) => (
  <>
    <Ground />
    <Story />
  </>
);
