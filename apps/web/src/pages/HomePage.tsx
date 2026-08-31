import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { gateChrome } from '../garden/gate-chrome';
import { SCENE } from '../garden/scene-palette';
import { ON_SCENE_SX } from '../garden/scene-surface';
import { useViewport } from '../garden/use-viewport';
import { inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
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
 * `theme.typography.signage`, at three of the app's own levels so that the name
 * comes down as the window narrows instead of running off it. Nothing about the
 * face, the capitals or the tracking is decided here.
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
              md: inRem(TEXT_LEVELS.title),
            },
            // The tracking is put after the last letter as well as between, so
            // a centred line sits half a letter to the right without this.
            marginRight: `-${SIGN_TRACKING}`,
            color: SCENE.cream,
            textShadow: '0 2px 18px rgba(6, 20, 16, 0.9)',
          }}
        >
          Word Crossword Game
        </Typography>

        {/* The temple's red, under the name of the place it belongs to. */}
        <Box
          aria-hidden
          sx={{ width: '68%', height: '2px', mx: 'auto', mt: 3, backgroundColor: SCENE.vermilion }}
        />
      </Box>

      <Box
        sx={{
          position: 'fixed',
          left: action.x,
          top: action.y,
          transform: 'translate(-50%, -50%)',
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
            // The label is centred inside the padding, so what the trailing
            // tracking pushes off centre is the words and not the box.
            paddingRight: `calc(${theme.spacing(BUTTON_PADDING.across)} - ${SIGN_TRACKING})`,
          })}
        >
          Create a game
        </Button>
      </Box>
    </Box>
  );
};
