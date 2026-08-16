import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { wordAssignmentRefusal } from 'shared';

interface StartGamePanelProps {
  /** How many players are in the room right now. */
  readonly playerCount: number;
  /** How many words made it into the grid — the words there are to deal out. */
  readonly wordCount: number;
  /** Deals the words out and opens the game. */
  readonly onStart: () => void;
  /** `true` while the deal is being written; the room becomes the game on its own. */
  readonly isStarting: boolean;
  /** Why the last attempt did not go through, if it did not. */
  readonly errorMessage?: string;
}

/**
 * The owner's control over when the game begins.
 *
 * Only the owner sees it: they are the one who knows whether everybody invited
 * has arrived. Starting deals the words out, so it cannot be taken back — and
 * the button is live only when the deal would actually work, asking
 * `wordAssignmentRefusal` the same question `assignWords` asks itself, so the
 * owner cannot press into a failure.
 *
 * What is missing while it is not live is not said here: the room's status line
 * says it already, and says it to everybody in the room rather than to the
 * owner alone (see `lobby-status.ts` and issue #29). Two statements of the same
 * refusal, one above the other, is how they come to disagree.
 *
 * @param props.playerCount - Players currently in the room
 * @param props.wordCount - Words in the room's crossword
 * @param props.onStart - Called when the owner starts the game
 * @param props.errorMessage - Message about a start that was refused
 *
 * @example
 * <StartGamePanel playerCount={2} wordCount={12} onStart={start} isStarting={false} />
 */
export const StartGamePanel = ({
  playerCount,
  wordCount,
  onStart,
  isStarting,
  errorMessage,
}: StartGamePanelProps) => {
  const refusal = wordAssignmentRefusal({ wordCount, playerCount });

  return (
    <Stack spacing={2}>
      {errorMessage !== undefined && <Alert severity="error">{errorMessage}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={onStart}
        disabled={refusal !== null || isStarting}
      >
        {isStarting ? 'Starting...' : 'Start the game'}
      </Button>
    </Stack>
  );
};
