import type { ReadableRoom } from './room-access';
import { wordIdAt } from './room-document';

/**
 * What one player may see of a room's words.
 *
 * The room document carries every word in plain text and every client fetches
 * all of it (see `docs/decisions/0004-ui-only-word-visibility.md`), so this
 * module is the line between what a player is allowed to see and what would
 * spoil their game. Nothing outside it should reach for `layout.placedWords`
 * when a player is looking.
 */

/** A word the viewer can see, and must explain to the others without saying it. */
export interface ExplainedWord {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
  readonly word: string;
}

/**
 * How a room's words stand for one player. Three situations, kept apart rather
 * than folded into one shape with empty fields, because two of them must show
 * no word at all and a caller should not be able to forget that.
 *
 * - `not-dealt` — the game has not started; nobody may see anything yet
 * - `dealt` — the words are split, and these are this player's two halves
 * - `left-out` — the game is on but no word is hidden from this player, so
 *   there is nothing they could be shown without handing them the crossword
 */
export type PlayerWordView =
  | { readonly kind: 'not-dealt' }
  | {
      readonly kind: 'dealt';
      /** Words hidden from someone else: this player sees them and explains them. */
      readonly toExplain: readonly ExplainedWord[];
      /**
       * How many words are hidden from this player. Deliberately a count and
       * not a list: their spelling is exactly what the player is here to work out.
       */
      readonly toGuessCount: number;
    }
  | { readonly kind: 'left-out' };

/** The one case that holds words, for whatever is allowed to render them. */
export type DealtWordView = Extract<PlayerWordView, { kind: 'dealt' }>;

/**
 * Splits a room's words into the ones this player explains and the ones they guess.
 *
 * A player of a game that is on always has at least one word hidden from them:
 * `assignWords` refuses to deal a crossword with fewer words than players. So
 * having none is not a thin share of the game — it means this player was not in
 * the deal, and every word of the crossword is one they may "explain". That
 * happens for real: somebody who joined between the owner reading the room and
 * the owner writing the deal is in the room but not in the assignment, a race
 * no client can close and no security rule can catch (the rules cannot walk the
 * `words` map). It is reported as `left-out`, and nothing is shown.
 *
 * A word not yet assigned belongs to neither half, so a room in the lobby shows
 * nobody anything. A word assigned to a player who is not in the room — nothing
 * in the security rules prevents another client from writing that — reads as
 * somebody else's word to guess, and is therefore spelled out to everybody,
 * including whoever was meant to guess it. That is the trust boundary
 * `docs/decisions/0004-ui-only-word-visibility.md` accepts: a client already in
 * a room can spoil the game for the room it is in, and no reading of the
 * document can tell that write apart from an honest one.
 *
 * @param room - The room document as read from Firestore
 * @param viewerId - Firebase Auth UID of the player looking at the screen
 * @returns Which of the three situations this player is in, with their words if any
 *
 * @example
 * wordViewFor(room, playerId); // { kind: 'dealt', toExplain: [...], toGuessCount: 2 }
 */
export const wordViewFor = (room: ReadableRoom, viewerId: string): PlayerWordView => {
  const assigned = room.layout.placedWords
    .map((placedWord, index) => {
      const id = wordIdAt(index);

      return { id, word: placedWord.word, hiddenFrom: room.words[id]?.hiddenFromPlayerId };
    })
    .filter((entry) => typeof entry.hiddenFrom === 'string');

  if (room.status === 'lobby' || assigned.length === 0) {
    return { kind: 'not-dealt' };
  }

  const toGuessCount = assigned.filter((entry) => entry.hiddenFrom === viewerId).length;

  if (toGuessCount === 0) {
    return { kind: 'left-out' };
  }

  return {
    kind: 'dealt',
    toExplain: assigned
      .filter((entry) => entry.hiddenFrom !== viewerId)
      .map(({ id, word }) => ({ id, word })),
    toGuessCount,
  };
};
