/** The count, in words, from one to ten — the template says "These three", not "These 3". */
const NUMBER_WORDS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
] as const;

/**
 * The sentence under the heading: what was left out, and the two ways on.
 *
 * The count is in words for one to ten. A list can never drop more than ten
 * (a game holds at most twenty words and a crossword at least ten of them
 * cross), but a larger number is written in digits rather than failing.
 *
 * @param count - How many words are not in the grid
 */
export const unplacedSentence = (count: number): string => {
  const ways = 'You can build the game without them, or go back and change the list.';

  if (count === 1) {
    return `This one crosses nothing, so it is not in the grid. ${ways.replace('them', 'it')}`;
  }

  return `These ${NUMBER_WORDS[count - 1] ?? count} cross nothing, so they are not in the grid. ${ways}`;
};
