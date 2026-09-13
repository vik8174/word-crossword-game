import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import type { CrosswordLayout } from 'shared';

import { Message } from './Message';

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
 * @param props.layout - The generated layout, including `unplacedWords`
 * @param props.onConfirm - Create the room from the words that did fit
 * @param props.onBack - Return to the form with the word list intact
 */
export const UnplacedWordsNotice = ({ layout, onConfirm, onBack }: UnplacedWordsNoticeProps) => {
  return (
    <Stack spacing={5}>
      <Message
        kind="warning"
        heading="Some words did not fit into the crossword"
        items={layout.unplacedWords}
      >
        {`These words cross none of the others and will be left out. The room will be created with the remaining ${layout.placedWords.length} words.`}
      </Message>

      <Stack direction="row" spacing={4}>
        <Button variant="contained" onClick={onConfirm}>
          Create room anyway
        </Button>
        <Button variant="outlined" onClick={onBack}>
          Edit the word list
        </Button>
      </Stack>
    </Stack>
  );
};
