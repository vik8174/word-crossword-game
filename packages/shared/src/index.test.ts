import { describe, expect, it } from 'vitest';

import {
  assignWords,
  boardFormOf,
  checkGuess,
  generateCrossword,
  gridLettersOf,
  LATIN_EXT_RANGE,
  LATIN_RANGE,
  validateWordList,
} from './index';

describe('shared package entry point', () => {
  it('exposes every game-logic module the app builds a room from', () => {
    expect(generateCrossword).toBeTypeOf('function');
    expect(validateWordList).toBeTypeOf('function');
    expect(assignWords).toBeTypeOf('function');
    expect(checkGuess).toBeTypeOf('function');
    expect(gridLettersOf).toBeTypeOf('function');
    expect(boardFormOf).toBeTypeOf('function');
  });

  it('exposes the two unicode-ranges the face is served in', () => {
    expect(LATIN_RANGE).toMatch(/^U\+0000-00FF/);
    expect(LATIN_EXT_RANGE).toMatch(/^U\+0100-0130/);
  });
});
