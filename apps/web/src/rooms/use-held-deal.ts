import { useCallback, useEffect, useRef, useState } from 'react';

import type { RoomDocument } from './room-document';
import { startGame, type StartGameInput } from './room-service';

/**
 * What the lobby is kept on, and why:
 * - `pending` — the deal was sent and the database has not answered it
 * - `refused` — the database turned the deal down while `at` was the room on
 *   screen. Held for as long as that very document is: it is the optimistic
 *   `playing` the SDK showed in between, and the rollback that follows is a
 *   document of its own, which ends the hold
 */
type Hold = {
  readonly lobby: RoomDocument;
  readonly outcome:
    { readonly kind: 'pending' } | { readonly kind: 'refused'; readonly at: RoomDocument | null };
};

/** What {@link useHeldDeal} hands the room page. */
export interface HeldDeal {
  /**
   * The lobby room to keep on screen instead of the game, or `null` when the
   * screen is to follow the room as it arrives.
   */
  readonly heldLobby: RoomDocument | null;
  /** `startGame`, with the hold around it. Handed to the lobby as its `deal`. */
  readonly deal: (input: StartGameInput) => Promise<void>;
}

/**
 * Keeps the lobby on screen from the moment its deal is sent until the
 * database has confirmed it, so that a refused deal can say so.
 *
 * Firestore shows a write to the client that made it before the server has
 * judged it: the room goes to `playing` at once and, if the rules refuse the
 * write, back to `lobby` a moment after the refusal arrives. The game screen
 * that opens in between unmounts the lobby, and the message the lobby was about
 * to show is lost with it. The same game screen would also run
 * `useGameCompletion` on a game that was never dealt, and that write can be
 * accepted (issue #282).
 *
 * So the move from `lobby` to `playing`, and only that move, waits for the
 * server. While the deal is pending the lobby is held, and shows its own
 * "Dealing the words". When the deal is confirmed the hold lifts and the game
 * appears. When it is refused the hold stays for exactly as long as the
 * optimistic `playing` document is the latest one, because the refusal arrives
 * before the rollback does; the lobby that comes back after it is shown as it
 * is, and carries the message.
 *
 * @param room - The room as it last arrived, or `null` when there is none
 * @returns The lobby to hold and the deal to hand the lobby
 *
 * @example
 * const { heldLobby, deal } = useHeldDeal(room);
 */
export const useHeldDeal = (room: RoomDocument | null): HeldDeal => {
  const [hold, setHold] = useState<Hold | null>(null);

  // Kept where the refusal can reach it: the room is read when the answer
  // comes back, not when the button was pressed.
  const latestRoom = useRef(room);

  useEffect(() => {
    latestRoom.current = room;
  });

  const deal = useCallback(async (input: StartGameInput): Promise<void> => {
    setHold({ lobby: input.room, outcome: { kind: 'pending' } });

    try {
      await startGame(input);
    } catch (error) {
      setHold({ lobby: input.room, outcome: { kind: 'refused', at: latestRoom.current } });
      throw error;
    }

    setHold(null);
  }, []);

  const isHeld =
    hold !== null &&
    (hold.outcome.kind === 'pending' || (room !== null && room === hold.outcome.at));

  return { heldLobby: isHeld ? hold.lobby : null, deal };
};
