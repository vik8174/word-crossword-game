import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { closedGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { PlayerList } from './PlayerList';
import { RoomCrossword } from './RoomCrossword';

/**
 * Said in a room that ended without its crossword having been finished.
 *
 * Two different rooms arrive here and the message is written for both, because
 * from inside the app there is no telling them apart and no need to. The
 * ordinary one is a game a player ended: a crossword that cannot be finished
 * has a way out, and this screen is where it comes out
 * (`docs/decisions/0027-a-game-a-player-can-end.md`). The other is a room whose
 * `completed` no board backs up, which the security rules cannot refuse — they
 * cannot walk the `words` map — so any client that knows the room id can write
 * it over a game nobody played
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`). Either way
 * the room is finished with its players, and either way the words nobody
 * answered stay unspoken.
 *
 * It says nothing about who ended it, and there is no field it could read to:
 * the case this control exists for is a player left on their own, so the one
 * reading this is usually the one who pressed the button, and two people who
 * are both still there say it to each other out loud.
 *
 * With one exception, which the sentence has to name rather than leave the
 * reader to notice: the words *they* were explaining are still written into
 * their own grid, as they were all game
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). Those were never
 * theirs to guess, so nothing is given away — but a message promising a blank
 * board over a board that is not blank would simply be untrue.
 */
const CLOSED_UNFINISHED_MESSAGE =
  'This game was ended before every word had been answered, and the room is closed for good. The words nobody guessed are not spelled out, apart from the ones that were yours to explain, which were on your screen all along.';

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
 * status is terminal, so there is nothing to start, nothing to answer and
 * nothing left to end. It offers no way onward either, which is the same
 * silence `RoomFinished` keeps — a new game is a new room, and neither ending
 * pretends otherwise. What it must not do is spell the crossword out — the
 * board is the only half a client cannot fake, and this board is not full.
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
