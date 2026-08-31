import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { gateChrome } from '../garden/gate-chrome';
import { SCENE } from '../garden/scene-palette';
import { ON_SCENE_SX } from '../garden/scene-surface';
import { useViewport } from '../garden/use-viewport';
import { useScreenReached } from '../telemetry/use-screen-reached';

/**
 * The name of the game, as it is written over the gate.
 *
 * Wide-set capitals rather than a heading: it is a sign on a building and not
 * the first line of a document, and a sign is read at a glance. Three sizes,
 * one for each width the page has to hold at, and all three are steps of the
 * app's own scale rather than a number picked to fit.
 */
const GAME_TITLE_SX = {
  fontWeight: 300,
  fontSize: { xs: 17, sm: 23, md: 31 },
  lineHeight: 1.2,
  letterSpacing: '0.42em',
  textTransform: 'uppercase',
  // The tracking pushes the last letter out by its own width, so without this
  // the line is off centre by half of one.
  marginRight: '-0.42em',
  color: SCENE.cream,
  textShadow: '0 2px 18px rgba(6, 20, 16, 0.9)',
  whiteSpace: 'nowrap',
} as const;

/**
 * Landing page — the gate, and the one thing there is to do at it.
 *
 * It is a picture rather than a page: the name of the game hangs in the air
 * over the torii and the button stands in the opening between its posts, both
 * pinned to where the gate actually is in the world rather than to a corner of
 * the window (see {@link gateChrome}). There is no panel behind either of them
 * and nothing else on the screen, because a first screen with one action on it
 * should look like one.
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
          textAlign: 'center',
        }}
      >
        <Typography component="h1" sx={GAME_TITLE_SX}>
          Word Crossword Game
        </Typography>

        {/* The temple's red, under the name of the place it belongs to. */}
        <Box
          aria-hidden
          sx={{
            width: '68%',
            height: '2px',
            mx: 'auto',
            mt: 1.5,
            backgroundColor: SCENE.vermilion,
          }}
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
          sx={{ letterSpacing: '0.16em', textTransform: 'uppercase', px: 4, py: 1.5 }}
        >
          Create a game
        </Button>
      </Box>
    </Box>
  );
};
