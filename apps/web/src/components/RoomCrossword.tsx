import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import type { RoomDocument } from '../rooms/room-document';
import { gridViewFor } from '../rooms/word-visibility';
import { CrosswordGrid } from './CrosswordGrid';

/**
 * Stands in for a board that takes no answers.
 *
 * Not a fallback so much as a statement of what is already true: `gridViewFor`
 * hands over an empty `toGuess` for every room that is not `playing`, and
 * {@link CrosswordGrid} only ever reports a word it was given. A screen that
 * passes no handler therefore has no word that could reach this.
 */
const TAKES_NO_ANSWERS = () => Promise.resolve();

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
}

/**
 * The crossword, under the heading and the line that says what it is for.
 *
 * Every phase of a room shows the board — a lobby shows it empty, a closed room
 * shows how far it got — so the section itself is one component and what
 * differs between them is the caption and whether anything may be typed. What
 * may be drawn is not decided here: `gridViewFor` strips every unearned letter
 * before this component sees the board (`docs/decisions/0010-letterless-grid-and-private-word-list.md`).
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they get their own squares
 * @param props.caption - The line under the heading
 * @param props.onSolved - Called once one of this player's words has been answered
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
}: RoomCrosswordProps) => {
  // Kept across renders the room did not change in, so the grid's own state —
  // the letters this player has typed so far — is not judged afresh every time
  // React redraws for some other reason.
  const view = useMemo(() => gridViewFor(room, viewerId), [room, viewerId]);

  return (
    <section aria-labelledby="grid-heading">
      <Typography id="grid-heading" variant="h6" component="h2">
        The crossword
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {caption}
      </Typography>

      <CrosswordGrid view={view} onSolved={onSolved ?? TAKES_NO_ANSWERS} />

      {errorMessage !== undefined && <Alert severity="error">{errorMessage}</Alert>}
    </section>
  );
};
