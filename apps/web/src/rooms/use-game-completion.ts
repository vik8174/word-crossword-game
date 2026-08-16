import { useEffect, useRef } from 'react';

import { logGameEvent } from '../telemetry/analytics';
import { awaitsCompletion } from './room-completion';
import type { RoomDocument } from './room-document';
import { completeGame } from './room-service';

/**
 * Closes the game as soon as the room this screen is following shows every word
 * answered.
 *
 * It watches the room that arrived, not the answer this player sent, and that
 * is the whole point: the client whose answer happened to be the last one may
 * never realise it was (see
 * `docs/decisions/0012-ending-a-game-from-the-received-state.md`). So every
 * client in the room runs this, and whoever sees the full board writes the same
 * `status: 'completed'`.
 *
 * The write is made once per screen: it is idempotent, but repeating it on
 * every snapshot would be pointless traffic. A refused write is allowed to be
 * tried again, because a room stuck in `playing` with a full grid is a game
 * nobody can finish — and the next snapshot is what tries it.
 *
 * A finished game is also the moment `game_completed` is reported, for the same
 * reason it is written here: this is where a game is known to have ended.
 *
 * @param roomId - Id of the room being followed
 * @param room - The room as it last arrived, or `null` when there is none
 *
 * @example
 * useGameCompletion(roomId, connection.status === 'ready' ? connection.room : null);
 */
export const useGameCompletion = (roomId: string, room: RoomDocument | null): void => {
  // Kept in a ref rather than in state: a second write changes nothing on this
  // screen, so noticing that one is already on its way must not cause a render.
  const isWriting = useRef(false);

  useEffect(() => {
    if (room === null || !awaitsCompletion(room) || isWriting.current) {
      return;
    }

    isWriting.current = true;

    completeGame(roomId)
      .then(() => {
        // Reported by whichever client closed the game, which is not
        // necessarily one client: several of them can see the full board at
        // once and all write the same status, so a game can be counted more
        // than once (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
        // Nothing without a backend can make it exactly one, and the two
        // counts it does report — how big the crossword was and how many
        // played it — say nothing about the room either way.
        void logGameEvent('game_completed', {
          word_count: room.layout.placedWords.length,
          player_count: Object.keys(room.players).length,
        });
      })
      .catch((error: unknown) => {
        // Nothing is said to the player: the game is over on their screen either
        // way — every word is in the grid — and any other client in the room, or
        // this one on its next snapshot, still closes it.
        console.error('Closing the finished game failed', error);
        isWriting.current = false;
      });
  }, [room, roomId]);
};
