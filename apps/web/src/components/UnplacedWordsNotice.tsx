import Box from '@mui/material/Box';
import type { CrosswordLayout } from 'shared';

import { gateButtonRowSx, gateStackSx } from './gate-panel-styles';
import { Message } from './Message';
import { PillButton } from './PillButton';

interface UnplacedWordsNoticeProps {
  /** Layout the room would be created from, holding both the kept and the dropped words. */
  readonly layout: CrosswordLayout;
  readonly onConfirm: () => void;
  readonly onBack: () => void;
}

/**
 * Warns the owner which words did not fit into the grid, before the room exists.
 *
 * A crossword only holds words that cross other words, so some of the list can
 * be left out. That is not an error — the game starts fine without them — but
 * the owner decides: create the room anyway, or go back and change the list
 * (user story 17).
 *
 * The two answers stand in a row, right-aligned, the quiet one first and the
 * primary one last, the way the template draws the fork (`create/unplaced`).
 * They are called "Back" and "Build it anyway" there, and short enough for one
 * row of the create panel's 416px: the earlier "Edit the word list" and
 * "Create room anyway" do not fit beside each other in it, and squeezed to fit
 * they wrap to two lines each (issue #197).
 *
 * @param props.layout - The generated layout, including `unplacedWords`
 * @param props.onConfirm - Create the room from the words that did fit
 * @param props.onBack - Return to the form with the word list intact
 */
export const UnplacedWordsNotice = ({ layout, onConfirm, onBack }: UnplacedWordsNoticeProps) => {
  return (
    <Box sx={gateStackSx}>
      <Message
        kind="warning"
        heading="Some words did not fit into the crossword"
        items={layout.unplacedWords}
      >
        {`These words cross none of the others and will be left out. The room will be created with the remaining ${layout.placedWords.length} words.`}
      </Message>

      <Box sx={gateButtonRowSx}>
        <PillButton kind="quiet" onClick={onBack}>
          Back
        </PillButton>
        <PillButton onClick={onConfirm}>Build it anyway</PillButton>
      </Box>
    </Box>
  );
};
