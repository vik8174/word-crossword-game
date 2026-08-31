import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { roomUrl } from '../rooms/room-link';

interface RoomInvitePanelProps {
  /** Id of the room this screen is showing, as it stands in the address. */
  readonly roomId: string;
  /** Origin the app is served from; injected so the panel stays testable. */
  readonly origin: string;
}

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
    <Stack spacing={4}>
      <Typography variant="body1">
        Send this link to the other players — they join with a nickname, no sign-up.
      </Typography>

      {/* Wrapped rather than scrolled sideways inside its own box: the panel
          now stands in a zone beside the board rather than across the page
          (issue #101), and a link shown as its first thirty characters is not
          the link shown in full that the paragraph above promises. */}
      <TextField
        label="Room link"
        value={url}
        multiline
        slotProps={{ htmlInput: { readOnly: true } }}
        fullWidth
      />

      <Stack direction="row" spacing={4} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => void handleCopy()}>
          Copy link
        </Button>

        {copyState === 'copied' && (
          <Typography variant="body2" color="success.main" role="status">
            Link copied
          </Typography>
        )}
        {copyState === 'failed' && (
          <Typography variant="body2" color="error.main" role="status">
            Could not copy automatically — select the link and copy it by hand.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};
