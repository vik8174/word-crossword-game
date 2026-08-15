import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MIN_PLAYERS, wordAssignmentRefusal, type WordAssignmentRefusal } from 'shared';

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

/** What stands in the way of starting, said to the owner rather than to a caller. */
const refusalMessage = (
  refusal: WordAssignmentRefusal,
  { playerCount, wordCount }: { playerCount: number; wordCount: number },
): string => {
  if (refusal === 'too-few-players') {
    return `A game needs at least ${MIN_PLAYERS} players — share the link, so there is someone to explain the words you cannot see.`;
  }

  return `This crossword holds ${wordCount} words and the room holds ${playerCount} players, so somebody would have nothing to guess. Play it with fewer people, or start a new game from a longer word list.`;
};

/**
 * The owner's control over when the game begins.
 *
 * Only the owner sees it: they are the one who knows whether everybody invited
 * has arrived. Starting deals the words out, so it cannot be taken back — and
 * the button is offered only when the deal would actually work, asking
 * `wordAssignmentRefusal` the same question `assignWords` asks itself, so the
 * owner is told what is missing instead of pressing into a failure.
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
      {refusal !== null && (
        <Typography variant="body2" color="text.secondary">
          {refusalMessage(refusal, { playerCount, wordCount })}
        </Typography>
      )}

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
