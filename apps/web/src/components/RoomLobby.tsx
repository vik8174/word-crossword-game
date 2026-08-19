import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { type ActionPhase, failureOf, IDLE } from '../rooms/action-phase';
import { openGridCaption } from '../rooms/grid-caption';
import { lobbyStatusMessage } from '../rooms/lobby-status';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { startGame } from '../rooms/room-service';
import { useRoomPresence } from '../rooms/use-room-presence';
import { OwnPresenceNotice } from './OwnPresenceNotice';
import { PlayerList } from './PlayerList';
import { RoomCrossword } from './RoomCrossword';
import { StartGamePanel } from './StartGamePanel';

const START_FAILED_MESSAGE =
  'Could not start the game. Check your connection and try again — nothing has been dealt out yet.';

interface RoomLobbyProps {
  /** Id of the room, for the deal this screen writes. */
  readonly roomId: string;
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * A room waiting to be started: who is in, and the owner's control over when.
 *
 * The one write this screen makes is the deal, so it is the one this screen
 * owns — together with what to say when the database refuses it. Nothing about
 * answering words reaches here, because in a lobby there is nothing to answer:
 * the board below is drawn empty and takes no letters.
 *
 * @param props.roomId - Id of the room this lobby belongs to
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so only the owner is offered the start
 *
 * @example
 * <RoomLobby roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomLobby = ({ roomId, room, viewerId }: RoomLobbyProps) => {
  const [start, setStart] = useState<ActionPhase>(IDLE);
  const awayDurations = useRoomPresence(room);
  const players = playersInJoinOrder(room);
  const wordCount = room.layout.placedWords.length;
  const isOwner = viewerId === room.ownerId;

  const submitStart = async () => {
    setStart({ phase: 'submitting' });

    try {
      await startGame({ roomId, room });
    } catch (error) {
      // "Missing or insufficient permissions" says nothing to a player, so they
      // get a plain message and the details go to the console.
      console.error('Starting the game failed', error);
      setStart({ phase: 'failed', message: START_FAILED_MESSAGE });
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="body1" role="status">
        {lobbyStatusMessage({ isOwner, playerCount: players.length, wordCount })}
      </Typography>

      <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

      <PlayerList
        players={players}
        ownerId={room.ownerId}
        viewerId={viewerId}
        awayDurations={awayDurations}
      />

      {isOwner && (
        <StartGamePanel
          playerCount={players.length}
          wordCount={wordCount}
          onStart={() => void submitStart()}
          isStarting={start.phase === 'submitting'}
          errorMessage={failureOf(start)}
        />
      )}

      <RoomCrossword room={room} viewerId={viewerId} caption={openGridCaption(wordCount)} />
    </Stack>
  );
};
