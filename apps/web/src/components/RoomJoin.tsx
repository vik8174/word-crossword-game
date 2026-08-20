import { useState } from 'react';

import { wasRefusedByRules } from '../firebase/refusal';
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
  /**
   * UID whose seat this visitor is taking, from the screen that offered the
   * form; `null` whenever the room simply had one free.
   */
  readonly seatToRelease: string | null;
  /** Called when the room itself turned the join down, rather than the wire. */
  readonly onRefused: () => void;
}

/**
 * The door into a room with a free seat: the nickname form and the write behind it.
 *
 * Shown only to somebody the room does not hold yet, which is what makes the
 * event it reports honest — a player reopening their own link never reaches
 * this screen, so nobody is counted as joining twice.
 *
 * A join can fail in two ways and they are not the same news. A database that
 * could not be reached leaves the room exactly as it was, so the form stays and
 * says to try again. The security rules refusing means the room has moved on
 * without this visitor — somebody took the seat, or the words were dealt out —
 * and no amount of trying again will get them in, so the refusal is reported
 * upwards and the screen it belongs to takes over. That is also why the phase
 * is not cleared: like a join that worked, a join that was refused is replaced
 * from outside rather than tidied up here.
 *
 * @param props.roomId - Id of the room the link led to
 * @param props.playerId - UID the visitor was signed in under before the room was read
 * @param props.seatToRelease - Whose seat they are taking, if the room was full
 * @param props.onRefused - Told that this room would not take this visitor
 *
 * @example
 * <RoomJoin roomId={roomId} playerId={playerId} seatToRelease={null} onRefused={noteRefusal} />
 */
export const RoomJoin = ({ roomId, playerId, seatToRelease, onRefused }: RoomJoinProps) => {
  const [join, setJoin] = useState<ActionPhase>(IDLE);

  const submitJoin = async (rawNickname: string) => {
    setJoin({ phase: 'submitting' });

    try {
      await joinRoom({
        roomId,
        playerId,
        nickname: normalizeNickname(rawNickname),
        seatToRelease,
      });

      // Only a player who is really in the room. The nickname they chose is not
      // part of the event, and could not be — see `telemetry/analytics.ts`.
      void logGameEvent('player_joined');
    } catch (error) {
      // "Missing or insufficient permissions" says nothing to a player either
      // way, so the details go to the console and what they are shown depends
      // on which of the two things happened.
      console.error('Joining the room failed', error);

      if (wasRefusedByRules(error)) {
        onRefused();

        return;
      }

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
