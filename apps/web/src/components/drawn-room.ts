import { gridLettersOf } from 'shared';

import { type RoomDocument, type RoomStatus, wordIdAt } from '../rooms/room-document';

/**
 * The drawing's boards as room documents, for the workshop: the six words of
 * `size=few` and the eight of `size=many` (`state-tree.html`, `FEW_BOARD` and
 * `MANY_BOARD`), dealt to a host and a guest. The room's stories read them
 * so that every screen is drawn from the same two boards.
 */

export const OWNER_ID = 'owner-uid';
export const GUEST_ID = 'guest-uid';
export const STRANGER_ID = 'stranger-uid';

/** One word of the drawing's boards: where it starts, which way, and who explains it. */
export interface DrawnWord {
  readonly row: number;
  readonly col: number;
  readonly orientation: 'across' | 'down';
  readonly word: string;
  /** `viewer` explains it to the guest; `other` is explained to the viewer. */
  readonly explainedBy: 'viewer' | 'other';
  readonly isAnswered?: boolean;
}

/**
 * The six words of the drawing's `size=few` board, 9 by 7 (`state-tree.html`,
 * `FEW_BOARD`, line 723): the viewer explains `bread` (answered), `dinner` and
 * `flower`, and guesses `engine`, `cheese` and `apple`.
 */
export const FEW: readonly DrawnWord[] = [
  { row: 0, col: 2, orientation: 'across', word: 'bread', explainedBy: 'viewer', isAnswered: true },
  { row: 0, col: 4, orientation: 'down', word: 'engine', explainedBy: 'other' },
  { row: 1, col: 7, orientation: 'down', word: 'cheese', explainedBy: 'other' },
  { row: 2, col: 1, orientation: 'down', word: 'apple', explainedBy: 'other' },
  { row: 3, col: 3, orientation: 'across', word: 'dinner', explainedBy: 'viewer' },
  { row: 5, col: 0, orientation: 'across', word: 'flower', explainedBy: 'viewer' },
];

/** The eight words of `size=many`, 11 by 11: the six, and `ribbon` (answered) and `needle`. */
export const MANY: readonly DrawnWord[] = [
  ...FEW,
  { row: 5, col: 5, orientation: 'down', word: 'ribbon', explainedBy: 'other', isAnswered: true },
  { row: 10, col: 5, orientation: 'across', word: 'needle', explainedBy: 'viewer' },
];

/** A stand-in for Firestore's `Timestamp`: the game reads `toMillis` and nothing else. */
const at = (millis: number) => ({ toMillis: () => millis });

/**
 * A game in progress, built from the drawing's words, as the room document
 * holds it.
 *
 * @param words - The words on the board
 * @param rows - How many rows the board has
 * @param cols - How many columns it has
 * @param silentFor - How long ago each player last marked themselves present, by id
 * @param withStranger - Whether a third player stands in the room whom the deal left out
 * @param status - What the room is doing: `playing` unless it has ended
 */
export const gameRoom = (
  words: readonly DrawnWord[],
  rows: number,
  cols: number,
  silentFor: Readonly<Record<string, number>> = {},
  withStranger = false,
  status: RoomStatus = 'playing',
): RoomDocument => {
  const now = Date.now();
  const cells = new Map<string, { row: number; col: number; letter: string }>();

  const placedWords = words.map((drawn) => {
    // Each square is drawn as the grid draws it (`gridLettersOf`): upper case,
    // `ß` as `ẞ`, accents kept. Not in the comparison key (`boardFormOf`), which
    // is for telling words apart and would draw `łódź` as `ŁODZ`.
    const positions = [...gridLettersOf(drawn.word)].map((letter, index) => {
      const row = drawn.row + (drawn.orientation === 'down' ? index : 0);
      const col = drawn.col + (drawn.orientation === 'across' ? index : 0);

      cells.set(`${row}:${col}`, { row, col, letter });

      return { row, col };
    });

    return { word: drawn.word, orientation: drawn.orientation, cells: positions };
  });

  return {
    status,
    ownerId: OWNER_ID,
    layout: { rows, cols, cells: [...cells.values()], placedWords, unplacedWords: [] },
    words: Object.fromEntries(
      words.map((drawn, index) => {
        const hiddenFrom = drawn.explainedBy === 'viewer' ? GUEST_ID : OWNER_ID;

        return [
          wordIdAt(index),
          {
            hiddenFromPlayerId: hiddenFrom,
            guessedByPlayerId: drawn.isAnswered === true ? hiddenFrom : null,
          },
        ];
      }),
    ),
    players: {
      [OWNER_ID]: {
        nickname: 'Viktor',
        joinedAt: at(0),
        lastSeenAt: at(now - (silentFor[OWNER_ID] ?? 0)),
      },
      [GUEST_ID]: {
        nickname: 'Olena',
        joinedAt: at(1),
        lastSeenAt: at(now - (silentFor[GUEST_ID] ?? 0)),
      },
      // Joined in the instant before the deal, so the deal covers neither of the
      // two words' halves for them (`playing/leftout`).
      ...(withStranger
        ? { [STRANGER_ID]: { nickname: 'Taras', joinedAt: at(2), lastSeenAt: at(now) } }
        : {}),
    },
    createdAt: at(0),
    expiresAt: at(now + 86_400_000),
  } as unknown as RoomDocument;
};
