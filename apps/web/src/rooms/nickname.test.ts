import { describe, expect, it } from 'vitest';

import { isValidNickname, MAX_NICKNAME_LENGTH, normalizeNickname } from './nickname';

describe('normalizeNickname', () => {
  it('drops surrounding whitespace', () => {
    expect(normalizeNickname('  Vik  ')).toBe('Vik');
  });

  it('collapses whitespace inside the nickname', () => {
    expect(normalizeNickname('Vik   the\tOwner')).toBe('Vik the Owner');
  });
});

describe('isValidNickname', () => {
  it('accepts an ordinary nickname', () => {
    expect(isValidNickname('Vik')).toBe(true);
  });

  it('accepts a nickname written in any alphabet', () => {
    expect(isValidNickname('Віктор')).toBe(true);
  });

  it('rejects a nickname of nothing but whitespace', () => {
    expect(isValidNickname('   ')).toBe(false);
  });

  it('accepts a nickname of exactly the maximum length', () => {
    expect(isValidNickname('n'.repeat(MAX_NICKNAME_LENGTH))).toBe(true);
  });

  it('rejects a nickname longer than the player list can show', () => {
    expect(isValidNickname('n'.repeat(MAX_NICKNAME_LENGTH + 1))).toBe(false);
  });
});
