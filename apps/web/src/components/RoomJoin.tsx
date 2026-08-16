import { useState } from 'react';

import { type ActionPhase, failureOf, IDLE } from '../rooms/action-phase';
import { normalizeNickname } from '../rooms/nickname';
import { joinRoom } from '../rooms/room-service';
import { logGameEvent } from '../telemetry/analytics';
import { JoinRoomForm } from './JoinRoomForm';

const JOIN_FAILED_MESSAGE =
  'Could not join the game. Check your connection and try again — the room is still there.';

interface RoomJoinProps {
  /** Id of the room being entered. */
  readonly roomId: string;
  /** Firebase Auth UID this visitor will be listed under. */
  readonly playerId: string;
}

/**
 * The door into a room with a free seat: the nickname form and the write behind it.
 *
 * Shown only to somebody the room does not hold yet, which is what makes the
 * event it reports honest — a player reopening their own link never reaches
 * this screen, so nobody is counted as joining twice.
 *
 * @param props.roomId - Id of the room the link led to
 * @param props.playerId - UID the visitor was signed in under before the room was read
 *
 * @example
 * <RoomJoin roomId={roomId} playerId={playerId} />
 */
export const RoomJoin = ({ roomId, playerId }: RoomJoinProps) => {
  const [join, setJoin] = useState<ActionPhase>(IDLE);

  const submitJoin = async (rawNickname: string) => {
    setJoin({ phase: 'submitting' });

    try {
      await joinRoom({ roomId, playerId, nickname: normalizeNickname(rawNickname) });

      // Only a player who is really in the room. The nickname they chose is not
      // part of the event, and could not be — see `telemetry/analytics.ts`.
      void logGameEvent('player_joined');
    } catch (error) {
      // "Missing or insufficient permissions" says nothing to a player, so they
      // get a plain message and the details go to the console.
      console.error('Joining the room failed', error);
      setJoin({ phase: 'failed', message: JOIN_FAILED_MESSAGE });
    }
  };

  return (
    <JoinRoomForm
      onJoin={(nickname) => void submitJoin(nickname)}
      isJoining={join.phase === 'submitting'}
      errorMessage={failureOf(join)}
    />
  );
};
