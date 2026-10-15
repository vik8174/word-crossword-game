import Box from '@mui/material/Box';
import type { CrosswordLayout } from 'shared';

import { gateButtonRowSx, gateStackSx } from './gate-panel-styles';
import { Message } from './Message';
import { PillButton } from './PillButton';
import { unplacedSentence } from './unplaced-sentence';

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
 * The two answers stand in a row from the left, the loud one first and the
 * quiet one after it, as the template draws the fork (`create/unplaced`, lines
 * 885-886). It is a fork and not an error, so it keeps its card and has no
 * field.
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
        {unplacedSentence(layout.unplacedWords.length)}
      </Message>

      <Box sx={gateButtonRowSx}>
        <PillButton onClick={onConfirm}>Build it anyway</PillButton>
        <PillButton kind="quiet" onClick={onBack}>
          Back
        </PillButton>
      </Box>
    </Box>
  );
};
