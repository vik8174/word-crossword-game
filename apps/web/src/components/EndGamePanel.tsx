import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import { useId, useState } from 'react';

import { MOTION_DURATIONS_MS } from '../motion';
import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { PillButton } from './PillButton';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * What the control and its dialog say, for a game and for a lesson.
 *
 * The question is the dialog's accessible name. It does not branch on whether
 * the other player looks present. Every client in a room writes a mark every
 * fifteen seconds, so that reading can change while this dialog is open, and a
 * warning that rewrote itself under somebody's finger would be worse than one
 * that claims a little more than it has to. What is said is true in both cases:
 * whoever else is in this room loses the game too, and nothing brings it back
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
 *
 * A lesson is ended by its teacher alone and words it for them: both players
 * lose it, and the summary the teacher is promised is the lesson's
 * (`design/templates/state-tree.html`, `endDialog`, lines 981-994). The promise
 * is kept by #236, which builds every ending of a lesson.
 */
const COPY = {
  game: {
    control: 'End the game',
    controlBusy: 'Ending the game',
    title: 'End the game?',
    message:
      'The room closes for both of you and the words nobody guessed stay unguessed. This cannot be undone, and the game cannot be restarted from here.',
    keep: 'Keep playing',
  },
  lesson: {
    control: 'End the lesson',
    controlBusy: 'Ending the lesson',
    title: 'End the lesson?',
    message:
      'The room closes for both players and the words nobody guessed stay unguessed. You will see the lesson summary. This cannot be undone.',
    keep: 'Keep watching',
  },
} as const;

/**
 * The dialog's card (`.dialog`, `design/templates/state-tree.html` line 262): a
 * tile 440px wide at most, 16px round, ringed in ink with a hard shadow. The
 * veil behind it is `rgba(27, 45, 56, 0.45)` (`.modal-veil`, line 261).
 */
const DIALOG_PAPER_SX = {
  width: 'min(440px, 100%)',
  maxWidth: 'none',
  margin: inRem(16),
  padding: `${inRem(24)} ${inRem(24)} ${inRem(20)}`,
  borderRadius: inRem(16),
  backgroundColor: STREET.tile,
  backgroundImage: 'none',
  // Named, because the dialog stands in a portal outside the app's own ground.
  fontFamily: TEXT_FONT_FAMILY,
  boxShadow: `0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}, 4px 4px 0 0 ${STREET.ink}`,
} as const;

interface EndGamePanelProps {
  /** Ends the game; called once the player has confirmed. */
  readonly onEnd: () => void;
  /** `true` while the ending is being written; the room becomes a closed one on its own. */
  readonly isEnding: boolean;
  /** Why the last attempt did not go through, if it did not. */
  readonly errorMessage?: string;
  /**
   * Whether it is a lesson that is ended, by its teacher: the control and the
   * dialog are worded for them. A game by default.
   */
  readonly isLesson?: boolean;
}

/**
 * The way out of a game that cannot be finished.
 *
 * In a pair game both players are offered it, not the host alone. In a lesson
 * only the teacher is, and the students are offered nothing: the rules refuse
 * a student's ending, and the screen does not offer what is refused. The player who needs it is
 * whoever was left on their own, and that is as often the guest as the host:
 * after the deal, the words hidden from the host can be answered by nobody
 * else, so a host who walks away strands their guest exactly as a guest who
 * walks away strands their host.
 *
 * It is called "End the game" rather than "Leave" because that is what it does.
 * Once the words are dealt, a seat cannot be emptied — the security rules hold
 * every player in place, since a word is dealt to a UID and the win is read
 * from those same fields — so leaving alone is not a thing this game has to
 * offer. Naming the button after the smaller of the two acts would have been
 * naming it after the one that does not happen
 * (`docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`).
 *
 * The confirmation is the panel's own state rather than the caller's: what is
 * being decided is whether to ask for the write, which nothing outside this
 * component acts on. The dialog is the template's `playing/confirm`: "End it" is
 * the quiet button and "Keep playing" the loud one, because the irreversible
 * thing is never the loud one (issue #212). When the write is refused the same
 * dialog says so, with "Try again" in the quiet place (`playing/endfail`).
 *
 * The control is in the frame's header (`useFrameSlot`), so this renders the
 * control and the dialog and nothing around them.
 *
 * @param props.onEnd - Called once the player has confirmed the ending
 * @param props.isEnding - Whether the ending is on its way to the room
 * @param props.errorMessage - What the dialog says when the ending was refused
 * @param props.isLesson - Whether the one pressing it is a lesson's teacher
 *
 * @example
 * <EndGamePanel onEnd={endGame} isEnding={false} />
 */
export const EndGamePanel = ({
  onEnd,
  isEnding,
  errorMessage,
  isLesson = false,
}: EndGamePanelProps) => {
  const copy = COPY[isLesson ? 'lesson' : 'game'];
  const [isConfirming, setIsConfirming] = useState(false);
  // The failure the player has already read and put away with "Keep playing".
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const titleId = useId();

  const hasFailed = errorMessage !== undefined && errorMessage !== dismissedError;

  const ask = () => {
    setDismissedError(null);
    setIsConfirming(true);
  };

  const keepPlaying = () => {
    setIsConfirming(false);
    setDismissedError(errorMessage ?? null);
  };

  const end = () => {
    setIsConfirming(false);
    setDismissedError(null);
    onEnd();
  };

  return (
    <>
      <PillButton kind="link" onClick={ask} loading={isEnding}>
        {isEnding ? copy.controlBusy : copy.control}
      </PillButton>

      <Dialog
        open={isConfirming || hasFailed}
        onClose={keepPlaying}
        aria-labelledby={titleId}
        // It arrives with the drawing's own lift and fade (`.dialog` and
        // `.modal-veil` in `motion-styles.ts`), so MUI's fade-in is off; its
        // fade-out stays, on the one curve and the quick duration `theme.ts`
        // gives it.
        transitionDuration={{ enter: 0, exit: MOTION_DURATIONS_MS.settle }}
        slotProps={{
          paper: { className: 'dialog', sx: DIALOG_PAPER_SX },
          backdrop: {
            className: 'modal-veil',
            sx: { backgroundColor: 'rgba(27, 45, 56, 0.45)' },
          },
        }}
      >
        <Box component="h2" id={titleId} sx={{ margin: 0, fontSize: inRem(24), fontWeight: 700 }}>
          {copy.title}
        </Box>

        {/* The failure takes the place of the question: the game could not be
          ended, so there is nothing left to confirm, and "Try again" is the
          same press as "End it" (`playing/endfail`, template line 985). */}
        <Box
          component="p"
          role={hasFailed ? 'alert' : undefined}
          sx={{ margin: `${inRem(8)} 0 0`, fontSize: inRem(17), color: STREET.ink }}
        >
          {hasFailed ? errorMessage : copy.message}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: inRem(10),
            marginTop: inRem(20),
          }}
        >
          <PillButton kind="quiet" onClick={end}>
            {hasFailed ? 'Try again' : 'End it'}
          </PillButton>
          <PillButton onClick={keepPlaying}>{copy.keep}</PillButton>
        </Box>
      </Dialog>
    </>
  );
};
