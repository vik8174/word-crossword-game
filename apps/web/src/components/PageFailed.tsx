import Box from '@mui/material/Box';

import { DoorColumn } from './DoorColumn';
import { Message } from './Message';
import { PillButton } from './PillButton';
import { ScreenEnter } from './ScreenEnter';
import { Street } from './Street';

/** Which of the two pages this is: a part that could not be fetched, or a crash while drawing. */
export type PageFailure = 'reload' | 'crash';

interface PageFailedProps {
  /** `reload`: the browser could not fetch part of the app. `crash`: an error while a screen was drawn. */
  readonly failure: PageFailure;
  /** Reloads the page. The boundary injects it; a test passes a spy, because jsdom will not let one spy on `location.reload`. */
  readonly onReload: () => void;
  /** A full navigation to the home page (`crash` only). */
  readonly onGoHome: () => void;
}

/**
 * The two pages a failed load and a crash end on, instead of a white page
 * (issue #294).
 *
 * Built to `?state=reload` and `?state=crash` of
 * `design/templates/state-tree.html` (lines 926-942): both balconies shuttered,
 * an error card whose head is the page's `h1`, and the way on. `reload` has one
 * loud "Reload the page"; `crash` adds a quiet "Go to the home page" and keeps
 * the line strung, slack under four tiles that spell "oops". The frame is not in
 * here: it is mounted above the routes and stays on screen.
 *
 * Both buttons call what they are given rather than a router link: a crash may
 * have left the router itself in a state it cannot be trusted with.
 *
 * @param props.failure - Which page to show
 * @param props.onReload - Reloads the page
 * @param props.onGoHome - Leaves for the home page with a full navigation
 *
 * @example
 * <PageFailed failure="crash" onReload={reload} onGoHome={goHome} />
 */
export const PageFailed = ({ failure, onReload, onGoHome }: PageFailedProps) => (
  <ScreenEnter>
    <DoorColumn
      picture={
        failure === 'reload' ? (
          <Street
            left="shut"
            right="shut"
            line="none"
            mood="calm"
            crop="top"
            label="A quiet street, the shutters closed on both balconies"
          />
        ) : (
          <Street
            left="shut"
            right="shut"
            line="slack"
            letters="oops"
            mood="calm"
            crop="top"
            label="Both balconies shuttered, the line between them sagging under four tiles that spell oops"
          />
        )
      }
    >
      {failure === 'reload' ? (
        <Message kind="error" heading="This page could not be opened" headingLevel="h1">
          The game may have been updated while this tab was open, or the connection dropped. Reload
          the page to get the current version. A room you are in is still there.
        </Message>
      ) : (
        <Message kind="error" heading="Something went wrong on our side" headingLevel="h1">
          The game ran into a problem it could not get past. We have been told about it. Reload the
          page to carry on; a room you are in is still there.
        </Message>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <PillButton onClick={onReload}>Reload the page</PillButton>
        {failure === 'crash' && (
          <PillButton kind="quiet" onClick={onGoHome}>
            Go to the home page
          </PillButton>
        )}
      </Box>
    </DoorColumn>
  </ScreenEnter>
);
