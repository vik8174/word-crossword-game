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
 * into — is said by `WordsToExplainPanel` and `WordsToGuessPanel`, each beside
 * the very words it is about and now on its own side of the board, which is a
 * better place for it than a paragraph over the grid; saying it here as well
 * would only be a second copy.
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
 * Said over the crossword a lesson's teacher watches: every word is on it, and
 * none is theirs to guess. It is read and not shown (the game room draws no
 * visible heading), so it says what the board is to somebody who cannot see
 * which squares are whose.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The caption for the teacher's board
 *
 * @example
 * watchedGridCaption(6); // '6 words are in this grid, and every one of them is shown to you.'
 */
export const watchedGridCaption = (wordCount: number): string =>
  `${wordsLabel(wordCount)} ${wordCount === 1 ? 'is' : 'are'} in this grid, and every one of them is shown to you.`;

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
 * Said under the drawing on a crossword whose room was closed with words still
 * unanswered (`state-tree.html`, line 1058).
 *
 * The words this reader was explaining are still written in for them, as they
 * were all game. They were never theirs to guess, and the card beside the board
 * says so, so this line says only what was answered and what was not.
 *
 * @param wordCount - How many words made it into the grid
 * @returns The line for a board that will stay half empty
 *
 * @example
 * closedGridCaption(6); // 'Of the 6 words, the ones that were answered are in place; the rest stay blank.'
 */
export const closedGridCaption = (wordCount: number): string =>
  `Of the ${wordCount} words, the ones that were answered are in place; the rest stay blank.`;

/**
 * A number of words, counted the way a sentence needs it.
 *
 * @param wordCount - How many words
 * @returns `1 word`, `6 words`
 *
 * @example
 * wordsLabel(1); // '1 word'
 */
export const wordsLabel = (wordCount: number): string =>
  wordCount === 1 ? '1 word' : `${wordCount} words`;

/**
 * Said under the lobby's drawing: what the crossword is, since the lobby shows
 * no board (the template's caption under `lobby`, line 947 of
 * `design/templates/state-tree.html`).
 *
 * With one word nobody can share it, so the sentence stops before the half.
 *
 * In a lesson it speaks of the players, not of "you": the teacher and the
 * students read the same line, and only two of them play.
 *
 * @param wordCount - How many words made it into the grid
 * @param isLesson - Whether the room is a lesson
 * @returns The caption for the drawing
 *
 * @example
 * lobbyCaption(6); // 'The crossword: 6 words, half of them for each of you.'
 * lobbyCaption(6, true); // 'The crossword: 6 words, half of them for each player.'
 */
export const lobbyCaption = (wordCount: number, isLesson = false): string => {
  if (wordCount === 1) {
    return 'The crossword: 1 word.';
  }

  const eachOf = isLesson ? 'player' : 'of you';

  return `The crossword: ${wordCount} words, half of them for each ${eachOf}.`;
};
