import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MIN_PLAYERS } from 'shared';

interface StartGamePanelProps {
  /** How many players are in the room right now. */
  readonly playerCount: number;
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
 * has arrived. Starting deals the words out, so it cannot be taken back — and a
 * room of one has nobody to explain anything, which is why two players are the
 * floor.
 *
 * @param props.playerCount - Players currently in the room
 * @param props.onStart - Called when the owner starts the game
 * @param props.errorMessage - Message about a start that was refused
 *
 * @example
 * <StartGamePanel playerCount={2} onStart={start} isStarting={false} />
 */
export const StartGamePanel = ({
  playerCount,
  onStart,
  isStarting,
  errorMessage,
}: StartGamePanelProps) => {
  const hasEnoughPlayers = playerCount >= MIN_PLAYERS;

  return (
    <Stack spacing={2}>
      {!hasEnoughPlayers && (
        <Typography variant="body2" color="text.secondary">
          {`A game needs at least ${MIN_PLAYERS} players — share the link, so there is someone to explain the words you cannot see.`}
        </Typography>
      )}

      {errorMessage !== undefined && <Alert severity="error">{errorMessage}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={onStart}
        disabled={!hasEnoughPlayers || isStarting}
      >
        {isStarting ? 'Starting...' : 'Start the game'}
      </Button>
    </Stack>
  );
};
