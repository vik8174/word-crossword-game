import { describe, expect, it } from 'vitest';

import { characterKindOf, isWordLetter } from './character-kind';

describe('characterKindOf', () => {
  it('calls a Latin letter of the alphabet a letter', () => {
    for (const character of ['b', 'B', 'é', 'ß', 'ı', 'ł']) {
      expect(characterKindOf(character)).toBe('letter');
    }
  });

  it('calls a Greek or Cyrillic letter foreign, look-alikes included', () => {
    for (const character of ['β', 'Β', 'в', 'Р', 'А', 'Ζ', 'я']) {
      expect(characterKindOf(character)).toBe('foreign');
    }
  });

  it('calls a digit a digit and anything else a symbol', () => {
    expect(characterKindOf('7')).toBe('digit');
    expect(characterKindOf('-')).toBe('symbol');
    expect(characterKindOf('ŉ')).toBe('symbol');
  });
});

describe('isWordLetter', () => {
  it('accepts exactly the characters a word may hold', () => {
    expect(isWordLetter('b')).toBe(true);
    expect(isWordLetter('é')).toBe(true);
    expect(isWordLetter('ß')).toBe(true);
    expect(isWordLetter('ı')).toBe(true);
  });

  it('refuses a Greek or Cyrillic letter that looks Latin', () => {
    for (const character of ['β', 'Β', 'в', 'Р', 'Α', 'К']) {
      expect(isWordLetter(character)).toBe(false);
    }
  });
});
