import type { Timestamp } from 'firebase/firestore';
import type { CrosswordLayout } from 'shared';

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
    players: { [ownerId]: { nickname: ownerNickname, joinedAt: createdAt } },
    createdAt,
    expiresAt: new Date(createdAt.getTime() + ROOM_LIFETIME_MS),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTimestamp = (value: unknown): boolean =>
  isRecord(value) && typeof value.toMillis === 'function';

const isPlayer = (value: unknown): boolean =>
  isRecord(value) && typeof value.nickname === 'string' && isTimestamp(value.joinedAt);

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
 * `words` values are not inspected: nothing reads them yet, and the tickets
 * that do (#6, #7) are where their own invariants belong.
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
