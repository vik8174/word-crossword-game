import { describe, expect, it } from 'vitest';

import { letterTyped } from './guess-board';

describe('letterTyped', () => {
  it('refuses a Greek or Cyrillic letter, even one drawn like a Latin letter', () => {
    for (const value of ['β', 'Β', 'в', 'Р', 'Α', 'К']) {
      expect(letterTyped(value)).toBe('');
    }
  });

  it('still takes the Latin letters a word may hold', () => {
    expect(letterTyped('b')).toBe('B');
    expect(letterTyped('é')).toBe('É');
    expect(letterTyped('ß')).toBe('ẞ');
    expect(letterTyped('ı')).toBe('I');
  });

  it('draws a letter upper case, as the grid does', () => {
    expect(letterTyped('a')).toBe('A');
    expect(letterTyped('A')).toBe('A');
  });

  it('keeps an accent, and draws it upper case', () => {
    expect(letterTyped('é')).toBe('É');
    expect(letterTyped('ñ')).toBe('Ñ');
    expect(letterTyped('ł')).toBe('Ł');
  });

  it('composes an accent that arrived as a second character into the one letter', () => {
    expect(letterTyped('é')).toBe('É');
    expect(letterTyped('É')).toBe('É');
  });

  it('takes the last letter of what the square holds, composed', () => {
    // The letter that was in the square, then a decomposed é typed after it.
    expect(letterTyped('Aé')).toBe('É');
    expect(letterTyped('Ab')).toBe('B');
  });

  it('draws ß as ẞ, one letter where the plain upper case is SS', () => {
    expect(letterTyped('ß')).toBe('ẞ');
    expect(letterTyped('ẞ')).toBe('ẞ');
  });

  it('draws the dotless ı as the I the board draws it as', () => {
    expect(letterTyped('ı')).toBe('I');
  });

  it.each(['ŉ', 'ǰ', 'ẖ', 'ﬁ'])('is not typing for %s, which would take two squares', (letter) => {
    expect(letterTyped(letter)).toBe('');
  });

  it.each(['', '1', ' ', '!', '´', '́'])('is not typing for %j', (value) => {
    expect(letterTyped(value)).toBe('');
  });
});
