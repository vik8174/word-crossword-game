/**
 * Public contract of the `word-list-validator` module — the rules a word list
 * must satisfy before a room can be created out of it.
 */

/** Smallest word list a game can be played with. */
export const MIN_WORDS = 10;
/** Largest word list a game can be played with. */
export const MAX_WORDS = 20;
/** Shortest word the crossword grid accepts. */
export const MIN_WORD_LENGTH = 3;
/** Longest word the crossword grid accepts. */
export const MAX_WORD_LENGTH = 12;

/**
 * What is wrong with a word list. Codes let the UI react (highlight a word,
 * pick an icon) without matching on message text.
 */
export type WordListErrorCode =
  | 'too-few-words'
  | 'too-many-words'
  | 'word-too-short'
  | 'word-too-long'
  | 'word-not-latin'
  | 'duplicate-word';

/** A single problem found in the word list, ready to be shown to the owner. */
export interface WordListError {
  readonly code: WordListErrorCode;
  /** English, user-facing, complete sentence. */
  readonly message: string;
  /** The offending word, present only for errors about one specific word. */
  readonly word?: string;
}

/**
 * The parsed word list together with everything wrong with it.
 *
 * `words` is filled in even when the list is invalid, so the UI can show a live
 * word count while the owner is still typing.
 */
export interface WordListValidation {
  /** Words as typed (whitespace trimmed, letter case preserved), in input order. */
  readonly words: readonly string[];
  readonly errors: readonly WordListError[];
  /** `true` only when `errors` is empty — the list can start a game as is. */
  readonly isValid: boolean;
}
