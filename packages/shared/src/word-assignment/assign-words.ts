import {
  MIN_PLAYERS,
  type RandomSource,
  type WordAssignment,
  type WordAssignmentInput,
} from './types';

/**
 * The items in a random order, one draw from `random` per item.
 *
 * Each item is tagged with a single draw and the tags are sorted, so the order
 * is a genuine shuffle decided entirely by `random` — unlike a comparator that
 * draws afresh on every comparison, which sorts nothing in particular.
 */
const shuffled = <TItem>(items: readonly TItem[], random: RandomSource): readonly TItem[] =>
  items
    .map((item) => ({ item, draw: random() }))
    .sort((left, right) => left.draw - right.draw)
    .map(({ item }) => item);

/**
 * Decides which player has to guess which word.
 *
 * Every word ends up hidden from exactly one player and visible to all the
 * others, who explain it out loud. The words are split as evenly as the numbers
 * allow: nobody guesses more than one word above anyone else, and when the
 * words do not divide evenly, who carries the spare is drawn as well — so being
 * listed first in a room is worth nothing.
 *
 * The words themselves are never needed, only how many there are: the result is
 * bound to the caller's word order by position, which keeps this module free of
 * any knowledge of how a room is stored.
 *
 * @param input - How many words there are, who is playing, and where the draw comes from
 * @returns For each word, by position, the id of the player who must guess it
 * @throws Error when there are no words, or fewer than {@link MIN_PLAYERS} players
 *
 * @example
 * assignWords({ wordCount: 3, playerIds: ['alice', 'bob'] }); // ['bob', 'alice', 'bob']
 */
export const assignWords = ({
  wordCount,
  playerIds,
  random = Math.random,
}: WordAssignmentInput): WordAssignment => {
  if (wordCount < 1) {
    throw new Error('Cannot assign the words of a crossword that has none.');
  }

  if (playerIds.length < MIN_PLAYERS) {
    throw new Error(
      `Words can only be assigned to ${MIN_PLAYERS} players or more — someone has to explain them.`,
    );
  }

  // Drawn twice, for two different reasons: the seating decides who guesses one
  // word more than the rest, the second shuffle decides which words those are.
  const seating = shuffled(playerIds, random);
  const rounds = Math.ceil(wordCount / seating.length);
  const evenSpread = Array.from({ length: rounds }, () => seating)
    .flat()
    .slice(0, wordCount);

  return shuffled(evenSpread, random);
};
