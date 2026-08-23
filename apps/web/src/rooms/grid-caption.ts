/**
 * The line under the crossword, which is about the board below it.
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
 * One sentence, and all of it a count. The lobby and the game are told the
 * same thing because the board below is the same board either way: the words
 * were placed when the room was created, and starting a game deals them out
 * without moving any of them.
 *
 * That count is the one thing about the board nobody can see on it. Words that
 * did not fit the grid are not drawn anywhere, so how many are hidden in it is
 * not the length of the list somebody typed in.
 *
 * It is not a key to the board and does not try to be one. What the two kinds
 * of square mean — italics on the dashed ones, the highlighted ones to type
 * into — is said by `PlayerWordsPanel`, beside the very words each half is
 * about, which is a better place for it than a paragraph over the grid; saying
 * it here as well would only be a second copy.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for a board that is still to be filled in
 *
 * @example
 * openGridCaption(6); // '6 words are hidden in this grid.'
 */
export const openGridCaption = (wordCount: number): string =>
  `${wordCount} words are hidden in this grid.`;

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
 * The words this reader was explaining are still written in for them, as they
 * were all game — their own words, never anybody's to guess — so the caption
 * says so rather than promising a blank board it does not show.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for a board that will stay half empty
 *
 * @example
 * closedGridCaption(6); // 'Of the 6 words of this grid, the ones that were answered ...'
 */
export const closedGridCaption = (wordCount: number): string =>
  `Of the ${wordCount} words of this grid, the ones that were answered are in place; the rest stay blank, apart from any that were yours to explain.`;
