import { describe, expect, it } from 'vitest';

import { assignWords, checkGuess, generateCrossword, validateWordList } from './index';

describe('shared package entry point', () => {
  it('exposes every game-logic module the app builds a room from', () => {
    expect(generateCrossword).toBeTypeOf('function');
    expect(validateWordList).toBeTypeOf('function');
    expect(assignWords).toBeTypeOf('function');
    expect(checkGuess).toBeTypeOf('function');
  });
});
