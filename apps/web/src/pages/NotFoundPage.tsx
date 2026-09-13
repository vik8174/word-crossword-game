import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useLayoutEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useGardenControls } from '../garden/garden-controls';
import { GATE_BAND_WIDTH, ON_SCENE_SX, fullHeightBandSx } from '../garden/scene-surface';

/**
 * Catch-all for addresses the app knows nothing about.
 *
 * Invite links are copied and pasted between chats, where they get truncated
 * and mangled; without this route such a link renders an entirely blank page
 * and the player has no idea whether the game or their browser is broken.
 *
 * A mistyped address is, more often than not, the first thing a tab does —
 * nobody browses here from inside the app, they land here cold from a broken
 * link — which is exactly the shape `HomePage.tsx` writes its own layout
 * effect for rather than a plain one: `Garden` renders nothing while its
 * `scene` is still `null`, and a passive effect runs only after the browser
 * has already painted that frame. A layout effect claims `'gate'`, and the
 * render it causes, before that paint happens, so a cold, mistyped address
 * gets the same picture behind it `/` and `/create` do instead of standing on
 * nothing for the first frames of the session.
 *
 * Stands on the same centre band `/create` and `join` do
 * (`garden/scene-surface.ts`'s `fullHeightBandSx`), since it now claims a
 * picture the same way they do: cream ink directly on the photograph would
 * not be readable otherwise.
 *
 * @example
 * <Route path="*" element={<NotFoundPage />} />
 */
export const NotFoundPage = () => {
  const { showScene } = useGardenControls();

  useLayoutEffect(() => {
    showScene('gate');
  }, [showScene]);

  return (
    <Box component="main" sx={{ position: 'relative', minHeight: '100dvh', ...ON_SCENE_SX }}>
      <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />

      <Container maxWidth="sm" sx={{ position: 'relative', py: 7 }}>
        <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
          This page does not exist
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The link may be incomplete or mistyped. If you were invited to a game, ask for the link
          again — it looks like <code>/room/…</code>.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 6 }}>
          Go to the start
        </Button>
      </Container>
    </Box>
  );
};
