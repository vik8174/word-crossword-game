import Box from '@mui/material/Box';

import type { ExplainedWord } from '../rooms/word-visibility';
import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { nameOf } from './word-entry';
import { REFERENCE_SX, ROW_LAYOUT_SX, stateSx, WORD_RULE } from './word-row-styles';

interface WatchedWordListProps {
  /** The id of the heading that names the list. */
  readonly labelledBy: string;
  /** The words, every one in full, in the order the board numbers them. */
  readonly words: readonly ExplainedWord[];
  /** What a word that has not been answered says: "not yet" while the lesson goes on, "not answered" once it has ended. */
  readonly unansweredLabel: 'not yet' | 'not answered';
}

/**
 * One student's words, as a lesson's teacher reads them: a row for each, with its
 * number and way, the word in full, and whether it was answered
 * (`teacherRows`, `design/templates/state-tree.html` lines 706-714).
 *
 * The rows say how a word stands and do nothing, so they are rows and not
 * buttons. The state is said in words behind a tick, so no row is told from
 * another by a colour alone. The teacher's room lists these while the lesson is
 * on (`TeacherWordsPanel`) and its summary lists them when it has ended
 * (`LessonSummary`); the only difference is what an unanswered word says.
 *
 * @param props.labelledBy - Id of the list's heading
 * @param props.words - The words, from `wordViewFor`'s `watched` view
 * @param props.unansweredLabel - What an unanswered word says
 *
 * @example
 * <WatchedWordList labelledBy={headingId} words={view.left.words} unansweredLabel="not yet" />
 */
export const WatchedWordList = ({ labelledBy, words, unansweredLabel }: WatchedWordListProps) => (
  <Box
    component="ul"
    aria-labelledby={labelledBy}
    sx={{ listStyle: 'none', margin: `${inRem(10)} 0 0`, padding: 0 }}
  >
    {words.map((word) => (
      <Box
        component="li"
        key={word.id}
        sx={{ borderTop: WORD_RULE, '&:last-child': { borderBottom: WORD_RULE } }}
      >
        <Box sx={ROW_LAYOUT_SX}>
          <Box component="span" sx={REFERENCE_SX}>
            {nameOf(word)}
          </Box>

          <Box
            component="span"
            sx={{
              minWidth: 0,
              fontFamily: TEXT_FONT_FAMILY,
              overflowWrap: 'anywhere',
              fontStyle: 'italic',
              fontSize: inRem(22),
            }}
          >
            {word.word}
          </Box>

          <Box
            component="span"
            sx={
              word.isSolved
                ? stateSx(true)
                : { ...stateSx(false), color: STREET.ink, fontStyle: 'italic' }
            }
          >
            {word.isSolved ? (
              <>
                <span aria-hidden="true">✓ </span>answered
              </>
            ) : (
              unansweredLabel
            )}
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);
