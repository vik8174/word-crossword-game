import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

import { DoorColumn, RefusalStreet } from '../components/DoorColumn';
import { Message } from '../components/Message';
import { PillButton } from '../components/PillButton';

/**
 * Catch-all for addresses the app knows nothing about.
 *
 * Invite links are copied and pasted between chats, where they get truncated
 * and mangled; without this route such a link renders an entirely blank page
 * and the player has no idea whether the game or their browser is broken.
 *
 * A mistyped address is, more often than not, the first thing a tab does:
 * nobody browses here from inside the app, they land here cold from a broken
 * link.
 *
 * Drawn as a refusal (issue #226): the template has no state of its own for
 * this page, so it takes the shuttered balcony of `?state=unavailable/*` with
 * an info card under it, in the same column. The card's head is the page's `h1`,
 * so a reader finds the page's name where a sighted reader sees it, and "Go to
 * the start" leads home.
 *
 * @example
 * <Route path="*" element={<NotFoundPage />} />
 */
export const NotFoundPage = () => (
  <DoorColumn picture={<RefusalStreet />}>
    <Message kind="info" heading="This page does not exist" headingLevel="h1">
      The link may be incomplete or mistyped. If you were invited to a game, ask for the link again.
      It looks like <code>/room/…</code>
    </Message>

    <Box>
      <PillButton component={RouterLink} to="/">
        Go to the start
      </PillButton>
    </Box>
  </DoorColumn>
);
