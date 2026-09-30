import Box from '@mui/material/Box';

import { zoneHeadingSx, zoneHintSx } from './zone-styles';

/**
 * What the crossword is called, wherever it is named.
 *
 * It is a component of its own because two screens say it and they say it in
 * different places. In the hall the board is on the screen and this stands over
 * it; at the doors of the temple there is no board yet — the middle of that
 * screen is the doorway, visible in the picture itself, so nothing of the
 * interface may stand in it — and this is all there is of the crossword, in the
 * zone at the side (issue #115).
 *
 * It carries no surface of its own, which is the difference between the two
 * places. In the zone at the side there is already one and a second would
 * simply be the same darkness twice; in the middle of the window there is none,
 * so the screen that puts it there gives it one (see {@link RoomCrossword}).
 *
 * The id is exported with it so that neither of them writes the string down a
 * second time: whatever holds this is the region the crossword is named by.
 */

/** What the region holding a crossword is named by. */
export const CROSSWORD_HEADING_ID = 'grid-heading';

/**
 * What the crossword is called and what its squares are for right now: a
 * heading with a hint under it, the way every block of a zone is written
 * (`<h3>The crossword</h3>` over `<p class="hint">`, 220 by 43.5 at 1440 in
 * `design/templates/state-tree.html` line 1273).
 *
 * Stacked, and it was one line until issue #199. Issue #101 argued for one
 * line rather than a heading with a paragraph under it, because both of them
 * say what the board is and both were being paid for out of the board's own
 * height, and side by side they cost a single line on a screen with the room
 * for it. The drawing stacks them, and the drawing is what was approved: the
 * board loses about 32px of height on the screens that have one, and #200
 * measures its own box against that.
 *
 * It is a `h2` and not the template's `h3`: the page's one `h1` is the name of
 * the step, and a heading that skipped a level under it would leave somebody
 * moving through the page by headings with a gap in the outline. It is drawn
 * as the template draws the `h3`.
 *
 * @param props.caption - What the squares are for right now — see `rooms/grid-caption.ts`
 *
 * @example
 * <CrosswordHeading caption={openGridCaption(6)} />
 */
export const CrosswordHeading = ({ caption }: { readonly caption: string }) => (
  <>
    <Box component="h2" id={CROSSWORD_HEADING_ID} sx={zoneHeadingSx}>
      The crossword
    </Box>
    <Box component="p" sx={{ ...zoneHintSx, margin: 0 }}>
      {caption}
    </Box>
  </>
);
