import { type WordListError, type WordListErrorCode } from 'shared';
import { describe, expect, it } from 'vitest';

import {
  changeSentence,
  countSentence,
  FAULT_SENTENCES,
  sentenceFor,
  wordFaults,
} from './word-fault-sentences';

const fault = (code: WordListErrorCode, word?: string): WordListError => ({
  code,
  message: 'not shown',
  word,
});

describe('the sentences a wrong list is said in', () => {
  it.each([
    ['word-too-short', '“ox” is too short. A word needs 3 letters or more.'],
    ['word-too-long', '“ox” is too long. A word can have 16 letters at most.'],
    ['word-has-digit', '“ox” has a digit in it. Use letters only.'],
    ['word-not-latin', '“ox” is not written in Latin letters. Use a Latin alphabet only.'],
    ['word-has-symbol', '“ox” has a character that is not a letter. Use letters only.'],
    ['duplicate-word', '“ox” is in the list twice. Keep one of them.'],
  ] as const)('says %s as one pattern, the word, the fault, what to do', (code, sentence) => {
    expect(sentenceFor(fault(code, 'ox'))).toBe(sentence);
  });

  it('has a sentence for every code the validator can return', () => {
    expect(Object.keys(FAULT_SENTENCES).sort()).toEqual([
      'duplicate-word',
      'too-few-words',
      'too-many-words',
      'word-has-digit',
      'word-has-symbol',
      'word-not-latin',
      'word-too-long',
      'word-too-short',
    ]);
  });

  it('keeps the count out of the strip and gives it a sentence for beside the button', () => {
    const errors = [fault('too-few-words'), fault('duplicate-word', 'ox')];

    expect(wordFaults(errors).map((error) => error.code)).toEqual(['duplicate-word']);
    expect(countSentence(errors)).toBe('Add at least 10 words to go on.');
    expect(countSentence([fault('too-many-words')])).toBe('Remove words to go on: at most 20.');
    expect(countSentence([fault('duplicate-word', 'ox')])).toBeNull();
  });

  it('counts the distinct words a strip names, and gives the singular', () => {
    expect(changeSentence([fault('duplicate-word', 'ox')])).toBe('Change the word above to go on.');
    expect(changeSentence([fault('duplicate-word', 'ox'), fault('word-too-short', 'a')])).toBe(
      'Change the 2 words above to go on.',
    );
  });

  it('counts a word once however it is cased or accented: café and Cafe are one word', () => {
    expect(
      changeSentence([fault('word-has-symbol', 'cafè!'), fault('word-has-symbol', 'cafe!')]),
    ).toBe('Change the word above to go on.');
    expect(
      changeSentence([fault('duplicate-word', 'café'), fault('word-has-symbol', 'Cafe')]),
    ).toBe('Change the word above to go on.');
  });

  it('keeps two words apart that the game keeps apart: straße is not strasse', () => {
    expect(
      changeSentence([fault('word-has-symbol', 'straße!'), fault('word-has-symbol', 'strasse!')]),
    ).toBe('Change the 2 words above to go on.');
  });
});
