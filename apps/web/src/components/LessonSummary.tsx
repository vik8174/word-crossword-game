import Box from '@mui/material/Box';
import { useId } from 'react';

import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import {
  answeredByPhrase,
  answeredCountOf,
  type WatchedExplanation,
  wordViewFor,
} from '../rooms/word-visibility';
import { inRem } from '../scale';
import { gateHintSx } from './gate-panel-styles';
import { lobbyHeadingSx } from './lobby-styles';
import { WatchedWordList } from './WatchedWordList';

/** What the summary is, said once under its heading (`lessonSummary`, template line 729). */
const SUMMARY_HINT =
  'What each player explained, and what the other one answered. No score: the game is played together. It stays here for as long as the room does, 24 hours.';

interface SummaryPartProps {
  /** The student who explained these words. */
  readonly explainerName: string;
  /** The student they were hidden from. */
  readonly guesserName: string;
  /** The words, with whether each was answered. */
  readonly explanation: WatchedExplanation;
}

/** One student's half: "{name} explained", how many were answered, and every word. */
const SummaryPart = ({ explainerName, guesserName, explanation }: SummaryPartProps) => {
  const headingId = useId();

  return (
    <Box component="div">
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: inRem(8),
          marginTop: inRem(18),
        }}
      >
        <Box
          component="h3"
          id={headingId}
          sx={{ ...lobbyHeadingSx, fontSize: inRem(19), fontWeight: 700, lineHeight: 1.5 }}
        >
          {`${explainerName} explained`}
        </Box>
        <Box component="span" sx={gateHintSx}>
          {answeredByPhrase(answeredCountOf(explanation.words), guesserName)}
        </Box>
      </Box>

      <WatchedWordList labelledBy={headingId} words={explanation.words} kind="summary" />
    </Box>
  );
};

interface LessonSummaryProps {
  /** The lesson, as it ended. */
  readonly room: RoomDocument;
  /** UID of the teacher looking at it: the word view is theirs. */
  readonly viewerId: string;
}

/**
 * What a lesson came to, for the teacher who ran it: per student, the words they
 * explained, how many of them the other one answered, and each word with
 * whether it was
 * (`lessonSummary`, `design/templates/state-tree.html` lines 725-732).
 *
 * It is the teacher's `watched` word view read after the ending, and nothing
 * more: the words, whether each is answered and the counts all come from
 * `wordViewFor` and `answeredCountOf`, so there is no second place that works
 * out who explained what. It is kept nowhere else (ADR 0037): it is drawn from
 * the room for as long as the room lives, 24 hours. There is no score and no
 * winner, since `guessedByPlayerId` does not always name who earned a word
 * (`docs/decisions/0011-typing-guesses-into-the-grid.md`) and a tally of it
 * would be wrong in the games that went best. On an ending that was not
 * finished the rows say "not answered", because those words are what the next
 * lesson is about. The students are named in join order, the first on the left,
 * as the teacher's room names them.
 *
 * It draws nothing for anybody who is not a lesson's teacher, or for a lesson
 * that never had both its students, as the word view shows them nothing.
 *
 * @param props.room - The room document
 * @param props.viewerId - The teacher's UID
 *
 * @example
 * <LessonSummary room={room} viewerId={room.ownerId} />
 */
export const LessonSummary = ({ room, viewerId }: LessonSummaryProps) => {
  const headingId = useId();
  const view = wordViewFor(room, viewerId);

  if (view.kind !== 'watched') {
    return null;
  }

  const players = playersInJoinOrder(room);
  const nameOf = (id: string) => players.find((player) => player.id === id)?.nickname ?? '';
  const leftName = nameOf(view.left.explainerId);
  const rightName = nameOf(view.right.explainerId);

  return (
    <Box component="section" aria-labelledby={headingId}>
      <Box component="h2" id={headingId} sx={lobbyHeadingSx}>
        Lesson summary
      </Box>
      <Box component="p" sx={gateHintSx}>
        {SUMMARY_HINT}
      </Box>

      <SummaryPart explainerName={leftName} guesserName={rightName} explanation={view.left} />
      <SummaryPart explainerName={rightName} guesserName={leftName} explanation={view.right} />
    </Box>
  );
};
