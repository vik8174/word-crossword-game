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
});
