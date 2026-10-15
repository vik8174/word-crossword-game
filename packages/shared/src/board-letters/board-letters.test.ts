import { describe, expect, it } from 'vitest';

import { boardFormOf, fitsOneSquare, gridLettersOf } from './board-letters';

describe('gridLettersOf', () => {
  it('upper-cases a word and keeps its accents', () => {
    expect(gridLettersOf('café')).toBe('CAFÉ');
    expect(gridLettersOf('łódź')).toBe('ŁÓDŹ');
  });

  it('composes an accent typed as a separate mark into the one letter', () => {
    expect(gridLettersOf('café')).toBe('CAFÉ');
    expect(gridLettersOf('café')).toHaveLength(4);
  });

  it('shows ß as ẞ, one letter, where the plain upper case would be SS', () => {
    expect(gridLettersOf('straße')).toBe('STRAẞE');
    expect([...gridLettersOf('straße')]).toHaveLength(6);
    expect('ß'.toUpperCase()).toBe('SS');
  });

  it('upper-cases the dotless ı and the long ſ to the letters the board already draws', () => {
    expect(gridLettersOf('kapı')).toBe('KAPI');
    expect(gridLettersOf('ſ')).toBe('S');
  });

  it('leaves ẞ as it is', () => {
    expect(gridLettersOf('STRAẞE')).toBe('STRAẞE');
  });
});

describe('fitsOneSquare', () => {
  it.each(['a', 'é', 'ß', 'ı', 'ł', 'ñ', 'Ɐ'])('is true for %s', (letter) => {
    expect(fitsOneSquare(letter)).toBe(true);
  });

  it.each(['ŉ', 'ǰ', 'ẖ', 'ẗ', 'ẘ', 'ẙ', 'ẚ', 'ﬀ', 'ﬁ', 'ﬂ', 'ﬃ', 'ﬄ', 'ﬅ', 'ﬆ'])(
    'is false for %s',
    (letter) => {
      expect(fitsOneSquare(letter)).toBe(false);
    },
  );

  it('is false for exactly these fourteen among every Latin letter of the basic plane', () => {
    const refused: string[] = [];

    for (let codePoint = 0; codePoint <= 0xffff; codePoint++) {
      const letter = String.fromCodePoint(codePoint);

      if (/^\p{Script=Latin}$/u.test(letter) && /^\p{L}$/u.test(letter) && !fitsOneSquare(letter)) {
        refused.push(letter);
      }
    }

    expect(refused.join('')).toBe('ŉǰẖẗẘẙẚﬀﬁﬂﬃﬄﬅﬆ');
  });
});

describe('boardFormOf', () => {
  it('is one form for café, CAFÉ, Cafe and a decomposed café', () => {
    const forms = ['café', 'CAFÉ', 'Cafe', 'café'].map(boardFormOf);

    expect(new Set(forms)).toEqual(new Set(['CAFE']));
  });

  it('treats ı and ſ as the I and S the board draws', () => {
    expect(boardFormOf('kapı')).toBe(boardFormOf('kapi'));
    expect(boardFormOf('ſ')).toBe('S');
  });

  it.each(['ẞ', 'Æ', 'Ø', 'Œ', 'Ł', 'Đ', 'Þ'])('compares %s as itself', (letter) => {
    expect(boardFormOf(letter)).toBe(letter);
    expect(boardFormOf(letter.toLowerCase())).toBe(letter);
  });

  it('keeps straße and strasse apart', () => {
    expect(boardFormOf('straße')).toBe('STRAẞE');
    expect(boardFormOf('straße')).not.toBe(boardFormOf('strasse'));
  });

  it('keeps two different letters apart', () => {
    expect(boardFormOf('łódź')).not.toBe(boardFormOf('lodz'));
    expect(boardFormOf('ł')).toBe('Ł');
  });
});
