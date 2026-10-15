import Box from '@mui/material/Box';
import { useState } from 'react';

import { roomUrl } from '../rooms/room-link';
import { STREET } from '../street';
import { ReadOnlyField } from './Field';
import { gateButtonRowSx, gateHintSx } from './gate-panel-styles';
import { inlineStatusSx, lobbyHeadingSx, lobbyTightStackSx } from './lobby-styles';
import { PillButton } from './PillButton';

interface RoomInvitePanelProps {
  /** Id of the room this screen is showing, as it stands in the address. */
  readonly roomId: string;
  /** Origin the app is served from; injected so the panel stays testable. */
  readonly origin: string;
  /** Whether the room is a lesson, whose link goes to both of the teacher's students. */
  readonly isLesson?: boolean;
}

/** What the block is named by. */
const INVITE_HEADING_ID = 'invite-heading';

/** Outcome of the last copy attempt — nothing tried yet, copied, or the browser refused. */
type CopyState = 'idle' | 'copied' | 'failed';

/**
 * The link that leads into this room, on the screen of the room itself.
 *
 * The link is the only way in — the app sends no invitations — so it is shown
 * in full and selectable, not just behind a copy button that a browser may
 * refuse (clipboard access needs permission and is unavailable over plain
 * HTTP).
 *
 * It is built from the room id and the origin alone, which is why it belongs
 * above the screen switch rather than inside any one of the screens: filling a
 * room is not a phase of one.
 *
 * The host is the only player who sees it, and only while a seat is still free.
 * A guest arrived by this very link, and a room is played by exactly two, so
 * once they are in it there is nobody it could still let in. Who is shown it is
 * decided by `hasSomebodyToInvite` rather than here
 * (`docs/decisions/0026-the-invite-link-belongs-to-the-host.md`).
 *
 * @param props.roomId - Id of the room, taken from the address
 * @param props.origin - Origin to build the shareable URL from
 * @param props.isLesson - The teacher's invitation, worded for both students
 *
 * @example
 * <RoomInvitePanel roomId={roomId} origin={window.location.origin} />
 */
export const RoomInvitePanel = ({ roomId, origin, isLesson = false }: RoomInvitePanelProps) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const url = roomUrl(roomId, origin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch {
      // Clipboard access is denied or missing — the link stays selectable, so
      // the player is told to copy it by hand rather than left with a dead button.
      setCopyState('failed');
    }
  };

  return (
    <Box component="section" aria-labelledby={INVITE_HEADING_ID} sx={lobbyTightStackSx}>
      <Box component="h2" id={INVITE_HEADING_ID} sx={lobbyHeadingSx}>
        Invite
      </Box>
      <Box component="p" sx={gateHintSx}>
        {isLesson
          ? 'Send this link to both of your players. They join with a nickname, no sign-up.'
          : 'Send this link to the person you will play with. They join with a nickname, no sign-up.'}
      </Box>

      {/* One line that clips, as the template draws it (issue #225): the link is
          still selectable, so a browser that refuses the clipboard leaves it to
          be copied by hand (issue #101). */}
      <ReadOnlyField label="Invite link" value={url} />

      <Box sx={gateButtonRowSx}>
        <PillButton kind="quiet" onClick={() => void handleCopy()}>
          Copy link
        </PillButton>

        {copyState === 'copied' && (
          <Box
            component="span"
            role="status"
            sx={{
              ...inlineStatusSx,
              color: STREET.spruce,
              fontWeight: 700,
              // The tick is drawn, not typed, so the sentence a reader is told is "Link copied".
              '&::before': { content: '"✓ "' },
            }}
          >
            Link copied
          </Box>
        )}
        {copyState === 'failed' && (
          <Box component="span" role="status" sx={{ ...inlineStatusSx, color: STREET.brick }}>
            Could not copy automatically. Select the link and copy it by hand.
          </Box>
        )}
      </Box>
    </Box>
  );
};
