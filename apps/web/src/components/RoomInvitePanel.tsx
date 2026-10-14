import Box from '@mui/material/Box';
import { useState } from 'react';

import { inRem } from '../scale';
import { roomUrl } from '../rooms/room-link';
import { ReadOnlyField } from './Field';
import { PillButton } from './PillButton';
import { zoneHeadingSx, zoneHintSx } from './zone-styles';

interface RoomInvitePanelProps {
  /** Id of the room this screen is showing, as it stands in the address. */
  readonly roomId: string;
  /** Origin the app is served from; injected so the panel stays testable. */
  readonly origin: string;
}

/** What the block is named by. */
const INVITE_HEADING_ID = 'invite-heading';

/**
 * The line beside the copy button that says how the copy went
 * (`.inline-status`, `design/templates/state-tree.html` lines 392-394): 11px,
 * and no surface of its own, so it is read off the zone. Green when it worked,
 * and a pale red when the browser refused, the template's own two.
 */
const INLINE_STATUS_SX = { fontSize: inRem(11), lineHeight: 1.5 } as const;
const COPIED_INK = '#A9D147';
const REFUSED_INK = '#FFC7AE';

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
 *
 * @example
 * <RoomInvitePanel roomId={roomId} origin={window.location.origin} />
 */
export const RoomInvitePanel = ({ roomId, origin }: RoomInvitePanelProps) => {
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
    <section aria-labelledby={INVITE_HEADING_ID}>
      <Box component="h2" id={INVITE_HEADING_ID} sx={zoneHeadingSx}>
        The link into this room
      </Box>
      <Box component="p" sx={zoneHintSx}>
        Send this link to the other players — they join with a nickname, no sign-up.
      </Box>

      {/* Wrapped rather than scrolled sideways inside its own box: the panel
          stands in a zone beside the board rather than across the page (issue
          #101), and a link shown as its first thirty characters is not the link
          shown in full that the sentence above promises. */}
      <ReadOnlyField label="Room link" value={url} />

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          marginTop: inRem(9),
        }}
      >
        <PillButton kind="quiet" small onClick={() => void handleCopy()}>
          Copy the link
        </PillButton>

        {copyState === 'copied' && (
          <Box component="span" role="status" sx={{ ...INLINE_STATUS_SX, color: COPIED_INK }}>
            Link copied
          </Box>
        )}
        {copyState === 'failed' && (
          <Box component="span" role="status" sx={{ ...INLINE_STATUS_SX, color: REFUSED_INK }}>
            Could not copy automatically — select the link and copy it by hand.
          </Box>
        )}
      </Box>
    </section>
  );
};
