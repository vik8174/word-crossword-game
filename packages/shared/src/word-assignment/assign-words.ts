import {
  MIN_PLAYERS,
  type RandomSource,
  type RoomSize,
  type WordAssignment,
  type WordAssignmentInput,
  type WordAssignmentRefusal,
} from './types';

/**
 * Whether a room of this size can have its words dealt out, and if not, why.
 *
 * The single statement of when a game can begin. {@link assignWords} refuses on
 * exactly this, and a screen offering to start a game asks the same question
 * first, so the two cannot drift apart into a button that promises what the
 * deal will not do.
 *
 * @param size - How many words the crossword holds and how many players are in
 * @returns What stands in the way, or `null` when the words can be dealt
 *
 * @example
 * wordAssignmentRefusal({ wordCount: 3, playerCount: 4 }); // 'fewer-words-than-players'
 */
export const wordAssignmentRefusal = ({
  wordCount,
  playerCount,
}: RoomSize): WordAssignmentRefusal | null => {
  if (playerCount < MIN_PLAYERS) {
    return 'too-few-players';
  }

  // Everyone must be left with something to guess. A player with none is not
  // playing: nothing on their screen would be hidden, so the whole crossword
  // would be theirs to read.
  return wordCount < playerCount ? 'fewer-words-than-players' : null;
};

/** What a refused deal says to whoever wrote the calling code. */
const REFUSAL_MESSAGES: Readonly<Record<WordAssignmentRefusal, string>> = {
  'too-few-players': `Words can only be assigned to ${MIN_PLAYERS} players or more — someone has to explain them.`,
  'fewer-words-than-players':
    'Words can only be assigned when there are at least as many of them as there are players — everyone needs a word to guess.',
};

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
 * allow: everybody is left at least one word to guess, nobody guesses more than
 * one word above anyone else, and when the words do not divide evenly, who
 * carries the spare is drawn as well — so being listed first in a room is worth
 * nothing.
 *
 * The words themselves are never needed, only how many there are: the result is
 * bound to the caller's word order by position, which keeps this module free of
 * any knowledge of how a room is stored.
 *
 * @param input - How many words there are, who is playing, and where the draw comes from
 * @returns For each word, by position, the id of the player who must guess it
 * @throws Error for anything {@link wordAssignmentRefusal} objects to — too few
 * players, or fewer words than players
 *
 * @example
 * assignWords({ wordCount: 3, playerIds: ['alice', 'bob'] }); // ['bob', 'alice', 'bob']
 */
export const assignWords = ({
  wordCount,
  playerIds,
  random = Math.random,
}: WordAssignmentInput): WordAssignment => {
  const refusal = wordAssignmentRefusal({ wordCount, playerCount: playerIds.length });

  if (refusal !== null) {
    throw new Error(REFUSAL_MESSAGES[refusal]);
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
