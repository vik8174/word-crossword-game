import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CrosswordLayout } from 'shared';

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
      <Alert severity="warning">
        <AlertTitle>Some words did not fit into the crossword</AlertTitle>
        <Typography variant="body2">
          These words cross none of the others and will be left out:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 'medium', mt: 2 }}>
          {layout.unplacedWords.join(', ')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {`The room will be created with the remaining ${layout.placedWords.length} words.`}
        </Typography>
      </Alert>

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
