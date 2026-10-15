import {
  MAX_WORD_LENGTH,
  MAX_WORDS,
  MIN_WORD_LENGTH,
  MIN_WORDS,
  type WordListError,
  type WordListErrorCode,
} from 'shared';

/**
 * The sentences a wrong word list is said in, one per validator error code.
 *
 * One map, typed as exhaustive: a new code in the validator fails the build
 * until it has a sentence here (issue #225). The validator's own `message` is
 * not shown. A sentence about a word is one pattern, “{word}” {what is wrong}.
 * {what to do}., said inside the field. A sentence about the count is not said
 * in the field: it stands beside the disabled button.
 */
export const FAULT_SENTENCES: Record<WordListErrorCode, (word: string) => string> = {
  'word-too-short': (word) =>
    `“${word}” is too short. A word needs ${MIN_WORD_LENGTH} letters or more.`,
  'word-too-long': (word) =>
    `“${word}” is too long. A word can have ${MAX_WORD_LENGTH} letters at most.`,
  'word-not-latin': (word) => `“${word}” has a character that is not a letter. Use letters only.`,
  'duplicate-word': (word) => `“${word}” is in the list twice. Keep one of them.`,
  'too-few-words': () => `Add at least ${MIN_WORDS} words to go on.`,
  'too-many-words': () => `Remove words to go on: at most ${MAX_WORDS}.`,
};

/** The sentence for a crossword that cannot be built at all (the generator's, not the validator's). */
export const NO_CROSSING_SENTENCE =
  'None of these words share a letter, so nothing can cross. Swap in a few that do.';

/** A fault about the number of words, which is said beside the button and not in the field. */
const isCountFault = (error: WordListError): boolean =>
  error.code === 'too-few-words' || error.code === 'too-many-words';

/** The faults about one word each — the ones the strip in the field carries. */
export const wordFaults = (errors: readonly WordListError[]): readonly WordListError[] =>
  errors.filter((error) => !isCountFault(error));

/** The sentence that stands beside the button for a wrong count, or `null` when the count is right. */
export const countSentence = (errors: readonly WordListError[]): string | null => {
  const fault = errors.find(isCountFault);

  return fault === undefined ? null : FAULT_SENTENCES[fault.code]('');
};

/** The sentence one fault is said in. */
export const sentenceFor = (error: WordListError): string =>
  FAULT_SENTENCES[error.code](error.word ?? '');

/**
 * The line beside the button while the strip is showing: how many distinct
 * words it names, singular given.
 *
 * @param errors - The word faults the strip carries
 */
export const changeSentence = (errors: readonly WordListError[]): string => {
  const named = new Set(errors.map((error) => (error.word ?? '').toLowerCase()));

  return named.size === 1
    ? 'Change the word above to go on.'
    : `Change the ${named.size} words above to go on.`;
};

/** The line beside the button when nothing crosses. */
export const CHANGE_LIST_SENTENCE = 'Change the list to go on.';

/** The line beside the button while the nickname is empty. */
export const NICKNAME_SENTENCE = 'Type a nickname to go on.';
