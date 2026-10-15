import { describe, expect, it } from 'vitest';

import { checkGuess } from './check-guess';

describe('checkGuess', () => {
  it('accepts the word itself', () => {
    expect(checkGuess('bread', 'bread')).toBe(true);
  });

  it('does not care how the guess is capitalised', () => {
    expect(checkGuess('BREAD', 'bread')).toBe(true);
    expect(checkGuess('BrEaD', 'bread')).toBe(true);
  });

  it('does not care how the answer was typed into the word list', () => {
    expect(checkGuess('bread', 'Bread')).toBe(true);
  });

  it('ignores whitespace around either side', () => {
    expect(checkGuess('  bread \n', 'bread')).toBe(true);
    expect(checkGuess('bread', ' bread ')).toBe(true);
  });

  it('refuses a different word', () => {
    expect(checkGuess('breads', 'bread')).toBe(false);
    expect(checkGuess('dread', 'bread')).toBe(false);
  });

  it('refuses a guess broken up by whitespace, however it is spelled', () => {
    // Only the edges are trimmed: the crossword holds one word per run of
    // cells, so "br ead" is not the same answer typed loosely.
    expect(checkGuess('br ead', 'bread')).toBe(false);
  });

  it('refuses an empty guess', () => {
    expect(checkGuess('', 'bread')).toBe(false);
    expect(checkGuess('   ', 'bread')).toBe(false);
  });

  it('refuses everything when there is no answer to match', () => {
    // A word with no spelling cannot be guessed, and an empty guess least of all.
    expect(checkGuess('', '')).toBe(false);
    expect(checkGuess('bread', '   ')).toBe(false);
  });

  describe('accents and the letters that have no accent-free form', () => {
    it('answers café however the guess is accented or capitalised', () => {
      for (const guess of ['cafe', 'CAFÉ', 'café', 'Cafe', 'cafe\u0301', 'CAFE\u0301']) {
        expect(checkGuess(guess, 'café'), guess).toBe(true);
      }
    });

    it('answers a word stored without accents by a guess that has them', () => {
      expect(checkGuess('café', 'cafe')).toBe(true);
    });

    it('answers a word stored decomposed by the same word composed', () => {
      expect(checkGuess('CAFÉ', 'cafe\u0301')).toBe(true);
    });

    it('answers kapı with kapi, because the board draws the dotless ı as I', () => {
      expect(checkGuess('kapi', 'kapı')).toBe(true);
      expect(checkGuess('KAPI', 'kapı')).toBe(true);
      expect(checkGuess('kapı', 'kapi')).toBe(true);
    });

    it('answers straße by straße and not by strasse', () => {
      expect(checkGuess('straße', 'straße')).toBe(true);
      expect(checkGuess('STRAẞE', 'straße')).toBe(true);
      expect(checkGuess('strasse', 'straße')).toBe(false);
      expect(checkGuess('STRASSE', 'straße')).toBe(false);
    });

    it.each([
      ['ß', 'ss'],
      ['æ', 'ae'],
      ['ø', 'o'],
      ['œ', 'oe'],
      ['ł', 'l'],
      ['đ', 'd'],
      ['þ', 'th'],
    ])('compares %s as itself, not as %s', (letter, plain) => {
      expect(checkGuess(`a${letter}b`, `a${letter}b`)).toBe(true);
      expect(checkGuess(`a${plain}b`, `a${letter}b`)).toBe(false);
    });

    it('does not answer one accented letter by another', () => {
      expect(checkGuess('cafè', 'café')).toBe(true);
      expect(checkGuess('cafó', 'café')).toBe(false);
    });
  });
});
