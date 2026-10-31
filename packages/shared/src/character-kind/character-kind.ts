import { fitsOneSquare } from '../board-letters';
import { LATIN_EXT_RANGE, LATIN_RANGE, parseUnicodeRange, spansContain } from '../font-ranges';

/**
 * The alphabet: the letters Alegreya Sans is declared for, `LATIN_RANGE` and
 * `LATIN_EXT_RANGE` together. A letter is in it when it is a Latin letter and
 * lies in one of the two.
 *
 * Most of the letters that qualify are phonetic or medievalist, and the face
 * does not draw every one of them. A letter in the ranges that the face lacks is
 * accepted all the same and drawn in whatever face the reader's system falls
 * back to: checking each file's glyph table would need a font tool this project
 * does not have.
 */
const ALPHABET = [...parseUnicodeRange(LATIN_RANGE), ...parseUnicodeRange(LATIN_EXT_RANGE)];

/** What one character of a word is, as far as telling the owner what is wrong with it goes. */
export type CharacterKind = 'digit' | 'foreign' | 'symbol' | 'letter';

/**
 * What one character is.
 *
 * A digit is a digit in any script. A letter of another script (Greek,
 * Cyrillic, Han) is `foreign`, even when it is drawn exactly like a Latin one.
 * A Latin letter that cannot fill one square (`ŉ`, `ǰ`, the ligatures) is judged
 * before the ranges, and as a symbol: it is Latin, so "not written in Latin
 * letters" would be untrue of it, and no square can hold it.
 *
 * @param character - One character
 * @returns Its kind
 */
export const characterKindOf = (character: string): CharacterKind => {
  if (/^\p{Nd}$/u.test(character)) return 'digit';
  if (!/^\p{L}$/u.test(character)) return 'symbol';
  if (!/^\p{Script=Latin}$/u.test(character)) return 'foreign';
  if (!fitsOneSquare(character)) return 'symbol';

  return spansContain(ALPHABET, character.codePointAt(0) ?? 0) ? 'letter' : 'foreign';
};

/**
 * Whether a character is one a word may hold, and so one a square may take.
 * The word list's validator and the squares of the board both ask this.
 *
 * @param character - One character
 */
export const isWordLetter = (character: string): boolean => characterKindOf(character) === 'letter';
