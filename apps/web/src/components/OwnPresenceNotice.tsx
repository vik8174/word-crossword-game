import Alert from '@mui/material/Alert';

interface OwnPresenceNoticeProps {
  /**
   * How long this reader's own mark has been stale, from `useRoomPresence`, or
   * `undefined` while the room is still hearing from them.
   */
  readonly awayDuration?: string;
}

/**
 * Tells a player that the room has stopped hearing from them.
 *
 * The one thing a disconnected screen cannot do is look disconnected. Firestore
 * serves a client its own writes from cache, optimistically, so a player whose
 * connection is gone still sees their letters land in the grid, their answers
 * accepted, the room exactly as they left it — while the other player, who is
 * explaining a word out loud into nothing, sees none of it.
 *
 * What gives it away is the player's own mark inside the document they are
 * reading: it goes stale at precisely the moment their writes stop arriving,
 * because it *is* one of those writes. So this is the same question asked of
 * the same field, only about the reader — no separate notion of being online,
 * and nothing taken from `navigator.onLine`, which reports a network rather
 * than a database.
 *
 * @param props.awayDuration - How long the room has not heard from them; the
 * notice is nothing at all while it is `undefined`
 *
 * @example
 * <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />
 */
export const OwnPresenceNotice = ({ awayDuration }: OwnPresenceNoticeProps) => {
  if (awayDuration === undefined) {
    return null;
  }

  return (
    <Alert severity="warning" role="status">
      {`The room has not heard from you for ${awayDuration}. What is on this screen is what your browser last received, and nothing you do here is reaching anybody else — check your connection. This notice goes the moment the room hears from you again.`}
    </Alert>
  );
};
