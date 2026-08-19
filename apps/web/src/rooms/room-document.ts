import type { Timestamp } from 'firebase/firestore';
import type { CrosswordLayout, WordAssignment } from 'shared';

/**
 * Shape of a room document in Firestore and the pure builder that produces a
 * brand new one. Deliberately free of any Firestore SDK call at runtime — only
 * a type import — so the shape can be built and asserted on without a database.
 *
 * The schema itself is fixed by `docs/decisions/0009-room-document-schema.md`;
 * tickets #5-#9 read and update these fields, so changing them is expensive.
 */

/** Firestore collection every room document lives in. */
export const ROOMS_COLLECTION = 'rooms';

/** How long a room survives without activity (24 hours), in milliseconds. */
export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * How far a room is in its life:
 * - `lobby` — created, players are still joining, words not assigned yet
 * - `playing` — words assigned to players, guessing is open
 * - `completed` — every word guessed
 *
 * A future turn-based mode adds a separate field rather than a status, so this
 * union stays about progress only (see PRD, GitHub issue #1).
 */
export type RoomStatus = 'lobby' | 'playing' | 'completed';

/** A participant of the room, keyed in the document by their Firebase Auth UID. */
export interface RoomPlayer<TTimestamp = Timestamp> {
  /** Name the player typed; the only thing other players see them by. */
  readonly nickname: string;
  /** When they first joined — also the ordering of the player list. */
  readonly joinedAt: TTimestamp;
  /**
   * When this player's own client last said it was still there, rewritten every
   * fifteen seconds while the room is being waited in or played (issue #47).
   *
   * Optional because a room written before presence existed has players without
   * it, and such a room must still be readable. Whoever asks the question falls
   * back to `joinedAt`, which is the last moment that room can honestly claim
   * anybody was seen — see `presence.ts`.
   */
  readonly lastSeenAt?: TTimestamp;
}

/**
 * The mutable state of one word of the crossword.
 *
 * The word's spelling and cells are not repeated here: they live in `layout`,
 * which never changes after creation. This entry holds only what the game
 * writes later, so a Firestore update touches a single small map value.
 */
export interface RoomWordState {
  /** UID of the player who must guess this word; `null` until words are assigned. */
  readonly hiddenFromPlayerId: string | null;
  /** UID of the player who guessed it; `null` while the word is unsolved. */
  readonly guessedByPlayerId: string | null;
}

/**
 * A room document, parameterised by how timestamps are represented.
 *
 * The client writes JavaScript `Date`s and Firestore converts them; reads come
 * back as `Timestamp`. One shape, two spellings — see `RoomDocument` and
 * `NewRoomDocument`.
 */
export interface RoomDocumentShape<TTimestamp> {
  readonly status: RoomStatus;
  /** UID of the player who created the room. They also play. */
  readonly ownerId: string;
  /** The crossword as generated at creation time; never modified afterwards. */
  readonly layout: CrosswordLayout;
  /**
   * Per-word state, keyed by word id (`w0`, `w1`, ...), where the number is the
   * index of the word in `layout.placedWords` — see {@link wordIdAt}.
   *
   * A map rather than an array: Firestore can update `words.w3.guessedBy...`
   * on its own, so two players solving different words at the same time cannot
   * overwrite each other, which rewriting a whole array would risk.
   */
  readonly words: Readonly<Record<string, RoomWordState>>;
  /** Players in the room, keyed by Firebase Auth UID. Empty rooms do not exist — the owner is always in. */
  readonly players: Readonly<Record<string, RoomPlayer<TTimestamp>>>;
  readonly createdAt: TTimestamp;
  /** When Firestore's TTL policy may delete this room. Refreshed on activity (issue #9). */
  readonly expiresAt: TTimestamp;
}

/** A room document as read back from Firestore. */
export type RoomDocument = RoomDocumentShape<Timestamp>;

/** A room document as handed to the Firestore SDK, which converts `Date` to `Timestamp`. */
export type NewRoomDocument = RoomDocumentShape<Date>;

/** Everything needed to describe a room that does not exist yet. */
export interface NewRoomInput {
  /** UID of the owner, already signed in. */
  readonly ownerId: string;
  readonly ownerNickname: string;
  readonly layout: CrosswordLayout;
  /** Creation moment; `expiresAt` is derived from it. */
  readonly createdAt: Date;
}

/**
 * Id of the word placed at `index` in `layout.placedWords`.
 *
 * This is the only binding between the immutable layout and the mutable
 * per-word state, so both sides must go through this function.
 *
 * @param index - Position of the word in `layout.placedWords`
 * @returns Key of that word inside the document's `words` map
 */
export const wordIdAt = (index: number): string => `w${index}`;

/**
 * Builds the document for a room that is about to be created.
 *
 * Only the words that made it into the grid become part of the room: whatever
 * the generator could not place is dropped here, after the owner has been
 * warned about it (user story 17).
 *
 * @param input - Owner, their nickname, the generated layout, and the creation moment
 * @returns The document to write, with every player and word field initialised
 * @throws Error when the layout holds no placed word — such a room is unplayable
 *
 * @example
 * buildRoomDocument({ ownerId: 'uid', ownerNickname: 'Vik', layout, createdAt: new Date() });
 */
export const buildRoomDocument = ({
  ownerId,
  ownerNickname,
  layout,
  createdAt,
}: NewRoomInput): NewRoomDocument => {
  if (layout.placedWords.length === 0) {
    throw new Error('Cannot create a room from a layout with no placed words.');
  }

  const words = Object.fromEntries(
    layout.placedWords.map((_placedWord, index) => [
      wordIdAt(index),
      { hiddenFromPlayerId: null, guessedByPlayerId: null },
    ]),
  );

  return {
    status: 'lobby',
    ownerId,
    layout,
    words,
    players: { [ownerId]: { nickname: ownerNickname, joinedAt: createdAt, lastSeenAt: createdAt } },
    createdAt,
    expiresAt: new Date(createdAt.getTime() + ROOM_LIFETIME_MS),
  };
};

declare const roomUpdateBrand: unique symbol;

/**
 * An update to an existing room — always one that postpones its expiry.
 *
 * The brand is a type-level marker and nothing carries it at runtime; what it
 * buys is that {@link buildRoomUpdate} is the only thing able to produce this
 * type. Since that is what the room service accepts, an update assembled by
 * hand cannot reach Firestore, and a write that forgets to keep the room alive
 * is a compile error rather than a room that dies mid-game (issue #9).
 */
export type RoomUpdate = Readonly<Record<string, unknown>> & {
  readonly [roomUpdateBrand]: true;
};

/**
 * An update to a room, with a fresh 24 hours added to its life.
 *
 * Every write a game makes goes through here, because `expiresAt` is not
 * housekeeping: the security rules check it on every update, so a room whose
 * expiry stopped moving stops accepting writes altogether — a game running past
 * its first day would die in the middle of itself.
 *
 * The expiry is written last and cannot be passed in: what keeps a room alive
 * is being played, never a value a caller chose.
 *
 * @param fields - Field paths and values the write is actually about
 * @param now - The moment of the write; the new lifetime is measured from it
 * @returns Those fields plus the postponed expiry, for a single `updateDoc` call
 *
 * @example
 * buildRoomUpdate({ status: 'completed' }, new Date());
 */
export const buildRoomUpdate = (fields: Readonly<Record<string, unknown>>, now: Date): RoomUpdate =>
  // The brand is not a property of the value, so the cast states the one thing
  // the type system cannot see: this object came from here.
  ({
    ...fields,
    expiresAt: new Date(now.getTime() + ROOM_LIFETIME_MS),
  }) as unknown as RoomUpdate;

/**
 * The update that puts one player into a room.
 *
 * Written as the single nested field `players.<uid>` rather than as a whole
 * `players` map, so two players arriving in the same second cannot overwrite
 * each other — and so a player coming back to their own link rewrites nothing
 * but their own entry, which is what the security rules allow and what makes
 * reconnecting work (see `docs/decisions/0009-room-document-schema.md`).
 *
 * @param playerId - Firebase Auth UID of the joining player
 * @param nickname - Already-normalised name the other players will see
 * @param now - The moment they joined; also what the room's new expiry is measured from
 * @returns Field path and value for a single `updateDoc` call
 *
 * @example
 * buildJoinUpdate('bob-uid', 'Bob', new Date());
 */
export const buildJoinUpdate = (playerId: string, nickname: string, now: Date): RoomUpdate =>
  buildRoomUpdate({ [`players.${playerId}`]: { nickname, joinedAt: now, lastSeenAt: now } }, now);

/**
 * The update one player writes to say they are still there.
 *
 * The single leaf field `players.<uid>.lastSeenAt`, never the player entry it
 * sits in. Rewriting the entry would rewrite `joinedAt` with it, and the player
 * list is ordered by exactly that value (`playersInJoinOrder` in
 * `room-access.ts`) — so a mark written every fifteen seconds would shuffle the
 * list on every beat, and every reconnect would send a player to the bottom
 * of it.
 *
 * A player only ever writes their own mark. Reading somebody else's is what the
 * others do with it (see `presence.ts`).
 *
 * @param playerId - Firebase Auth UID of the player marking themselves present
 * @param now - The moment they were last seen; the room's new expiry follows from it
 * @returns Field path and value for a single `updateDoc` call
 *
 * @example
 * buildPresenceUpdate('bob-uid', new Date());
 * // { 'players.bob-uid.lastSeenAt': ..., expiresAt: ... }
 */
export const buildPresenceUpdate = (playerId: string, now: Date): RoomUpdate =>
  buildRoomUpdate({ [`players.${playerId}.lastSeenAt`]: now }, now);

/**
 * The update that starts a game: the words are dealt out and the room begins.
 *
 * Written as one nested field per word (`words.w0.hiddenFromPlayerId`) rather
 * than as a whole `words` map, because the security rules refuse an update that
 * changes which words a room has — and because a player guessing a word at the
 * same moment writes a neighbouring field of the same map without either write
 * losing the other.
 *
 * @param assignment - Who guesses which word, by position in `layout.placedWords`
 * @param now - The moment the game started; the room's new expiry is measured from it
 * @returns Field paths and values for a single `updateDoc` call
 * @throws Error when the assignment covers no word — such a room cannot be played
 *
 * @example
 * buildStartGameUpdate(['bob-uid', 'alice-uid'], new Date());
 * // { status: 'playing', 'words.w0.hiddenFromPlayerId': 'bob-uid', ... }
 */
export const buildStartGameUpdate = (assignment: WordAssignment, now: Date): RoomUpdate => {
  if (assignment.length === 0) {
    throw new Error('Cannot start a game in which no word was assigned to anyone.');
  }

  return buildRoomUpdate(
    {
      status: 'playing',
      ...Object.fromEntries(
        assignment.map((playerId, index) => [
          `words.${wordIdAt(index)}.hiddenFromPlayerId`,
          playerId,
        ]),
      ),
    },
    now,
  );
};

/**
 * The update that records a word as answered.
 *
 * One nested field and nothing else, for the same reason the deal is written
 * that way: several players answer their own words within the same second, and
 * `words.w3.guessedByPlayerId` cannot overwrite `words.w4.guessedByPlayerId`.
 * Rewriting the whole `words` map would, and the security rules would refuse it
 * anyway — they check that a room keeps the words it was created with.
 *
 * Whether the room is now finished is not decided here: `status` stays as it is
 * (see GitHub issue #8).
 *
 * @param wordId - Key of the word in the room's `words` map, from {@link wordIdAt}
 * @param playerId - UID of the player who answered it
 * @param now - The moment it was answered; the room's new expiry is measured from it
 * @returns Field path and value for a single `updateDoc` call
 *
 * @example
 * buildGuessUpdate('w3', 'bob-uid', new Date());
 * // { 'words.w3.guessedByPlayerId': 'bob-uid', expiresAt: ... }
 */
export const buildGuessUpdate = (wordId: string, playerId: string, now: Date): RoomUpdate =>
  buildRoomUpdate({ [`words.${wordId}.guessedByPlayerId`]: playerId }, now);

/**
 * Whether a word has been answered.
 *
 * A word counts as answered only when its state names who answered it. The
 * security rules do not look inside the `words` map (see
 * `docs/decisions/0009-room-document-schema.md`), so a missing entry or an
 * empty string can reach a reader, and neither is an answer — which matters
 * most to the win condition, where one such word would end the game early.
 *
 * @param state - The room's state for one word, if it has one
 * @returns `true` when a player is recorded as having answered it
 */
export const isWordSolved = (state: RoomWordState | undefined): boolean =>
  typeof state?.guessedByPlayerId === 'string' && state.guessedByPlayerId.length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTimestamp = (value: unknown): boolean =>
  isRecord(value) && typeof value.toMillis === 'function';

// `lastSeenAt` is accepted as missing, and only as missing: a room written
// before presence existed has players without the field, while a value that is
// there but is not a timestamp is a document this app cannot read.
const isPlayer = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.nickname === 'string' &&
  isTimestamp(value.joinedAt) &&
  (value.lastSeenAt === undefined || isTimestamp(value.lastSeenAt));

const isLayout = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.rows === 'number' &&
  typeof value.cols === 'number' &&
  Array.isArray(value.cells) &&
  Array.isArray(value.placedWords);

/**
 * Reads a room document out of whatever Firestore handed back.
 *
 * This is a trust boundary. The security rules check that a room keeps its
 * shape, but deliberately not what is inside `players` and `words` (see
 * `docs/decisions/0009`), so any client already in a room can write nonsense
 * into a nickname. Rendering that unchecked would take the whole screen down
 * for everyone else, so a document that does not look like a room is treated
 * as no room at all.
 *
 * `words` values are not inspected here: what a nonsense `hiddenFromPlayerId`
 * or `guessedByPlayerId` means is a question about who may see what, and it is
 * answered in `word-visibility.ts`, which drops both.
 *
 * @param data - Raw `snapshot.data()`, of unknown shape
 * @returns The document when it is a room this app understands, `null` otherwise
 */
export const parseRoomDocument = (data: unknown): RoomDocument | null => {
  if (!isRecord(data)) {
    return null;
  }

  const isRoom =
    (data.status === 'lobby' || data.status === 'playing' || data.status === 'completed') &&
    typeof data.ownerId === 'string' &&
    isLayout(data.layout) &&
    isRecord(data.words) &&
    isRecord(data.players) &&
    Object.values(data.players).every(isPlayer) &&
    isTimestamp(data.createdAt) &&
    isTimestamp(data.expiresAt);

  // Narrowed by the checks above, one field at a time — TypeScript cannot carry
  // that through a single boolean, so the cast states what was just verified.
  return isRoom ? (data as unknown as RoomDocument) : null;
};
