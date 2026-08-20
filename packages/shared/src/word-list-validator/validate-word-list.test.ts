import { describe, expect, it } from 'vitest';

import { validateWordList } from './validate-word-list';
import type { WordListErrorCode } from './types';

const TEN_VALID = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

const TWENTY_VALID = `${TEN_VALID}, kitchen, ladder, monkey, needle, orange, pencil, rabbit, silver, temple, window`;

/** Replaces one word of an otherwise valid ten-word list, keeping the count at ten. */
const tenWordsWith = (word: string): string => TEN_VALID.replace('apple', word);

const codesOf = (text: string): WordListErrorCode[] =>
  validateWordList(text).errors.map((error) => error.code);

describe('validateWordList', () => {
  describe('parsing', () => {
    it('splits words on commas', () => {
      expect(validateWordList('apple,bread,cheese').words).toEqual(['apple', 'bread', 'cheese']);
    });

    it('splits words on newlines', () => {
      expect(validateWordList('apple\nbread\ncheese').words).toEqual(['apple', 'bread', 'cheese']);
    });

    it('accepts commas, newlines and spaces mixed in one list', () => {
      expect(validateWordList('apple, bread\ncheese  dinner').words).toEqual([
        'apple',
        'bread',
        'cheese',
        'dinner',
      ]);
    });

    it('ignores blank lines, stray separators and surrounding whitespace', () => {
      expect(validateWordList('  apple ,,\n\n  bread,\n').words).toEqual(['apple', 'bread']);
    });

    it('keeps each word in the letter case the owner typed', () => {
      expect(validateWordList('Apple, BREAD').words).toEqual(['Apple', 'BREAD']);
    });

    it('returns no words for text that holds none', () => {
      expect(validateWordList('   \n , \n ').words).toEqual([]);
    });
  });

  describe('a list the game accepts', () => {
    it('reports ten valid words as valid, with no errors', () => {
      const result = validateWordList(TEN_VALID);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports twenty valid words as valid', () => {
      expect(validateWordList(TWENTY_VALID).isValid).toBe(true);
    });

    it('accepts words at both length boundaries', () => {
      expect(validateWordList(tenWordsWith('cat')).isValid).toBe(true);
      expect(validateWordList(tenWordsWith('responsibilities')).isValid).toBe(true);
    });
  });

  describe('word count', () => {
    it('rejects fewer than ten words', () => {
      expect(codesOf('apple, bread, cheese')).toContain('too-few-words');
    });

    it('rejects more than twenty words', () => {
      expect(codesOf(`${TWENTY_VALID}, yellow`)).toContain('too-many-words');
    });

    it('rejects empty text as too few words rather than as valid', () => {
      const result = validateWordList('');

      expect(result.isValid).toBe(false);
      expect(result.errors.map((error) => error.code)).toEqual(['too-few-words']);
    });
  });

  describe('individual words', () => {
    it('rejects a word shorter than three letters', () => {
      expect(codesOf(tenWordsWith('ox'))).toContain('word-too-short');
    });

    it('rejects a word longer than sixteen letters', () => {
      expect(codesOf(tenWordsWith('misunderstandings'))).toContain('word-too-long');
    });

    it('rejects a word written outside the English alphabet', () => {
      expect(codesOf(tenWordsWith('яблуко'))).toContain('word-not-latin');
    });

    it('rejects a word carrying digits, hyphens or apostrophes', () => {
      expect(codesOf(tenWordsWith('e-mail'))).toContain('word-not-latin');
      expect(codesOf(tenWordsWith("don't"))).toContain('word-not-latin');
      expect(codesOf(tenWordsWith('room101'))).toContain('word-not-latin');
    });

    it('names the offending word in the error, so the owner can find it', () => {
      const [error] = validateWordList(tenWordsWith('ox')).errors;

      expect(error.word).toBe('ox');
      expect(error.message).toContain('ox');
    });

    it('reports every offending word, not only the first', () => {
      const result = validateWordList('ox, yak, яблуко, misunderstandings');
      const offenders = result.errors.filter((error) => error.word !== undefined);

      expect(offenders.map((error) => error.word)).toEqual(['ox', 'яблуко', 'misunderstandings']);
    });
  });

  describe('duplicates', () => {
    it('rejects a word listed twice', () => {
      expect(codesOf(`${TEN_VALID}, apple`)).toContain('duplicate-word');
    });

    it('treats words differing only in letter case as duplicates', () => {
      expect(codesOf(`${TEN_VALID}, APPLE`)).toContain('duplicate-word');
    });

    it('reports a word repeated many times only once', () => {
      const duplicates = validateWordList(`${TEN_VALID}, apple, apple, apple`).errors.filter(
        (error) => error.code === 'duplicate-word',
      );

      expect(duplicates).toHaveLength(1);
    });
  });

  it('reports a count problem and a word problem together', () => {
    expect(codesOf('ox, yak')).toEqual(expect.arrayContaining(['too-few-words', 'word-too-short']));
  });
});
