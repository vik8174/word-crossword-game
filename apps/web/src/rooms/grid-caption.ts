/**
 * The line under the crossword, which is about what the squares are for.
 *
 * A room says three different things about the same board — one while it is
 * still being filled in, one when it was filled in, one when it was closed
 * without being — so each screen asks for its own line rather than for a line
 * built out of flags about the others. Kept here, beside `lobby-status.ts` and
 * for the same reason: the wording is decided where it can be read on its own.
 */

/**
 * Said while the crossword is still open, in the lobby and during the game.
 *
 * The lobby has nothing dealt out yet and nothing to type into, and is told
 * this anyway: what the squares are for does not change between waiting for the
 * game and playing it, and the board below is the same board either way.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for a board that is still to be filled in
 *
 * @example
 * openGridCaption(6); // '6 words are hidden in this grid. Type your own ...'
 */
export const openGridCaption = (wordCount: number): string =>
  `${wordCount} words are hidden in this grid. Type your own into the squares that take letters; a word's letters appear for everybody once it has been answered.`;

/**
 * Said over a crossword that really was finished — every word is on the board.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for a full board
 *
 * @example
 * finishedGridCaption(6); // 'All 6 words of this grid are in place.'
 */
export const finishedGridCaption = (wordCount: number): string =>
  `All ${wordCount} words of this grid are in place.`;

/**
 * Said over a crossword whose room was closed with words still unanswered.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for a board that will stay half empty
 *
 * @example
 * closedGridCaption(6); // 'Of the 6 words of this grid, the ones that were answered ...'
 */
export const closedGridCaption = (wordCount: number): string =>
  `Of the ${wordCount} words of this grid, the ones that were answered are in place; the rest stay blank.`;
