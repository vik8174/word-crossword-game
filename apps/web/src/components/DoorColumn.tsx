import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { gateSceneSx, gateScreenSx, gateStackSx } from './gate-panel-styles';
import { BLOCK_PROPS, BLOCKS_PROPS } from './screen-blocks';
import { Street } from './Street';
import { joinStreetLabel } from './street-labels';
import { UNSEEN_HEADING } from './surface-styles';

interface DoorColumnProps {
  /** The street drawn above the column: a `Street` with its own label. */
  readonly picture: ReactNode;
  /**
   * A name for the page that is read aloud and not shown, for a screen whose
   * visible text has no heading of its own. Leave it out where the screen draws
   * its own `h1`.
   */
  readonly unseenHeading?: string;
  /** The blocks of the screen, in the order they are read. */
  readonly children: ReactNode;
}

/**
 * The column every screen at a room's door stands in: the street drawn above
 * it, then the blocks of the screen 18px apart.
 *
 * `.column` of `design/templates/state-tree.html` (lines 253-255) with
 * `.column .scene` and `.stack`: at most 560px wide and centred, starting at the
 * top under the frame's header and not centred in the window, so where the
 * drawing stands does not depend on how much stands under it and does not move
 * between the states of a screen (issue #226). `connecting`, `join`, each of the
 * seven refusals and the not-found page stand in it.
 *
 * @param props.picture - The street, above the column
 * @param props.unseenHeading - The name a reader is given when the screen shows no `h1`
 * @param props.children - The blocks under the drawing
 *
 * @example
 * <DoorColumn picture={<RefusalStreet />} unseenHeading="Game room">…</DoorColumn>
 */
export const DoorColumn = ({ picture, unseenHeading, children }: DoorColumnProps) => (
  <Box component="main" sx={gateScreenSx}>
    {unseenHeading !== undefined && (
      <Typography component="h1" variant="h1" sx={UNSEEN_HEADING}>
        {unseenHeading}
      </Typography>
    )}

    <Box {...BLOCK_PROPS} sx={gateSceneSx}>
      {picture}
    </Box>

    <Box {...BLOCKS_PROPS} sx={gateStackSx}>
      {children}
    </Box>
  </Box>
);

/**
 * The drawing over `connecting`: a neighbour waving across the street to an
 * empty balcony (`?state=connecting` of the template, line 898).
 */
export const ConnectingStreet = () => (
  <Street
    right="empty"
    line="none"
    mood="wave"
    crop="top"
    label="A neighbour waving across the street to an empty balcony"
  />
);

interface JoinStreetProps {
  /**
   * In a lesson, how the teacher is drawn at the end of the street: at their
   * window while their mark is fresh as the visitor sees it, with the curtains
   * drawn once it is old. Left out for a pair game, where the shutters stay
   * closed.
   */
  readonly teacher?: 'here' | 'away';
}

/**
 * The drawing over `join` in all three of its states: a neighbour waving from
 * her balcony waving to the empty one across the street
 * (`?state=join` of the template, line 907).
 *
 * In a lesson the teacher is at the end of the street, and the label says so
 * while they are at their window (`street-labels.ts`).
 *
 * @param props.teacher - How the teacher is drawn, in a lesson
 */
export const JoinStreet = ({ teacher }: JoinStreetProps) => (
  <Street
    right="empty"
    line="none"
    mood="wave"
    crop="top"
    teacher={teacher}
    label={joinStreetLabel(teacher)}
  />
);

/**
 * The drawing over every refusal and the not-found page: a balcony across the
 * street with its shutters closed, and no line running to it
 * (`?state=unavailable/*` of the template, line 920).
 *
 * @example
 * <DoorColumn picture={<RefusalStreet />}>…</DoorColumn>
 */
export const RefusalStreet = () => (
  <Street
    right="shut"
    line="none"
    mood="calm"
    crop="top"
    label="A balcony across the street with its shutters closed"
  />
);
