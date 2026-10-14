import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PillButton } from '../components/PillButton';
import { fullHeightBandSx, GATE_BAND_WIDTH } from '../components/surface-styles';
import { gapAt } from '../scale';

/** The step of the row this page keeps between its column and the band's own edge. */
const PAGE_PADDING_STEP = 4;
const PAGE_PADDING = gapAt(PAGE_PADDING_STEP);

/**
 * How wide the column standing on the band is: the band
 * (`components/surface-styles.ts`'s `GATE_BAND_WIDTH`), less this page's own
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
 * link.
 *
 * Stands on a tile down the middle of the window (`fullHeightBandSx`; `join`
 * stood on it too until issue #198). Its own column is sized to what the band
 * leaves inside its hairlines (`COLUMN_WIDTH`, below) rather than to a fixed
 * breakpoint, so the text never reaches past the band onto the ground.
 *
 * @example
 * <Route path="*" element={<NotFoundPage />} />
 */
export const NotFoundPage = () => {
  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        px: PAGE_PADDING_STEP,
        py: 7,
      }}
    >
      <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />

      {/* Sized to what the band leaves inside its own hairlines: an
        unrestricted column stays as wide as the page, so past about 600px it
        would start outside the band's inner edge. */}
      <Box sx={{ position: 'relative', width: '100%', maxWidth: COLUMN_WIDTH, mx: 'auto' }}>
        <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
          This page does not exist
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The link may be incomplete or mistyped. If you were invited to a game, ask for the link
          again — it looks like <code>/room/…</code>.
        </Typography>
        <PillButton component={RouterLink} to="/" sx={{ mt: 6 }}>
          Go to the start
        </PillButton>
      </Box>
    </Box>
  );
};
