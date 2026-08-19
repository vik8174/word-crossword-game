import { useEffect } from 'react';

import { awaitsPresenceFrom, PRESENCE_PERIOD_MS } from './presence';
import { markPresence } from './room-service';
import type { RoomConnection } from './use-room-connection';

/**
 * Marks this client present in the room it is following, over and over.
 *
 * The mark is what the other players read to tell somebody thinking from
 * somebody gone (see `presence.ts`), and it says nothing unless it keeps being
 * rewritten — so this is a timer, running for as long as the screen is on a
 * room that is waiting or being played and this client is one of its players.
 * A visitor still looking at the nickname form writes nothing: they are not in
 * the game, and nobody is waiting on them.
 *
 * The first mark is written immediately rather than a period later, because a
 * player coming back to a room they are still listed in arrives with a mark
 * minutes old, and their seat could be taken while a timer counted down.
 *
 * Each mark is scheduled only once the one before it has landed, rather than on
 * a fixed interval. A connection slow enough to overlap two writes has nothing
 * to gain from the second, and a refused write ends the chain by simply not
 * scheduling another.
 *
 * What the effect watches is a `boolean` and two strings, never the room
 * document: a new document arrives with every snapshot, and this client's own
 * mark causes one — an effect depending on it would tear its own timer down
 * every time it fired.
 *
 * @param roomId - Id of the room being followed
 * @param connection - The room as {@link RoomConnection} last reported it
 *
 * @example
 * usePresenceHeartbeat(roomId, connection);
 */
export const usePresenceHeartbeat = (roomId: string, connection: RoomConnection): void => {
  const playerId = connection.status === 'ready' ? connection.playerId : null;
  const isMarking =
    connection.status === 'ready' && awaitsPresenceFrom(connection.room, connection.playerId);

  useEffect(() => {
    if (!isMarking || playerId === null) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let isStopped = false;

    const mark = () => {
      markPresence({ roomId, playerId })
        .then(() => {
          // A mark can land after the screen has gone — a player leaving a room
          // has one in flight more often than not — and scheduling from that
          // would leave a timer nothing owns, writing into a room nobody is
          // looking at.
          if (!isStopped) {
            timer = setTimeout(mark, PRESENCE_PERIOD_MS);
          }
        })
        .catch((error: unknown) => {
          // Firestore keeps retrying a write it merely could not send, so a
          // rejection means the rules refused it — and the only thing they
          // refuse about a mark is an expired room, which nothing can undo.
          // Marking on would be a failure logged every fifteen seconds for as
          // long as the tab is open.
          console.error('Marking this player present failed', error);
        });
    };

    mark();

    return () => {
      isStopped = true;
      clearTimeout(timer);
    };
  }, [isMarking, playerId, roomId]);
};
