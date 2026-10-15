import { describe, expect, it } from 'vitest';

import { lobbyCaption, watchedGridCaption, wordsLabel } from './grid-caption';

describe('wordsLabel', () => {
  it('counts one word as a word and the rest as words', () => {
    expect(wordsLabel(1)).toBe('1 word');
    expect(wordsLabel(6)).toBe('6 words');
  });
});

describe('lobbyCaption', () => {
  it('says half of the words are for each player', () => {
    expect(lobbyCaption(6)).toBe('The crossword: 6 words, half of them for each of you.');
  });

  it('does not offer half of one word', () => {
    expect(lobbyCaption(1)).toBe('The crossword: 1 word.');
  });
});

describe('watchedGridCaption', () => {
  it('says every word is shown to the teacher, who is watching and not guessing', () => {
    expect(watchedGridCaption(6)).toBe(
      '6 words are in this grid, and every one of them is shown to you.',
    );
  });

  it('agrees with a crossword of one word', () => {
    expect(watchedGridCaption(1)).toBe(
      '1 word is in this grid, and every one of them is shown to you.',
    );
  });
});
