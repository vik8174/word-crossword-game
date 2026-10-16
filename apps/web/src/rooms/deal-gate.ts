import type { RoomDocument } from './room-document';
import { startGame, type StartGameInput } from './room-service';

/** Where a room that reached the gate goes next: the connection's own `setConnection`. */
type Deliver = (room: RoomDocument | null) => void;

/**
 * The owner's deal and the room's snapshots, kept in the order they happened.
 *
 * Firestore shows a write to the client that made it before the server has
 * judged it: the room goes to `playing` at once and, if the rules refuse the
 * write, back to `lobby` a moment after the refusal arrives. The game screen
 * that opens in between unmounts the lobby, so the message the lobby was about
 * to show is lost, and the game screen runs `useGameCompletion` on a game that
 * was never dealt, a write the rules can accept (issue #282).
 *
 * So the move from `lobby` to `playing`, and only that move, waits for the
 * server. From the moment a deal is sent until it is answered, a room that says
 * `playing` is not passed on; the screen stays on the lobby it already has.
 * Every other room passes through, so the lobby goes on following the room.
 *
 * This is deliberately not React's. Everything here happens inside the two
 * callbacks that matter, the snapshot's and the write's, which run one after
 * the other and never at once, so what is decided cannot depend on whether a
 * render or an effect has run in between. The two earlier shapes of this fix,
 * a hold compared against "the room on screen" and one compared against a ref
 * set in an effect, both had a window there (issue #282, round 1):
 *
 * - `idle` — nothing is waiting; every room passes through.
 * - `pending` — the deal was sent and not answered. A `playing` room is kept,
 *   the latest of them, and not passed on.
 * - `refused` — the database turned the deal down. A `playing` room is dropped,
 *   because it is the optimistic one the refusal is about, and the first room
 *   that is not `playing` (the rollback) ends the state and is passed on.
 *
 * A confirmed deal passes on the `playing` room that was kept, and goes idle.
 *
 * Known limit: a deal refused because the room really is `playing` already (the
 * owner pressed in two tabs at once) gets no rollback, so the lobby stays until
 * the page is reloaded. The rules allow no other way to reach that state.
 */
export interface DealGate {
  /**
   * Passes one snapshot of the room on, or keeps it back. Called by the room
   * subscription for every snapshot, with the function that shows it.
   */
  readonly admit: (room: RoomDocument | null, deliver: Deliver) => void;
  /** `startGame` with the gate around it. Handed to the lobby as its `deal`. */
  readonly deal: (input: StartGameInput) => Promise<void>;
}

type State =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'pending';
      readonly kept: { readonly room: RoomDocument; readonly deliver: Deliver } | null;
    }
  | { readonly kind: 'refused' };

/**
 * Makes the gate of one room screen.
 *
 * @param write - The deal's write; `startGame` unless a test hands another
 * @returns The gate, with its state in the closure and nowhere else
 *
 * @example
 * const gate = createDealGate();
 * subscribeToRoom(roomId, { onRoom: (room) => gate.admit(room, show), onError });
 */
export const createDealGate = (
  write: (input: StartGameInput) => Promise<void> = startGame,
): DealGate => {
  let state: State = { kind: 'idle' };

  const admit = (room: RoomDocument | null, deliver: Deliver): void => {
    const isPlaying = room !== null && room.status === 'playing';

    if (state.kind === 'pending' && isPlaying) {
      state = { kind: 'pending', kept: { room, deliver } };

      return;
    }

    if (state.kind === 'refused') {
      if (isPlaying) {
        return;
      }

      state = { kind: 'idle' };
    }

    deliver(room);
  };

  const deal = async (input: StartGameInput): Promise<void> => {
    state = { kind: 'pending', kept: null };

    try {
      await write(input);
    } catch (error) {
      state = { kind: 'refused' };
      throw error;
    }

    const kept = state.kind === 'pending' ? state.kept : null;

    state = { kind: 'idle' };
    kept?.deliver(kept.room);
  };

  return { admit, deal };
};
