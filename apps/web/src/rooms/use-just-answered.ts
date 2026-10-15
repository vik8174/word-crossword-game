import { useState } from 'react';

/**
 * The card of the word answered most recently while this screen was open: the
 * one the line pegs and swings still.
 *
 * The first call records the words already answered, so a room opened with
 * words on the line pegs none of them (`docs/decisions/0039-the-street-wakes-up.md`).
 * A later call that finds a word that was not there before names it, and the
 * name is kept until the next answer, so the card keeps the class it was pegged
 * with and the movement is not started again by a redraw.
 *
 * @param answered - The answered words as the line spells them
 * @returns The newest word to appear since the screen opened, or `undefined` if none has
 *
 * @example
 * const justAnswered = useJustAnswered(answeredWords);
 * <Street cards={answeredWords} justAnswered={justAnswered} … />
 */
export const useJustAnswered = (answered: readonly string[]): string | undefined => {
  const [state, setState] = useState<{ seen: ReadonlySet<string>; latest: string | undefined }>(
    () => ({ seen: new Set(answered), latest: undefined }),
  );
  const fresh = answered.filter((word) => !state.seen.has(word));

  if (fresh.length > 0) {
    // While rendering rather than in an effect, so the card is drawn pegged in
    // the very render that draws it.
    setState({ seen: new Set(answered), latest: fresh[fresh.length - 1] });
  }

  return state.latest;
};
