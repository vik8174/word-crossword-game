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
import { CROSSWORD_HEADING_ID, CrosswordHeading } from './CrosswordHeading';
import { OwnPresenceNotice } from './OwnPresenceNotice';
import { PlayerList } from './PlayerList';
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
 * Everything this screen has stands in the zone on the left — who is in the
 * room, the link that brings the other one, what the crossword is, and the one
 * control that starts it. The middle is left empty, and that is the whole of
 * the arrangement: this screen stands at the doors of the temple, the doorway
 * is what fills the middle of it, and the camera goes through that doorway when
 * the game begins (issue #115). Anything put there would be standing in the way
 * of the next screen.
 *
 * So the board is not drawn here, and that is a change of mind rather than an
 * oversight. It used to be, empty and already the size it would be played at,
 * so that nothing about it moved when the game began (issue #101) — which was
 * the right answer while every screen was drawn on the same flat page. It is
 * the wrong one now that the screens are places: the crossword is in the hall,
 * this is the doors, and a board seen through a doorway you have not walked
 * through yet is the room arriving before the player does. What the lobby says
 * about the crossword it says in words, in the band, and the count it gives is
 * the words that are in the grid rather than the words that were typed in.
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
      left={
        <Stack spacing={4}>
          <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

          {invitation}

          <PlayerList
            players={players}
            ownerId={room.ownerId}
            viewerId={viewerId}
            awayDurations={awayDurations}
          />

          {/* The crossword said rather than shown. The count is the words that
            are in the grid and not the words that were typed in — three of them
            may have failed to fit, and an unplaced word is drawn nowhere, so
            this line is the only place anybody is told. */}
          <section aria-labelledby={CROSSWORD_HEADING_ID}>
            <CrosswordHeading caption={openGridCaption(wordCount)} />
          </section>

          {/* The one control, in the band with everything else this screen has:
            the middle of the window is the doorway, and a control let through
            the picture cannot be read off the roof of a temple anyway
            (`garden/scene-palette.ts`). */}
          {isOwner && (
            <StartGamePanel
              playerCount={players.length}
              wordCount={wordCount}
              onStart={() => void submitStart()}
              isStarting={start.phase === 'submitting'}
              errorMessage={failureOf(start)}
            />
          )}
        </Stack>
      }
    />
  );
};
