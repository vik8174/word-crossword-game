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

/** A word the crossword grid can render: English letters and nothing else. */
const LATIN_ONLY = /^[A-Za-z]+$/;

/** Key a word is compared by — duplicates differ only in letter case. */
const dedupeKey = (word: string): string => word.toLowerCase();

/**
 * Splits the raw textarea text into words, dropping empty fragments left by
 * trailing separators, blank lines and stray spaces.
 */
const parseWords = (rawText: string): string[] =>
  rawText.split(SEPARATORS).filter((word) => word.length > 0);

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

/** The single problem with one word, or `null` when the word is fine. */
const wordError = (word: string): WordListError | null => {
  if (!LATIN_ONLY.test(word)) {
    return {
      code: 'word-not-latin',
      message: `"${word}" must be written in English letters only.`,
      word,
    };
  }

  if (word.length < MIN_WORD_LENGTH) {
    return {
      code: 'word-too-short',
      message: `"${word}" is shorter than ${MIN_WORD_LENGTH} letters.`,
      word,
    };
  }

  if (word.length > MAX_WORD_LENGTH) {
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
 */
const wordErrors = (words: readonly string[]): WordListError[] => {
  const seen = new Set<string>();
  const reportedDuplicates = new Set<string>();
  const errors: WordListError[] = [];

  for (const word of words) {
    const key = dedupeKey(word);

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
 * repaired beyond trimming whitespace: a word that breaks a rule is reported,
 * not dropped, so the owner sees exactly what to fix. Letter case is preserved
 * as typed — the crossword renders uppercase, but the owner's spelling is what
 * gets stored.
 *
 * @param rawText - Contents of the word-list textarea
 * @returns The parsed words, the validation errors, and whether the list is usable
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
