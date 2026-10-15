import { boardFormOf, fitsOneSquare } from '../board-letters';
import { LATIN_EXT_RANGE, LATIN_RANGE, parseUnicodeRange, spansContain } from '../font-ranges';
import {
  MAX_WORDS,
  MAX_WORD_LENGTH,
  MIN_WORDS,
  MIN_WORD_LENGTH,
  type WordListError,
  type WordListValidation,
} from './types';

/** Words are separated by commas or by any whitespace, in any combination. */
const SEPARATORS = /[\s,]+/;

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
type CharacterKind = 'digit' | 'foreign' | 'symbol' | 'letter';

/**
 * What one character is.
 *
 * A Latin letter that cannot fill one square (`ŉ`, `ǰ`, the ligatures) is
 * judged before the ranges, and as a symbol: it is Latin, so "not written in
 * Latin letters" would be untrue of it, and no square can hold it.
 */
const kindOf = (character: string): CharacterKind => {
  if (/^\p{Nd}$/u.test(character)) return 'digit';
  if (!/^\p{L}$/u.test(character)) return 'symbol';
  if (!/^\p{Script=Latin}$/u.test(character)) return 'foreign';
  if (!fitsOneSquare(character)) return 'symbol';

  return spansContain(ALPHABET, character.codePointAt(0) ?? 0) ? 'letter' : 'foreign';
};

/**
 * Splits the raw textarea text into words, dropping empty fragments left by
 * trailing separators, blank lines and stray spaces. Each word is NFC, so an
 * accent typed as a separate mark is the letter it composes to.
 */
const parseWords = (rawText: string): string[] =>
  rawText
    .split(SEPARATORS)
    .map((word) => word.normalize('NFC'))
    .filter((word) => word.length > 0);

/** Errors about the size of the list as a whole. */
const countErrors = (words: readonly string[]): WordListError[] => {
  if (words.length < MIN_WORDS) {
    return [
      {
        code: 'too-few-words',
        message: `Add at least ${MIN_WORDS} words — you have ${words.length}.`,
      },
    ];
  }

  if (words.length > MAX_WORDS) {
    return [
      {
        code: 'too-many-words',
        message: `Use at most ${MAX_WORDS} words — you have ${words.length}.`,
      },
    ];
  }

  return [];
};

/**
 * The fault in the characters of a word, or `null` when every one is a letter
 * of the alphabet.
 *
 * One fault, the first that applies, in the order an owner would mend them: a
 * digit, then a letter from another alphabet, then any other character.
 */
const characterFault = (word: string): WordListError | null => {
  const kinds = new Set([...word].map(kindOf));

  if (kinds.has('digit')) {
    return {
      code: 'word-has-digit',
      message: `“${word}” has a digit in it. Use letters only.`,
      word,
    };
  }

  if (kinds.has('foreign')) {
    return {
      code: 'word-not-latin',
      message: `“${word}” is not written in Latin letters.`,
      word,
    };
  }

  if (kinds.has('symbol')) {
    return {
      code: 'word-has-symbol',
      message: `“${word}” has a character that is not a letter.`,
      word,
    };
  }

  return null;
};

/** The single problem with one word, or `null` when the word is fine. */
const wordError = (word: string): WordListError | null => {
  const fault = characterFault(word);

  if (fault !== null) return fault;

  // Counted in letters, which is what the squares are: every letter of the
  // alphabet is one code point once the word is NFC.
  const length = [...word].length;

  if (length < MIN_WORD_LENGTH) {
    return {
      code: 'word-too-short',
      message: `"${word}" is shorter than ${MIN_WORD_LENGTH} letters.`,
      word,
    };
  }

  if (length > MAX_WORD_LENGTH) {
    return {
      code: 'word-too-long',
      message: `"${word}" is longer than ${MAX_WORD_LENGTH} letters.`,
      word,
    };
  }

  return null;
};

/**
 * Errors about individual words: each distinct word is judged once, in the
 * order it first appears, so repeating a bad word does not repeat its error.
 * Two words are the same word when their board forms are equal, so `café` and
 * `Cafe` are one word twice.
 */
const wordErrors = (words: readonly string[]): WordListError[] => {
  const seen = new Set<string>();
  const reportedDuplicates = new Set<string>();
  const errors: WordListError[] = [];

  for (const word of words) {
    const key = boardFormOf(word);

    if (seen.has(key)) {
      if (!reportedDuplicates.has(key)) {
        reportedDuplicates.add(key);
        errors.push({
          code: 'duplicate-word',
          message: `"${word}" is listed more than once.`,
          word,
        });
      }

      continue;
    }

    seen.add(key);

    const error = wordError(word);

    if (error !== null) errors.push(error);
  }

  return errors;
};

/**
 * Turns the raw text of the word-list textarea into the words a game would be
 * built from, plus everything that stops those words from starting a game.
 *
 * Words may be separated by commas, spaces or newlines. Nothing is silently
 * repaired beyond trimming whitespace and composing each word to NFC: a word
 * that breaks a rule is reported, not dropped, so the owner sees exactly what to
 * fix. Letter case is preserved as typed — the crossword renders uppercase, but
 * the owner's spelling is what gets stored.
 *
 * A word is written in the Latin alphabet of `LATIN_RANGE` and
 * `LATIN_EXT_RANGE`: accents are part of a letter (`ñandú` is five), and a
 * guess ignores them (`board-letters`). A word breaks one of three rules about
 * its characters, and the first that applies is the one reported: a digit, a
 * letter from another alphabet, any other character.
 *
 * @param rawText - Contents of the word-list textarea
 * @returns The parsed words in NFC, the validation errors, and whether the list is usable
 *
 * @example
 * validateWordList('apple, bread\ncheese');
 * // { words: ['apple', 'bread', 'cheese'], errors: [too-few-words], isValid: false }
 */
export const validateWordList = (rawText: string): WordListValidation => {
  const words = parseWords(rawText);
  const errors = [...countErrors(words), ...wordErrors(words)];

  return { words, errors, isValid: errors.length === 0 };
};
