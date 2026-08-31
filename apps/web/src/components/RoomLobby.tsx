import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactNode, useState } from 'react';

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
import { RoomShell } from './RoomShell';
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
  /**
   * The link into this room, for the one viewer who still has somebody to send
   * it to — and nothing at all for everybody else.
   *
   * Handed down rather than worked out here: who is offered it, and for how
   * long, is `hasSomebodyToInvite`'s answer, asked one screen up where the room
   * and the moment are both to hand
   * (`docs/decisions/0026-the-invite-link-belongs-to-the-host.md`). The lobby is
   * only where it is put, which is the zone beside a board nobody may type in
   * yet.
   */
  readonly invitation?: ReactNode;
}

/**
 * A room waiting to be started: who is in, and the owner's control over when.
 *
 * The one write this screen makes is the deal, so it is the one this screen
 * owns — together with what to say when the database refuses it. Nothing about
 * answering words reaches here, because in a lobby there is nothing to answer:
 * the board below is drawn empty and takes no letters.
 *
 * Who is in the room, and the link that brings the other one, stand in the zone
 * on the left of the board — the one that holds the words this player explains
 * once there are any. It is the side the lobby's band is on, and the side is
 * the point: this screen is the doors of the temple, and what the camera flies
 * through next is the doorway in the middle of it, so nothing of the interface
 * may stand there. The board is already the size it will be played at — the
 * crossword was laid out when the room was made — so nothing about it moves
 * when the game begins (issue #101).
 *
 * @param props.roomId - Id of the room this lobby belongs to
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so only the owner is offered the start
 * @param props.invitation - The room's link, for a viewer who has somebody to invite
 *
 * @example
 * <RoomLobby roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomLobby = ({ roomId, room, viewerId, invitation }: RoomLobbyProps) => {
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
    <RoomShell
      title="Lobby"
      status={
        <Typography variant="body1" role="status">
          {lobbyStatusMessage({ isOwner, playerCount: players.length, wordCount })}
        </Typography>
      }
      action={
        isOwner ? (
          <StartGamePanel
            playerCount={players.length}
            wordCount={wordCount}
            onStart={() => void submitStart()}
            isStarting={start.phase === 'submitting'}
            errorMessage={failureOf(start)}
          />
        ) : undefined
      }
      left={
        <Stack spacing={2}>
          <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

          {invitation}

          <PlayerList
            players={players}
            ownerId={room.ownerId}
            viewerId={viewerId}
            awayDurations={awayDurations}
          />
        </Stack>
      }
    >
      <RoomCrossword room={room} viewerId={viewerId} caption={openGridCaption(wordCount)} />
    </RoomShell>
  );
};
