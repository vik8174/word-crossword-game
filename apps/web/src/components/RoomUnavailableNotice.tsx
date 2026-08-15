import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Why a room cannot be entered:
 * - `missing` — nothing lives at this link, or nothing that is a room
 * - `expired` — the room outlived its 24 hours and refuses every write
 * - `started` — the words are dealt out; the game runs with the players it began with
 * - `finished` — that game has been played to its last word
 * - `full` — four players are already in it
 * - `connection` — the app could not reach Firebase at all
 */
export type RoomUnavailableReason =
  'missing' | 'expired' | 'started' | 'finished' | 'full' | 'connection';

const MESSAGES: Readonly<Record<RoomUnavailableReason, string>> = {
  missing:
    'There is no game at this link. It may have been mistyped, or the room may have been cleaned up — rooms are kept for 24 hours.',
  expired:
    'This room has expired. Rooms are kept for 24 hours after they are created, and this one is past that, so nobody can join it any more. Ask whoever invited you to start a new game.',
  started:
    'This game has already begun. The words were dealt out among the players who were in the room at the time, so it takes no new players — ask whoever invited you for a link to the next game.',
  finished:
    'This game is over — every word of its crossword has been guessed. Rooms are not replayed, so there is nothing left to join here; start a new game and send the others your own link.',
  full: 'This room is already full — a game takes at most four players.',
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
 * arrival, a fifth friend — so none of them may surface as a raw Firebase
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
