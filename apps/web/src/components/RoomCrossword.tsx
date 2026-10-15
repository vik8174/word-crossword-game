import Box from '@mui/material/Box';
import { type ReactNode, useMemo } from 'react';

import type { RoomDocument } from '../rooms/room-document';
import {
  answeredWordCellKeys,
  gridViewFor,
  watchedGridFor,
  type WordLocation,
} from '../rooms/word-visibility';
import { inRem } from '../scale';
import { STREET } from '../street';
import type { BandAbove } from './board-geometry';
import { CrosswordGrid } from './CrosswordGrid';
import { CROSSWORD_HEADING_ID, CrosswordHeading } from './CrosswordHeading';
import { Message } from './Message';
import { SENTENCE_BAND_SX, UNSEEN_HEADING } from './surface-styles';
import { TeacherGrid } from './TeacherGrid';
import { useBandShown } from './use-band-shown';

/**
 * Stands in for a board that takes no answers.
 *
 * Not a fallback so much as a statement of what is already true: `gridViewFor`
 * hands over an empty `toGuess` for every room that is not `playing`, and
 * {@link CrosswordGrid} only ever reports a word it was given. A screen that
 * passes no handler therefore has no word that could reach this.
 */
const TAKES_NO_ANSWERS = () => Promise.resolve();

/** What stands above the board, from whether the drawing is shown and whether it has a line under it. */
const bandAboveOf = (isBandShown: boolean, hasNote: boolean): BandAbove => {
  if (!isBandShown) {
    return 'none';
  }

  return hasNote ? 'band-with-note' : 'band';
};

interface RoomCrosswordProps {
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it, so their own squares are theirs. */
  readonly viewerId: string;
  /** What the squares are for right now — see `rooms/grid-caption.ts`. */
  readonly caption: string;
  /**
   * Records a word this player has just answered. Left out by every screen
   * whose room is closed for answers, which is every screen but the game.
   */
  readonly onSolved?: (wordId: string) => Promise<void>;
  /** Why an answer could not be written down, if one could not. */
  readonly errorMessage?: string;
  /** A word the player asked to be taken to, from the panel beside the grid. */
  readonly wordToReach?: WordLocation | null;
  /**
   * The room's drawing, for a screen that has one above its board. By default it
   * is drawn only when the board has room for it (`bandIsShown` in
   * `board-geometry.ts`); the board gives up its height to it when it is.
   */
  readonly band?: ReactNode;
  /**
   * When the drawing is shown: `when-it-fits` (the default, the game room's rule)
   * or `always`, at every width, which is the endings'. Nobody types on an
   * ending, and the drawing is what the screen is about, so the board gives
   * way to it instead (`boardHeightsFor`).
   */
  readonly bandRule?: 'when-it-fits' | 'always';
  /**
   * A line between the drawing and the board, centred. It is the board's own
   * caption on Ended early, and the board gives up its height to it too.
   */
  readonly bandNote?: string;
  /**
   * The board is the teacher's: a lesson's teacher watches the crossword and does
   * not play on it, so they are shown every word on a board nothing can be typed
   * into (`TeacherGrid`) instead of the board a player gets. Given by the one
   * screen that is the teacher's room, with the names of the two students the
   * board's colours are for. Absent everywhere else, but for the teacher's Ended
   * early, which keeps the marking; the teacher's Finished has nothing left to
   * mark, and draws the full board a player gets.
   */
  readonly watching?: {
    readonly leftName: string;
    readonly rightName: string;
  };
  /**
   * Whether the heading and the line under it are drawn. The game room draws
   * neither (the letters in the squares say what the screen is), and the
   * section is still named by them for a reader who cannot see.
   */
  readonly hasVisibleHeading?: boolean;
}

