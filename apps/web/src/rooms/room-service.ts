import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CrosswordLayout } from 'shared';

import { auth, db } from '../firebase/config';
import {
  buildRoomDocument,
  parseRoomDocument,
  ROOMS_COLLECTION,
  type RoomDocument,
} from './room-document';

/** Everything the caller supplies to open a new room. */
export interface CreateRoomInput {
  /** Layout the owner already reviewed, including the words that were dropped. */
  readonly layout: CrosswordLayout;
  /** Name the owner will be known by — they join their own room as its first player. */
  readonly ownerNickname: string;
}

/**
 * Signs the current browser in anonymously and reports who it is.
 *
 * Must happen before a room is read or written: the project has no backend, so
 * the client talks to Firestore itself and the security rules accept only a
 * signed-in user — including for reads. Anonymous sign-in is idempotent, so a
 * browser that already has an anonymous user keeps it, and the same player
 * coming back is the same UID (issue #9 builds on that).
 *
 * @returns Firebase Auth UID identifying this player
 * @throws Error from Firebase when sign-in fails
 */
export const signInPlayer = async (): Promise<string> => {
  const { user } = await signInAnonymously(auth);

  return user.uid;
};

/**
 * Creates a room in Firestore and puts the owner in it as the first player.
 *
 * @param input - The reviewed crossword layout and the owner's nickname
 * @returns Id of the created room — the part of the invite link players open
 * @throws Error from Firebase when sign-in or the write is rejected, and from
 * `buildRoomDocument` when the layout holds no placed word
 *
 * @example
 * const roomId = await createRoom({ layout, ownerNickname: 'Vik' });
 */
export const createRoom = async ({ layout, ownerNickname }: CreateRoomInput): Promise<string> => {
  const ownerId = await signInPlayer();
  const room = buildRoomDocument({
    ownerId,
    ownerNickname,
    layout,
    createdAt: new Date(),
  });

  const created = await addDoc(collection(db, ROOMS_COLLECTION), room);

  return created.id;
};

/** What a room subscription reports back to its caller. */
export interface RoomSubscriber {
  /** The room as it now stands, or `null` when there is none to show. */
  readonly onRoom: (room: RoomDocument | null) => void;
  /** The subscription itself failed — nothing more will arrive. */
  readonly onError: (error: unknown) => void;
}

/**
 * Watches a room and reports every change to it, starting with its current state.
 *
 * The game is cooperative and simultaneous, so every screen showing a room has
 * to follow it live rather than read it once. A room that does not exist — a
 * mistyped link, or one the TTL policy already collected — and a document that
 * is not a room this app understands both arrive as `null`: from a player's
 * side there is nothing at that link either way.
 *
 * @param roomId - Id from the invite link
 * @param subscriber - Where room updates and a failed subscription are reported
 * @returns Function that stops the subscription; call it when the screen goes away
 *
 * @example
 * const stop = subscribeToRoom(roomId, { onRoom: setRoom, onError: console.error });
 */
export const subscribeToRoom = (roomId: string, { onRoom, onError }: RoomSubscriber): Unsubscribe =>
  onSnapshot(
    doc(db, ROOMS_COLLECTION, roomId),
    (snapshot) => onRoom(snapshot.exists() ? parseRoomDocument(snapshot.data()) : null),
    onError,
  );

/** Everything needed to put one player into an existing room. */
export interface JoinRoomInput {
  readonly roomId: string;
  /** Firebase Auth UID of the joining player, from {@link signInPlayer}. */
  readonly playerId: string;
  /** Already-normalised nickname the other players will see. */
  readonly nickname: string;
}

/**
 * Adds a player to a room.
 *
 * Writes the single nested field `players.<uid>` rather than the whole map, so
 * two players joining at the same moment cannot overwrite each other, and a
 * player rejoining overwrites nothing but their own entry (see
 * `docs/decisions/0009`).
 *
 * @param input - The room, the player's UID, and the nickname to show
 * @throws Error from Firebase when the write is rejected — most often because
 * the room expired or already holds four players, both of which the rules
 * refuse
 *
 * @example
 * await joinRoom({ roomId, playerId, nickname: 'Bob' });
 */
export const joinRoom = async ({ roomId, playerId, nickname }: JoinRoomInput): Promise<void> => {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    [`players.${playerId}`]: { nickname, joinedAt: new Date() },
  });
};
