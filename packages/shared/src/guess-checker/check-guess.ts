import { boardFormOf } from '../board-letters';

/**
 * How a guess and an answer are compared: edges trimmed, then both in the form
 * the board draws them in (`boardFormOf`) — capitals, accents dropped.
 *
 * Nothing inside the word is touched beyond that. A crossword word occupies one
 * run of cells with no gap in it, so whitespace in the middle of a guess is a
 * different answer, not the same one typed loosely.
 */
const comparable = (word: string): string => boardFormOf(word.trim());

/**
 * Whether a guess spells the word it is aimed at.
 *
 * Players type into grid cells and speak the words out loud, so how the owner
 * happened to capitalise or accent a word when creating the room must not
 * decide a game: `BREAD`, `bread` and `Bread` are one answer, and so are `cafe`,
 * `CAFÉ` and `café`. What is compared is the letters themselves — a guess that
 * is short a letter or carries an extra one is wrong, however it is
 * capitalised.
 *
 * A letter with no accent-free form of the same length is compared as itself:
 * `straße` is answered by `straße` and not by `strasse`, and `łódź` is not
 * answered by `lodz`. `kapı` is answered by `kapi`, because the board already
 * draws its `ı` as `I`.
 *
 * A word with no spelling has no right answer, so nothing matches it. That is
 * not a case a generated crossword produces, but it is the one where silently
 * accepting an empty guess would mark the whole grid solved.
 *
 * @param input - What the player typed, as typed
 * @param answer - The word as it is stored in the crossword
 * @returns `true` when the guess is that word
 *
 * @example
 * checkGuess('  BREAD ', 'bread'); // true
 * checkGuess('cafe', 'café'); // true
 */
export const checkGuess = (input: string, answer: string): boolean => {
  const expected = comparable(answer);

  return expected.length > 0 && comparable(input) === expected;
};
