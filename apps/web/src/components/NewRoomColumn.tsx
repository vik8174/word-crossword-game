import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { RoomMode } from '../rooms/room-document';
import { gateScreenSx, gateStackSx } from './gate-panel-styles';
import { ModePick } from './ModePick';
import { BLOCK_PROPS } from './screen-blocks';
import { stepTitleSx } from './surface-styles';

interface NewRoomColumnProps {
  /** What the room is for: it names the step and is the card that is chosen. */
  readonly mode: RoomMode;
  /** Told the mode the owner picked. */
  readonly onModeChange: (mode: RoomMode) => void;
  /** `true` while the room is being written: the two cards stay readable and take no pick. */
  readonly isFrozen?: boolean;
  /**
   * Whether the two cards are shown. They are in every state of `/create` but
   * the one that asks about the words that did not fit, which is a question
   * about the list and not about the room (template `create/unplaced`).
   */
  readonly showsChoice?: boolean;
  /** The form, or the question, under the choice. */
  readonly children: ReactNode;
}

/**
 * The column every state of `/create` stands in: the step's title, the choice of
 * what the room is for, and whatever the state puts under them
 * (`design/templates/state-tree.html`, `createScreen` and `create/unplaced`,
 * lines 846-889).
 *
 * The title follows the choice: "New game" for a game with a friend, "New
 * lesson" for a lesson. It stands at the top of a column that starts under the
 * header, so it does not move between the states of the screen (issue #225).
 *
 * @param props.mode - What the room is for
 * @param props.onModeChange - Told the mode the owner picked
 * @param props.isFrozen - The room is being written
 * @param props.showsChoice - Whether the two cards are shown
 * @param props.children - What stands under the choice
 *
 * @example
 * <NewRoomColumn mode={mode} onModeChange={setMode}><WordListForm … /></NewRoomColumn>
 */
export const NewRoomColumn = ({
  mode,
  onModeChange,
  isFrozen = false,
  showsChoice = true,
  children,
}: NewRoomColumnProps) => (
  <Box component="main" sx={gateScreenSx}>
    <Box sx={gateStackSx}>
      <Typography
        {...BLOCK_PROPS}
        component="h1"
        variant="stepTitle"
        sx={{ ...stepTitleSx(), margin: 0 }}
      >
        {mode === 'lesson' ? 'New lesson' : 'New game'}
      </Typography>

      {showsChoice && <ModePick value={mode} onChange={onModeChange} disabled={isFrozen} />}

      {children}
    </Box>
  </Box>
);
