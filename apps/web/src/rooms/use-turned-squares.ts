import { useState } from 'react';

/** A word is told from another by the squares it runs through, in order. */
const wordKey = (cells: readonly string[]): string => cells.join('|');

/**
 * The squares that turn over because a word was answered while this board was
 * on the screen, each with its place in that word.
 *
 * It exists because the board must turn a word's squares over once, on every
 * client, the moment the word turns answered in that client's view, and never
 * on a redraw or when the room is opened with the word already answered
 * (`docs/decisions/0039-the-street-wakes-up.md`). The first call records the
 * words answered already, so a room opened on a half-played game turns nothing.
 * Each later call turns the words that were not there before.
 *
 * The answer outlives the turn: a square stays in the map, with the place it
 * first had, so its class and its delay do not change under a finished
 * animation and start it again. A square that two answered words cross keeps the
 * place of the first.
 *
 * @param answered - The squares of every answered word, as `row:col` keys in the word's order
 * @returns The place in its word of each square that turned over, by `row:col` key
 *
 * @example
 * const turned = useTurnedSquares(answeredWordCellKeys(room));
 * turned.get('4:1'); // 0 when the first square of a word answered just now
 */
export const useTurnedSquares = (
  answered: readonly (readonly string[])[],
): ReadonlyMap<string, number> => {
  const [state, setState] = useState(() => ({
    seen: new Set(answered.map(wordKey)),
    turned: new Map<string, number>(),
  }));
  const fresh = answered.filter((cells) => !state.seen.has(wordKey(cells)));

  if (fresh.length > 0) {
    // Set while rendering rather than in an effect, so the square is drawn
    // turning in the very render that draws it answered.
    const turned = new Map(state.turned);

    for (const cells of fresh) {
      cells.forEach((key, place) => {
        if (!turned.has(key)) {
          turned.set(key, place);
        }
      });
    }

    setState({ seen: new Set(answered.map(wordKey)), turned });
  }

  return state.turned;
};
