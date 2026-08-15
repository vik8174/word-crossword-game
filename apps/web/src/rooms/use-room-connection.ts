import { useEffect, useState } from 'react';

import type { RoomDocument } from './room-document';
import { signInPlayer, subscribeToRoom } from './room-service';

/**
 * How far a room screen got in reaching its room:
 * - `connecting` — signing in and waiting for the first snapshot
 * - `ready` — the room is on screen and following live updates
 * - `missing` — there is no room at this link
 * - `failed` — sign-in or the subscription itself broke down
 */
export type RoomConnection =
  | { readonly status: 'connecting' }
  | { readonly status: 'ready'; readonly playerId: string; readonly room: RoomDocument }
  | { readonly status: 'missing' }
  | { readonly status: 'failed' };

/**
 * Signs the visitor in, then follows the room behind the link they opened.
 *
 * The order matters and is not negotiable: the security rules require a
 * signed-in user even to read a room, so anonymous sign-in happens the moment
 * the page opens — before the room is read and long before a nickname is asked
 * for (`docs/decisions/0009`, last consequence). Asking for the nickname first
 * would make the very first read fail.
 *
 * @param roomId - Id of the room from the invite link
 * @returns The current state of the connection, re-rendering on every update
 *
 * @example
 * const connection = useRoomConnection(roomId);
 */
export const useRoomConnection = (roomId: string): RoomConnection => {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connection, setConnection] = useState<RoomConnection>({ status: 'connecting' });

  useEffect(() => {
    let isCurrent = true;

    signInPlayer()
      .then((uid) => {
        if (isCurrent) {
          setPlayerId(uid);
        }
      })
      .catch((error: unknown) => {
        // Firebase's own wording ("auth/network-request-failed") means nothing
        // to a player, so the screen shows its own message and the details go
        // to the console for whoever is debugging.
        console.error('Signing the player in failed', error);

        if (isCurrent) {
          setConnection({ status: 'failed' });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (playerId === null) {
      return;
    }

    return subscribeToRoom(roomId, {
      onRoom: (room) =>
        setConnection(room === null ? { status: 'missing' } : { status: 'ready', playerId, room }),
      onError: (error) => {
        console.error('Following the room failed', error);
        setConnection({ status: 'failed' });
      },
    });
  }, [playerId, roomId]);

  return connection;
};
