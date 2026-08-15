/**
 * How a guess and an answer are compared: edges trimmed, letter case dropped.
 *
 * Nothing inside the word is touched. A crossword word occupies one run of
 * cells with no gap in it, so whitespace in the middle of a guess is a
 * different answer, not the same one typed loosely.
 */
const normalize = (word: string): string => word.trim().toLowerCase();

/**
 * Whether a guess spells the word it is aimed at.
 *
 * Players type into grid cells and speak the words out loud, so how the owner
 * happened to capitalise a word when creating the room must not decide a game:
 * `BREAD`, `bread` and `Bread` are one answer. What is compared is the letters
 * themselves — a guess that is short a letter or carries an extra one is wrong,
 * however it is capitalised.
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
 */
export const checkGuess = (input: string, answer: string): boolean => {
  const expected = normalize(answer);

  return expected.length > 0 && normalize(input) === expected;
};
