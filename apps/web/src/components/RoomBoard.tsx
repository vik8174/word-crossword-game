import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument, RoomStatus } from '../rooms/room-document';
import { CrosswordGridOutline } from './CrosswordGridOutline';
import { PlayerList } from './PlayerList';

/** What the room is doing right now, said to a player rather than to a database. */
const STATUS_MESSAGES: Readonly<Record<RoomStatus, string>> = {
  lobby: 'Waiting for the other players. The game starts once everyone is in.',
  playing: 'The game is on.',
  completed: 'This game is finished — every word has been guessed.',
};

interface RoomBoardProps {
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * The room a player has joined: who else is in, and the crossword they will play.
 *
 * The grid is deliberately blank — see {@link CrosswordGridOutline}. Guessing
 * words is not here either; it arrives with issue #7.
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they can be marked in the list
 *
 * @example
 * <RoomBoard room={room} viewerId={playerId} />
 */
export const RoomBoard = ({ room, viewerId }: RoomBoardProps) => {
  return (
    <Stack spacing={3}>
      <Typography variant="body1" role="status">
        {STATUS_MESSAGES[room.status]}
      </Typography>

      <PlayerList players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={viewerId} />

      <section aria-labelledby="grid-heading">
        <Typography id="grid-heading" variant="h6" component="h2">
          The crossword
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`${room.layout.placedWords.length} words are hidden in this grid. The letters stay covered until the game starts.`}
        </Typography>

        <CrosswordGridOutline layout={room.layout} />
      </section>
    </Stack>
  );
};
