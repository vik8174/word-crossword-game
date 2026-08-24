import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { useState } from 'react';

/** The question the confirmation asks, and the accessible name of the dialog. */
const CONFIRM_TITLE = 'End the game?';

/**
 * Said before the game is ended, and said the same way every time.
 *
 * It does not branch on whether the other player looks present. Every client in
 * a room writes a mark every fifteen seconds, so that reading can change while
 * this dialog is open — and a warning that rewrote itself under somebody's
 * finger would be worse than one that claims a little more than it has to. What
 * is said is true in both cases: whoever else is in this room loses the game
 * too, and nothing brings it back
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
 */
const CONFIRM_MESSAGE =
  'This ends the game for both of you, straight away. The room cannot be reopened afterwards and the crossword cannot be finished in it, so there is no way back from here.';

interface EndGamePanelProps {
  /** Ends the game; called once the player has confirmed. */
  readonly onEnd: () => void;
  /** `true` while the ending is being written; the room becomes a closed one on its own. */
  readonly isEnding: boolean;
  /** Why the last attempt did not go through, if it did not. */
  readonly errorMessage?: string;
}

/**
 * The way out of a game that cannot be finished.
 *
 * Both players are offered it, not the host alone. The player who needs it is
 * whoever was left on their own, and that is as often the guest as the host:
 * after the deal, the words hidden from the host can be answered by nobody
 * else, so a host who walks away strands their guest exactly as a guest who
 * walks away strands their host.
 *
 * It is called "End the game" rather than "Leave" because that is what it does.
 * Once the words are dealt, a seat cannot be emptied — the security rules hold
 * every player in place, since a word is dealt to a UID and the win is read
 * from those same fields — so leaving alone is not a thing this game has to
 * offer. Naming the button after the smaller of the two acts would have been
 * naming it after the one that does not happen
 * (`docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`).
 *
 * The confirmation is the panel's own state rather than the caller's: what is
 * being decided is whether to ask for the write, which nothing outside this
 * component acts on.
 *
 * @param props.onEnd - Called once the player has confirmed the ending
 * @param props.isEnding - Whether the ending is on its way to the room
 * @param props.errorMessage - Message about an ending that was refused
 *
 * @example
 * <EndGamePanel onEnd={endGame} isEnding={false} />
 */
export const EndGamePanel = ({ onEnd, isEnding, errorMessage }: EndGamePanelProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const stopConfirming = () => {
    setIsConfirming(false);
  };

  const confirm = () => {
    setIsConfirming(false);
    onEnd();
  };

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      {errorMessage !== undefined && <Alert severity="error">{errorMessage}</Alert>}

      <Button
        variant="outlined"
        color="error"
        onClick={() => {
          setIsConfirming(true);
        }}
        disabled={isEnding}
      >
        {isEnding ? 'Ending the game...' : 'End the game'}
      </Button>

      <Dialog open={isConfirming} onClose={stopConfirming} aria-labelledby="end-game-title">
        <DialogTitle id="end-game-title">{CONFIRM_TITLE}</DialogTitle>

        <DialogContent>
          <DialogContentText>{CONFIRM_MESSAGE}</DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={stopConfirming}>Keep playing</Button>
          <Button onClick={confirm} color="error" variant="contained">
            End the game
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
