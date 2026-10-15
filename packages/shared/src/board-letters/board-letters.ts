/**
 * Capital sharp s, U+1E9E. `ß` is the one letter that upper-cases to two (`SS`,
 * which JavaScript and CSS both do), and a square holds one letter. So the
 * board shows it as this one, which upper-cases to itself.
 */
const CAPITAL_SHARP_S = 'ẞ';

/**
 * The letters a word occupies in the grid, as the grid draws them.
 *
 * NFC first, so an accent typed as a separate mark is the one letter it
 * composes to; then upper case, with `ß` taken to {@link CAPITAL_SHARP_S}
 * before it can become `SS`. **Accents are kept**: `café` is `CAFÉ`, and `É` is
 * not `E`. The layout's cells, the crossing rule, the letters a player types
 * and the workshop's boards all go through this, which is what keeps them one
 * thing.
 *
 * A letter whose upper case is still longer than one character (see
 * {@link fitsOneSquare}) comes back longer: the validator refuses those, so
 * none reaches a grid.
 *
 * @param word - A word, or a single letter
 * @returns What the squares hold, in order
 *
 * @example
 * gridLettersOf('straße'); // 'STRAẞE'
 * gridLettersOf('kapı'); // 'KAPI'
 */
export const gridLettersOf = (word: string): string =>
  word.normalize('NFC').replaceAll('ß', CAPITAL_SHARP_S).toUpperCase();

/**
 * Whether a letter fills exactly one square once the board has drawn it.
 *
 * `ß` does (as `ẞ`). `ŉ`, `ǰ`, `ẖ`, `ẗ`, `ẘ`, `ẙ`, `ẚ` and the ligatures `ﬀ`
 * to `ﬆ` do not: their upper case is two letters, and a square cannot hold two.
 *
 * @param letter - One character
 */
export const fitsOneSquare = (letter: string): boolean => [...gridLettersOf(letter)].length === 1;

/**
 * A word in the form two words are compared by: the grid's letters, with the
 * marks taken off.
 *
 * Decomposed (NFD) after {@link gridLettersOf}, then every combining mark
 * dropped, so `café`, `CAFÉ` and `cafe` are one form. A letter with no
 * accent-free form of the same length has nothing to drop and is compared as
 * itself: `ẞ`, `Æ`, `Ø`, `Œ`, `Ł`, `Đ` and `Þ`. So `straße` and `strasse` are
 * two words, and `kapı` and `kapi` are one, because the board already draws
 * `ı` as `I` (and `ſ` as `S`).
 *
 * @param word - A word as typed
 * @returns Its comparison key
 *
 * @example
 * boardFormOf('café') === boardFormOf('CAFE'); // true
 * boardFormOf('straße') === boardFormOf('strasse'); // false
 */
export const boardFormOf = (word: string): string =>
  gridLettersOf(word).normalize('NFD').replace(/\p{M}/gu, '');
