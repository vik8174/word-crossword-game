import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { GATE_ACTION_SX, GATE_INK, GATE_NAME_SX } from '../scenes/gate-chrome';
import { GateScene } from '../scenes/GateScene';
import { ON_SCENE_SX } from '../garden/scene-surface';
import { GATE_NAME_SIZE, inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** How wide the button that stands in the gate is padded, as steps of the row. */
const BUTTON_PADDING = { across: 6, down: 4 } as const;

/**
 * Landing page — the gate, and the one thing there is to do at it.
 *
 * It is a photograph rather than a painting (issue #151): `GateScene` stands
 * `gate.avif` full-bleed behind the page, and this route creates no canvas at
 * all — the procedural forest `garden/` still paints for `/create`, `/join`
 * and every screen of a room goes on being drawn there, untouched. The name
 * hangs in the clear sky above the torii and the button stands in its opening,
 * both placed against percentages of the picture measured for legibility
 * against the real pixels of `gate.jpg` rather than computed from a painted
 * world (`scenes/gate-chrome.ts`).
 *
 * Both are lettered rather than written — the sign face out of
 * `theme.typography.signage`, at three sizes off `scale.ts`'s own ladder so
 * that the name comes down as the window narrows instead of running off it
 * (the widest of the three, {@link GATE_NAME_SIZE}, is a sign's and not one of
 * the four text levels). Nothing about the face, the capitals, the tracking or
 * the words themselves is decided here — the name and a tagline are #148's,
 * and this page stands whatever they are in the same measured band.
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one.
 *
 * It is where the funnel starts, so it says it was reached (issue #51).
 */
export const HomePage = () => {
  useScreenReached('home');

  return (
    <Box component="main" sx={{ ...ON_SCENE_SX, position: 'fixed', inset: 0 }}>
      <GateScene />

      <Box sx={GATE_NAME_SX}>
        <Typography
          component="h1"
          variant="signage"
          sx={{
            fontSize: {
              xs: inRem(TEXT_LEVELS.body),
              sm: inRem(TEXT_LEVELS.heading),
              md: inRem(GATE_NAME_SIZE),
            },
            // Tight on purpose: the clear band of sky this sits in is a
            // twentieth of the picture's own height, and the theme's own
            // `signage` line height (1.25) is written for a sign with room
            // around it rather than a lockup measured down to a tenth of a
            // percent (`handoffs/scenes/README.md`).
            lineHeight: 1,
            // The tracking is put after the last letter as well as between, so
            // a centred line sits half a letter to the right without this.
            marginRight: `-${SIGN_TRACKING}`,
            color: GATE_INK,
          }}
        >
          Word Crossword Game
        </Typography>
      </Box>

      <Box sx={GATE_ACTION_SX}>
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
