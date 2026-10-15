import { describe, expect, it } from 'vitest';

import { unplacedSentence } from './unplaced-sentence';

describe('the sentence under "Some words did not fit into the crossword"', () => {
  it('says "This one" for a single word, and "it" for what to do with it', () => {
    expect(unplacedSentence(1)).toBe(
      'This one crosses nothing, so it is not in the grid. You can build the game without it, or go back and change the list.',
    );
  });

  it.each([
    [2, 'two'],
    [3, 'three'],
    [10, 'ten'],
  ])('writes %i as "%s"', (count, word) => {
    expect(unplacedSentence(count)).toBe(
      `These ${word} cross nothing, so they are not in the grid. You can build the game without them, or go back and change the list.`,
    );
  });

  it('falls back to digits above ten rather than saying "undefined"', () => {
    expect(unplacedSentence(11)).toContain('These 11 cross nothing');
  });
});
