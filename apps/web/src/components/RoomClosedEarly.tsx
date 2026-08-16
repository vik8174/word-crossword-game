import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { closedGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { PlayerList } from './PlayerList';
import { RoomCrossword } from './RoomCrossword';

/**
 * Said in a room that is closed without its crossword having been finished.
 *
 * Nothing an honest game does produces this: the game is closed by clients that
 * can see a full board, so a full board is what a closed room normally has. It
 * takes a client writing `completed` over a room that was never played, which
 * the security rules cannot refuse (see
 * `docs/decisions/0012-ending-a-game-from-the-received-state.md`). The room is
 * closed for good either way — `completed` is terminal — so the players are
 * told that plainly, and the words nobody answered are not spelled out, because
 * from here there is no way to tell an odd game from a spoiled one.
 */
const CLOSED_UNFINISHED_MESSAGE =
  'This room is closed. It was closed before every word had been answered, so the words that were never guessed are not shown — ask whoever invited you for a link to a new game.';

interface RoomClosedEarlyProps {
  /** The room, closed with words still unanswered. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * A room shut before its crossword was filled in.
 *
 * Like the finished screen it takes no callbacks, and for the same reason: the
 * status is terminal, so there is nothing to start and nothing to answer. What
 * it must not do is spell the crossword out — the board is the only half a
 * client cannot fake, and this board is not full.
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so the list marks them
 *
 * @example
 * <RoomClosedEarly room={room} viewerId={playerId} />
 */
export const RoomClosedEarly = ({ room, viewerId }: RoomClosedEarlyProps) => {
  const players = playersInJoinOrder(room);

  return (
    <Stack spacing={3}>
      <Alert severity="info" role="status">
        {CLOSED_UNFINISHED_MESSAGE}
      </Alert>

      <PlayerList players={players} ownerId={room.ownerId} viewerId={viewerId} />

      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={closedGridCaption(room.layout.placedWords.length)}
      />
    </Stack>
  );
};
