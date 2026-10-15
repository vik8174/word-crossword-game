import Box from '@mui/material/Box';
import { useId } from 'react';

import { answeredByLine, answeredCountOf, type ExplainedWord } from '../rooms/word-visibility';
import { inRem } from '../scale';
import { STREET } from '../street';
import { gateHintSx } from './gate-panel-styles';
import { lobbyHeadingSx } from './lobby-styles';
import { Swatch } from './Swatch';
import { WatchedWordList } from './WatchedWordList';

interface TeacherWordsPanelProps {
  /** Which of the two colours the student's words are drawn in on the board. */
  readonly face: 'left' | 'right';
  /** The nickname of the student who explains these words. */
  readonly explainerName: string;
  /** The nickname of the student they are hidden from. */
  readonly guesserName: string;
  /** The words, every one in full, in the order the board numbers them. */
  readonly words: readonly ExplainedWord[];
}

/**
 * One student's words, as the teacher reads them: every word in full, and
 * whether the other student has answered it yet
 * (`explainerSection`, `design/templates/state-tree.html` lines 721-724).
 *
 * The rows say how a word stands and do nothing, so they are rows and not
 * buttons: the template draws them as buttons with no action, and a control
 * that does nothing is a control a reader is told about and cannot use. The
 * teacher has no word to be taken to, either, since the board is not theirs to
 * move about. A row says its number, its way, the word, and "answered" behind a
 * tick or "not yet", so no row is told from another by a colour alone.
 *
 * The count under the list is the one the lesson summary will say again
 * (`answeredCountOf`).
 *
 * @param props.face - Whose colour the heading's swatch is
 * @param props.explainerName - Who explains the words
 * @param props.guesserName - Who guesses them
 * @param props.words - The words, from `wordViewFor`'s `watched` view
 *
 * @example
 * <TeacherWordsPanel face="left" explainerName="Olena" guesserName="Taras" words={view.left.words} />
 */
export const TeacherWordsPanel = ({
  face,
  explainerName,
  guesserName,
  words,
}: TeacherWordsPanelProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <Box component="h2" id={headingId} sx={lobbyHeadingSx}>
        <Swatch face={face} />
        {`${explainerName} explains`}
      </Box>
      <Box component="p" sx={gateHintSx}>
        {`${guesserName} guesses these. You see every word in full; each player sees only the ones they explain.`}
      </Box>

      <WatchedWordList labelledBy={headingId} words={words} unansweredLabel="not yet" />

      <Box
        component="p"
        role="status"
        sx={{ margin: `${inRem(10)} 0 0`, fontSize: inRem(16), color: STREET.slate }}
      >
        {answeredByLine(answeredCountOf(words), guesserName)}
      </Box>
    </section>
  );
};