/**
 * The crossword, under the heading and the line that says what it is for.
 *
 * Every phase of a room shows the board — a lobby shows it empty, a closed room
 * shows how far it got — so the section itself is one component and what
 * differs between them is the caption and whether anything may be typed. What
 * may be drawn is not decided here: `gridViewFor` strips every letter this
 * reader has not earned and does not explain before this component sees the
 * board (`docs/decisions/0015-explained-words-in-the-grid.md`).
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they get their own squares
 * @param props.caption - The line under the heading
 * @param props.onSolved - Called once one of this player's words has been answered
 * @param props.band - The drawing above the board, when it fits
 * @param props.bandRule - `when-it-fits` (the default) or `always`
 * @param props.bandNote - A line between the drawing and the board
 * @param props.watching - The teacher's board, with whose colours are whose, in place of a player's
 * @param props.hasVisibleHeading - Whether the heading and its caption are drawn (the default) or only read
 *
 * @example
 * <RoomCrossword room={room} viewerId={playerId} caption={openGridCaption(6)} />
 */
export const RoomCrossword = ({
  room,
  viewerId,
  caption,
  onSolved,
  errorMessage,
  wordToReach,
  band,
  bandRule = 'when-it-fits',
  bandNote,
  watching,
  hasVisibleHeading = true,
}: RoomCrosswordProps) => {
  // Kept across renders the room did not change in, so the grid's own state —
  // the letters this player has typed so far — is not judged afresh every time
  // React redraws for some other reason.
  const view = useMemo(() => gridViewFor(room, viewerId), [room, viewerId]);
  // The answered words by their squares, for the board to turn over the ones
  // that are answered while it is on the screen.
  const answeredWords = useMemo(() => answeredWordCellKeys(room), [room]);
  // Asked of the word view, so only the lesson's teacher is ever handed one.
  const watchedView = useMemo(
    () => (watching === undefined ? null : watchedGridFor(room, viewerId)),
    [room, viewerId, watching],
  );
  const fits = useBandShown(view);
  const isBandShown = band !== undefined && (bandRule === 'always' || fits);
  const hasNote = isBandShown && bandNote !== undefined;
  const bandAbove = bandAboveOf(isBandShown, hasNote);

  return (
    <section aria-labelledby={CROSSWORD_HEADING_ID}>
      {hasVisibleHeading ? (
        /* The middle of the window is the one part of the room with no zone of
          its own, so the line that names the board is given a tile. */
        <Box sx={SENTENCE_BAND_SX}>
          <CrosswordHeading caption={caption} />
        </Box>
      ) : (
        <Box sx={UNSEEN_HEADING}>
          {/* A line said under the drawing is not said a second time here. */}
          <CrosswordHeading caption={hasNote ? undefined : caption} />
        </Box>
      )}

      {/* 10px of margin and the 8px the board's own box keeps above it make the
        template's 18px between the band and the board. */}
      {isBandShown && <Box sx={{ marginBottom: hasNote ? 0 : '10px' }}>{band}</Box>}

      {hasNote && (
        // 14 above, one line of 16px text, and the 12 above the board less the 8
        // the board's own box keeps: the template's `.hint` under the band.
        <Box
          component="p"
          sx={{
            margin: `${inRem(14)} 0 ${inRem(4)}`,
            fontSize: inRem(16),
            lineHeight: 1.5,
            textAlign: 'center',
            color: STREET.slate,
          }}
        >
          {bandNote}
        </Box>
      )}

      {watching !== undefined && watchedView !== null ? (
        <TeacherGrid
          view={watchedView}
          leftName={watching.leftName}
          rightName={watching.rightName}
          answeredWords={answeredWords}
          bandAbove={bandAbove}
        />
      ) : (
        <CrosswordGrid
          view={view}
          onSolved={onSolved ?? TAKES_NO_ANSWERS}
          wordToReach={wordToReach}
          bandAbove={bandAbove}
          answeredWords={answeredWords}
        />
      )}

      {errorMessage !== undefined && (
        <Message kind="error" heading="Your answer was not saved">
          {errorMessage}
        </Message>
      )}
    </section>
  );
};
