import { useCallback, useState } from 'react';

/**
 * What the dialog says when the database refused the ending.
 *
 * Firestore keeps retrying a write it merely could not send, so a rejection
 * here means the database refused it outright. The cause worth naming is the
 * one the rules make likely: they refuse to move a room that has already ended,
 * so the other player finishing the crossword in the same second arrives here
 * too. Said in the dialog that asked for it.
 */
export const END_FAILED_MESSAGE =
  'The game could not be ended. The room may have expired, or it may have ended already. Reload the page to see where it stands.';

/**
 * The state of one ending a person asked for: whether it is on its way, and why
 * it did not go through.
 *
 * Shared by the two people who can end a room, a player of a pair game and a
 * lesson's teacher, which is why it is not in either screen. What is written,
 * and what is reported once it was, is the caller's: `end` is the whole of that.
 * It is not retried on the next snapshot, unlike the ending a full board asks
 * for: this one was a person's decision, and repeating it on their behalf is not
 * this screen's to do.
 *
 * @param end - Writes the ending, and whatever is reported after it; rejects when the write was refused
 * @returns `endGame` to call once the person has confirmed, and the state it leaves
 *
 * @example
 * const { isEnding, endError, endGame } = useEnding(() => endGameEarly(roomId));
 */
export const useEnding = (end: () => Promise<void>) => {
  const [isEnding, setIsEnding] = useState(false);
  // Kept apart from the answer's failure: they are two different sentences
  // about two different writes, and either may be the one that failed.
  const [endError, setEndError] = useState<string | null>(null);

  const endGame = useCallback(async () => {
    setIsEnding(true);
    setEndError(null);

    try {
      await end();
    } catch (error) {
      console.error('Ending the game failed', error);
      setEndError(END_FAILED_MESSAGE);
      setIsEnding(false);
    }
  }, [end]);

  return { isEnding, endError, endGame };
};
