import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { gateChrome } from '../garden/gate-chrome';
import { SCENE } from '../garden/scene-palette';
import { ON_SCENE_SX } from '../garden/scene-surface';
import { useViewport } from '../garden/use-viewport';
import { GATE_NAME_SIZE, inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** How wide the button that stands in the gate is padded, as steps of the row. */
const BUTTON_PADDING = { across: 5, down: 3 } as const;

/**
 * Landing page — the gate, and the one thing there is to do at it.
 *
 * It is a picture rather than a page: the name of the game hangs in the air
 * over the torii and the button stands in the opening between its posts, both
 * pinned to where the gate actually is in the world (see {@link gateChrome}).
 * There is no panel behind either of them and nothing else on the screen,
 * because a first screen with one action on it should look like one.
 *
 * Both are lettered rather than written — the sign face out of
 * `theme.typography.signage`, at three sizes off `scale.ts`'s own ladder so
 * that the name comes down as the window narrows instead of running off it
 * (the widest of the three, {@link GATE_NAME_SIZE}, is a sign's and not one of
 * the four text levels). Nothing about the face, the capitals or the tracking
 * is decided here.
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one.
 *
 * It is where the funnel starts, so it says it was reached (issue #51).
 */
export const HomePage = () => {
  useScreenReached('home');

  const { title, action } = gateChrome(useViewport());

  return (
    <Box component="main" sx={ON_SCENE_SX}>
      <Box
        sx={{
          position: 'fixed',
          left: title.x,
          top: title.y,
          transform: 'translate(-50%, -50%)',
          // A fixed box given `left` and no `right` is offered the room from
          // `left` to the edge of the window for its shrink-to-fit width, and
          // the transform that recentres it only runs after that width is
          // settled — the same trap the button was in (#127). At `title`
          // (31px) the name never asked for more than that happened to allow;
          // at a larger size on desktop it does, so the box gets the same fix
          // there. Left alone below `md` on purpose: nothing here changes what
          // a phone or a tablet already shows.
          width: { md: 'max-content' },
          maxWidth: '90vw',
          textAlign: 'center',
        }}
      >
        <Typography
          component="h1"
          variant="signage"
          sx={{
            fontSize: {
              xs: inRem(TEXT_LEVELS.body),
              sm: inRem(TEXT_LEVELS.heading),
              md: inRem(GATE_NAME_SIZE),
            },
            // The tracking is put after the last letter as well as between, so
            // a centred line sits half a letter to the right without this.
            marginRight: `-${SIGN_TRACKING}`,
            color: SCENE.cream,
            // Tighter than it was: an 18px blur softened the edges of the
            // letters and gave away part of the weight they already have.
            textShadow: '0 1px 6px rgba(6, 20, 16, 0.85)',
          }}
        >
          Word Crossword Game
        </Typography>

        {/* The temple's red, under the name of the place it belongs to. */}
        <Box
          aria-hidden
          sx={{ width: '72%', height: '3px', mx: 'auto', mt: 3, backgroundColor: SCENE.vermilion }}
        />
      </Box>

      <Box
        sx={{
          position: 'fixed',
          left: action.x,
          top: action.y,
          transform: 'translate(-50%, -50%)',
          // A fixed box given `left` and no `right` is offered the room from
          // `left` to the edge of the window, and the transform moves it only
          // once that width is settled — so on a phone the label was wrapped by
          // where the button stands rather than by how much room there is. It
          // takes the width of what is in it, and is held back to nine tenths
          // of the window only if a reader's own text size would take it past
          // that — where the label wraps, and both lines are centred.
          width: 'max-content',
          maxWidth: '90vw',
        }}
      >
        <Button
          component={RouterLink}
          to="/create"
          variant="contained"
          size="large"
          sx={(theme) => ({
            // Lettered rather than written, off the same face and the same
            // tracking the name over the gate is: the two of them are one sign.
            ...theme.typography.signage,
            fontSize: inRem(TEXT_LEVELS.body),
            px: BUTTON_PADDING.across,
            py: BUTTON_PADDING.down,
            // This is a link and not a `button`, and the browser's own
            // `text-align: center` is on the latter alone — so without this the
            // label inherits `start` from the body and a wrapped one stacks to
            // the left. Said here rather than left to the tag.
            textAlign: 'center',
            // The tracking is put after the last letter as well as between, and
            // a centred line counts that trailing space as part of its own
            // width: the letters land half a space left of the middle, by the
            // same amount on every line however many there are. Taking the
            // whole space off the right of the box puts them back on the middle
            // of the button, in one line and in two.
            paddingRight: `calc(${theme.spacing(BUTTON_PADDING.across)} - ${SIGN_TRACKING})`,
          })}
        >
          Create a game
        </Button>
      </Box>
    </Box>
  );
};
