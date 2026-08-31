/**
 * The one line a finished game has to say for itself.
 *
 * Two things say it, in two very different places: the panel beside the
 * finished board, and the cloth the room lays over the table at the moment the
 * game ends ({@link RewardCloth}). It is one sentence and not two, because it
 * is one fact — and because a sentence written twice is a sentence that will be
 * written two ways within a release.
 *
 * What it deliberately does not carry is a score. The game is cooperative in
 * its data and not merely in its mood: `guessedByPlayerId` does not always name
 * the person who earned a word, one that its crossings filled in entirely being
 * recorded against the player it was hidden from
 * (`docs/decisions/0011-typing-guesses-into-the-grid.md`), so any tally of who
 * did how much would be wrong in exactly the games that were most fun.
 */

/**
 * What the room did, said as one sentence about all of them.
 *
 * @param wordCount - How many words were on the board
 * @param playerCount - How many people were in the room
 * @returns The sentence
 *
 * @example
 * finishedGameSummary(12, 2); // 'You finished the crossword together — all 12 ...'
 */
export const finishedGameSummary = (wordCount: number, playerCount: number): string =>
  `You finished the crossword together — all ${wordCount} of its words, between the ${playerCount} of you.`;
