import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { assignWords, type CrosswordLayout } from 'shared';

import { auth, db } from '../firebase/config';
import { buildCompletionUpdate, buildEarlyEndUpdate } from './room-completion';
import {
  buildGuessUpdate,
  buildJoinUpdate,
  buildPresenceUpdate,
  buildRoomDocument,
  buildStartGameUpdate,
  parseRoomDocument,
  ROOMS_COLLECTION,
  type RoomDocument,
  type RoomUpdate,
} from './room-document';

/**
 * Writes one update to one room — the only path from this module to an existing
 * room document.
 *
 * It takes a {@link RoomUpdate} and nothing else, and only the builders in
 * `room-document.ts` produce one. That is what keeps the room's expiry moving:
 * a new kind of write cannot be added here without going through a builder that
 * postpones it, and a room whose expiry stopped moving would start refusing
 * every write the moment its 24 hours ran out (issue #9).
 *
 * @param roomId - Id of the room being written to
 * @param update - What to write, from one of the `build*Update` functions
 * @throws Error from Firebase when the write is rejected
 */
const writeToRoom = (roomId: string, update: RoomUpdate): Promise<void> =>
  updateDoc(doc(db, ROOMS_COLLECTION, roomId), update);

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
  /**
   * UID whose seat this player is taking, from `abandonedSeatIn` — `null`
   * whenever the room simply had a seat free.
   */
  readonly seatToRelease?: string | null;
}

/**
 * Adds a player to a room.
 *
 * Writes the single nested field `players.<uid>` rather than the whole map, so
 * two players joining at the same moment cannot overwrite each other, and a
 * player rejoining overwrites nothing but their own entry (see
 * `docs/decisions/0009`).
 *
 * When the room was full and one of its seats had been given up, that seat is
 * released in the same write — one update, so the room is never momentarily a
 * size the security rules refuse.
 *
 * @param input - The room, the player's UID, the nickname to show, and the seat
 * they are taking if they are taking one
 * @throws Error from Firebase when the write is rejected — most often because
 * the room expired or already holds the two players it takes, both of which
 * the rules refuse
 *
 * @example
 * await joinRoom({ roomId, playerId, nickname: 'Bob' });
 */
export const joinRoom = async ({
  roomId,
  playerId,
  nickname,
  seatToRelease = null,
}: JoinRoomInput): Promise<void> => {
  await writeToRoom(roomId, buildJoinUpdate(playerId, nickname, new Date(), seatToRelease));
};

/** One player of one room, saying they are still there. */
export interface MarkPresenceInput {
  readonly roomId: string;
  /** Firebase Auth UID of the player writing about themselves. */
  readonly playerId: string;
}

/**
 * Writes down that this player is still in the room, for everybody else to read.
 *
 * Called on a timer for as long as a client sits in a room that is being waited
 * in or played, so it is the most frequent write this app makes — and the
 * smallest: the one leaf field `players.<uid>.lastSeenAt` (see
 * {@link buildPresenceUpdate}). A client only ever writes its own mark; what
 * the others make of it is decided when they read it, never written down.
 *
 * @param input - The room and the player marking themselves present
 * @throws Error from Firebase when the write is rejected — which, since the
 * rules refuse writes to nothing else here, means the room has expired
 *
 * @example
 * await markPresence({ roomId, playerId });
 */
export const markPresence = async ({ roomId, playerId }: MarkPresenceInput): Promise<void> => {
  await writeToRoom(roomId, buildPresenceUpdate(playerId, new Date()));
};

/** The room to start, as its owner currently sees it. */
export interface StartGameInput {
  readonly roomId: string;
  /** The room document the players are looking at — its words and its players are dealt out. */
  readonly room: RoomDocument;
}

/**
 * Deals the words out among the players and opens the game.
 *
 * The assignment is drawn once, by the owner's browser, and written in a single
 * update, so everyone reads the same deal from their next snapshot — nobody
 * draws their own. Whoever joins between the draw and the write is not in it
 * and would have nothing to guess; the owner is the one who decides when
 * everybody is in, so the window is theirs to avoid.
 *
 * @param input - The room's id and the document as it stands
 * @throws Error from `assignWords` when the room has fewer than two players or
 * no words, and from Firebase when the write is rejected
 *
 * @example
 * await startGame({ roomId, room });
 */
export const startGame = async ({ roomId, room }: StartGameInput): Promise<void> => {
  const assignment = assignWords({
    wordCount: room.layout.placedWords.length,
    playerIds: Object.keys(room.players),
  });

  await writeToRoom(roomId, buildStartGameUpdate(assignment, new Date()));
};

/** A word one player has just answered. */
export interface RecordGuessInput {
  readonly roomId: string;
  /** UID of the player the word was hidden from — the one who answered it. */
  readonly playerId: string;
  /** Key of the word in the room's `words` map. */
  readonly wordId: string;
}

/**
 * Writes down that a word has been answered, for every screen at once.
 *
 * The check itself already happened on this client: the answer travels in the
 * room document that everybody fetched, so there is nobody else to ask
 * (`docs/decisions/0004-ui-only-word-visibility.md`). What is written is only
 * who solved it — the word's letters were in `layout` from the start, and it is
 * this field that lets every other client show them.
 *
 * @param input - The room, the player who answered, and which word
 * @throws Error from Firebase when the write is rejected — an expired room, or
 * a connection that never came back
 *
 * @example
 * await recordGuess({ roomId, playerId, wordId: 'w3' });
 */
export const recordGuess = async ({
  roomId,
  playerId,
  wordId,
}: RecordGuessInput): Promise<void> => {
  await writeToRoom(roomId, buildGuessUpdate(wordId, playerId, new Date()));
};

/**
 * Writes down that the game is over, for every screen at once.
 *
 * Deliberately not part of the write that records the last answer. Whether a
 * game is finished is read from the room as it comes back, so this is called by
 * whichever client sees a full board first — possibly by several of them within
 * the same second, which the single field it writes makes harmless
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
 *
 * @param roomId - Id of the room that has just been finished
 * @throws Error from Firebase when the write is rejected — an expired room, or
 * a connection that never came back
 *
 * @example
 * await completeGame('room-1');
 */
export const completeGame = async (roomId: string): Promise<void> => {
  await writeToRoom(roomId, buildCompletionUpdate(new Date()));
};

/**
 * Ends a game that is still on, for every screen at once.
 *
 * The opposite kind of write to {@link completeGame} in every way but its
 * shape: one player decided this, at a moment of their choosing, and no other
 * client would have arrived at it. It is called once, from the button that
 * asked them to confirm — never retried, because a refusal here means the room
 * has already ended and there is nothing left to end.
 *
 * @param roomId - Id of the room whose game is being ended
 * @throws Error from Firebase when the write is rejected — an expired room, a
 * room that ended a moment earlier, or a connection that never came back
 *
 * @example
 * await endGameEarly('room-1');
 */
export const endGameEarly = async (roomId: string): Promise<void> => {
  await writeToRoom(roomId, buildEarlyEndUpdate(new Date()));
};
