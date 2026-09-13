import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useLayoutEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useGardenControls } from '../garden/garden-controls';
import { GATE_BAND_WIDTH, ON_SCENE_SX, fullHeightBandSx } from '../garden/scene-surface';
import { gapAt } from '../scale';

/** The step of the row this page keeps between its column and the band's own edge. */
const PAGE_PADDING_STEP = 4;
const PAGE_PADDING = gapAt(PAGE_PADDING_STEP);

/**
 * How wide the column standing on the band is: the gate's band
 * (`garden/scene-surface.ts`'s `GATE_BAND_WIDTH`), less this page's own
 * padding either side of it — the same arithmetic `/create` runs for its own
 * column (`pages/CreateRoomPage.tsx`'s `COLUMN_WIDTH`). Kept as this page's
 * own copy rather than a shared export: the two pages read the same sign for
 * a different reason each (one a form, one an apology), and nothing here
 * requires them to move together.
 */
const COLUMN_WIDTH = `calc(${GATE_BAND_WIDTH} - ${PAGE_PADDING} - ${PAGE_PADDING})`;

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
 * not be readable otherwise. Its own column is sized to what the band leaves
 * inside its hairlines (`COLUMN_WIDTH`, below) rather than to a fixed
 * breakpoint, so the text never reaches past the band onto the picture.
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
    <Box
      component="main"
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        px: PAGE_PADDING_STEP,
        py: 7,
        ...ON_SCENE_SX,
      }}
    >
      <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />

      {/* Sized to what the band leaves inside its own hairlines, the way
        `CreateRoomPage.tsx`'s own column is: an unrestricted column stays as
        wide as the page, so past about 600px it started 17.5px outside the
        band's inner edge on cream text drawn straight over the photograph. */}
      <Box sx={{ position: 'relative', width: '100%', maxWidth: COLUMN_WIDTH, mx: 'auto' }}>
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
      </Box>
    </Box>
  );
};
