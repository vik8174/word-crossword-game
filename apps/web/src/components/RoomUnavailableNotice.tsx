import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router-dom';

import type { RoomUnavailableReason } from '../rooms/room-screen';

const MESSAGES: Readonly<Record<RoomUnavailableReason, string>> = {
  missing:
    'There is no game at this link. It may have been mistyped, or the room may have been cleaned up — rooms are kept for 24 hours.',
  expired:
    'This room has expired. Rooms are kept for 24 hours after they are created, and this one is past that, so nobody can join it any more. Ask whoever invited you to start a new game.',
  started:
    'This game has already begun. The words were dealt out among the players who were in the room at the time, so it takes no new players — ask whoever invited you for a link to the next game.',
  // Says the room is closed rather than that its crossword was finished: the
  // status is a client's word and the security rules cannot check it against
  // the board, so this is the most that is certainly true (see
  // docs/decisions/0012-ending-a-game-from-the-received-state.md).
  finished:
    'This game is over — the room has been closed. Rooms are not replayed, so there is nothing left to join here; start a new game and send the others your own link.',
  // Says what the game is rather than what this room ran out of: a third
  // player is not late and not unlucky, they are one player more than the game
  // has ever taken, and the way on is a room of their own rather than a wait.
  full: 'This game is played by exactly two people, and this room has both of them. Start a game of your own and send its link to whoever you want to play with.',
  connection:
    'Could not reach the game. Check your connection and reload the page — the room is still there.',
};

interface RoomUnavailableNoticeProps {
  readonly reason: RoomUnavailableReason;
}

/**
 * Explains, in a player's terms, why the link they opened leads nowhere.
 *
 * Every one of these is a normal thing to run into — a stale link, a late
 * arrival, a third friend — so none of them may surface as a raw Firebase
 * error, and each one leaves a way forward.
 *
 * @param props.reason - What stands between the player and the room
 *
 * @example
 * <RoomUnavailableNotice reason="expired" />
 */
export const RoomUnavailableNotice = ({ reason }: RoomUnavailableNoticeProps) => {
  return (
    <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Alert severity={reason === 'connection' ? 'error' : 'info'}>{MESSAGES[reason]}</Alert>

      <Button component={RouterLink} to="/" variant="contained">
        Start a new game
      </Button>
    </Stack>
  );
};
