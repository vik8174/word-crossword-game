import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { SCENE, SCENE_INK_DIM } from '../garden/scene-palette';
import { SENTENCE_BAND_SX } from '../garden/scene-surface';

/**
 * What the crossword is called, wherever it is named.
 *
 * It is a component of its own because two screens say it and they say it in
 * different places. In the hall the board is on the screen and this stands over
 * it; at the doors of the temple there is no board yet — the doorway in the
 * middle of that screen is what the camera flies through, so nothing of the
 * interface may stand in it — and this is all there is of the crossword, in the
 * band at the side (issue #115).
 *
 * The id is exported with it so that neither of them writes the string down a
 * second time: whatever holds this is the region the crossword is named by.
 */

/** What the region holding a crossword is named by. */
export const CROSSWORD_HEADING_ID = 'grid-heading';

/**
 * The one line that says what the crossword is: its name, and what its squares
 * are for right now.
 *
 * One line rather than a heading with a paragraph under it. Both of them say
 * what the board is, and both of them were being paid for out of the board's own
 * height (issue #101); side by side they cost a single line on a screen with the
 * room for it, and wrap into the two they always were on one without.
 *
 * @param props.caption - What the squares are for right now — see `rooms/grid-caption.ts`
 *
 * @example
 * <CrosswordHeading caption={openGridCaption(6)} />
 */
export const CrosswordHeading = ({ caption }: { readonly caption: string }) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: 2,
      ...SENTENCE_BAND_SX,
    }}
  >
    <Typography id={CROSSWORD_HEADING_ID} variant="h2" component="h2" sx={{ color: SCENE.cream }}>
      The crossword
    </Typography>
    <Typography variant="body2" sx={{ color: SCENE_INK_DIM }}>
      {caption}
    </Typography>
  </Box>
);
