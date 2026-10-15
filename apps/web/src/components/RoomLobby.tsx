import Box from '@mui/material/Box';
import { type ReactNode, useMemo, useState } from 'react';
import { wordAssignmentRefusal } from 'shared';

import { type ActionPhase, failureOf, IDLE } from '../rooms/action-phase';
import { lobbyCaption } from '../rooms/grid-caption';
import { lobbyStatusMessage } from '../rooms/lobby-status';
import { PLAYERS_PER_GAME, playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { startGame } from '../rooms/room-service';
import { useRoomPresence } from '../rooms/use-room-presence';
import { inRem } from '../scale';
import { useFrameSlot } from './frame-slot';
import { gateHintSx, gateStackSx } from './gate-panel-styles';
import { LobbyPlayers } from './LobbyPlayers';
import { LobbyStreet } from './LobbyStreet';
import { lobbyTightStackSx } from './lobby-styles';
import { OwnPresenceNotice } from './OwnPresenceNotice';
import { RoomShell } from './RoomShell';
import { StartGamePanel } from './StartGamePanel';

/** The heading is `StartGamePanel`'s own — "Could not start the game", fixed. */
const START_FAILED_MESSAGE = 'Check your connection and try again. Nothing has been dealt out yet.';

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
  /**
   * The write that deals the words. `startGame` unless given: handed in only by
   * the workshop, so that the screen mid-deal and the screen after a refused
   * deal can be drawn without a database.
   */
  readonly deal?: (input: {
    readonly roomId: string;
    readonly room: RoomDocument;
  }) => Promise<void>;
}

/**
 * A room waiting to be started: who is in, and the owner's control over when.
 *
 * The one write this screen makes is the deal, so it is the one this screen
 * owns, together with what to say when the database refuses it. Nothing about
 * answering words reaches here, because in a lobby there is nothing to answer.
 *
 * It is drawn to the template's `lobby` states (`design/templates/state-tree.html`
 * lines 923-972) in `RoomShell`'s lobby arrangement: a column (the notice if the
 * room has stopped hearing from the reader, who is in the room, the link that
 * brings the other one, the one control that starts the game) beside the street,
 * which says who is in. The street says it three ways: the second balcony empty
 * and the line loose while the host is alone, both taken with the line taut once
 * they are two, and the second with its curtains drawn when a seat has been
 * freed by silence (the host is still offered the link, because `invitation` is
 * handed down only while a seat is free).
 *
 * The status line is the frame's header, not this screen's: `useFrameSlot`
 * puts the sentence for this reader there, and the frame hides it under 768.
 * There is no board in a lobby, because which words are whose is decided by the
 * deal; what the lobby says about the crossword it says in words, under the
 * street, and the count is the words that are in the grid and not the words
 * that were typed in.
 *
 * @param props.roomId - Id of the room this lobby belongs to
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so only the owner is offered the start
 * @param props.invitation - The room's link, for a viewer who has somebody to invite
 * @param props.deal - The deal's write; the workshop's way to draw it unfinished or refused
 *
 * @example
 * <RoomLobby roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomLobby = ({
  roomId,
  room,
  viewerId,
  invitation,
  deal = startGame,
}: RoomLobbyProps) => {
  const [start, setStart] = useState<ActionPhase>(IDLE);
  const awayDurations = useRoomPresence(room);
  const players = playersInJoinOrder(room);
  const wordCount = room.layout.placedWords.length;
  const isOwner = viewerId === room.ownerId;

  const submitStart = async () => {
    setStart({ phase: 'submitting' });

    try {
      await deal({ roomId, room });
    } catch (error) {
      // "Missing or insufficient permissions" says nothing to a player, so they
      // get a plain message and the details go to the console.
      console.error('Starting the game failed', error);
      setStart({ phase: 'failed', message: START_FAILED_MESSAGE });
    }
  };

  const waiting = players.length < PLAYERS_PER_GAME;
  // Two players in and the host still holds the link: the guest's seat has been
  // freed by silence (`hasFreeSeatIn`, asked one screen up).
  const seatFreedBySilence = !waiting && invitation !== undefined;
  const ownerName = players.find((player) => player.id === room.ownerId)?.nickname;
  const canBeDealt = wordAssignmentRefusal({ wordCount, playerCount: players.length }) === null;

  const status = useMemo(
    () => (
      <span role="status">
        {lobbyStatusMessage({ isOwner, playerCount: players.length, wordCount })}
      </span>
    ),
    [isOwner, players.length, wordCount],
  );
  useFrameSlot({ status });

  return (
    <RoomShell
      title="Lobby"
      left={
        <Box sx={gateStackSx}>
          <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

          <LobbyPlayers
            players={players}
            ownerId={room.ownerId}
            viewerId={viewerId}
            awayDurations={awayDurations}
          />

          {invitation}

          {isOwner && (
            <StartGamePanel
              playerCount={players.length}
              wordCount={wordCount}
              onStart={() => void submitStart()}
              isStarting={start.phase === 'submitting'}
              errorMessage={failureOf(start)}
            />
          )}

          {!isOwner && !waiting && canBeDealt && (
            <Box component="p" sx={{ ...gateHintSx, fontSize: inRem(17) }}>
              {`Waiting for ${ownerName ?? 'the host'} to start the game.`}
            </Box>
          )}
        </Box>
      }
      picture={
        <Box sx={lobbyTightStackSx}>
          <LobbyStreet waiting={waiting} seatFreedBySilence={seatFreedBySilence} />
          <Box component="p" sx={{ ...gateHintSx, textAlign: 'center' }}>
            {lobbyCaption(wordCount)}
          </Box>
        </Box>
      }
    />
  );
};
