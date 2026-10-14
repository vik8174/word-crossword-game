import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PillButton } from '../components/PillButton';
import { LOGOTYPE_TRACKING, TEXT_FONT_FAMILY, WEIGHTS } from '../scale';
import { STREET } from '../street';
import { useScreenReached } from '../telemetry/use-screen-reached';
import { GATE_ACTION_SX, GATE_LOCKUP_SX, GATE_LOCKUP_TEXT_SIZE, GATE_RULE_SX } from './gate-chrome';

/**
 * Landing page — the name of the game, and the one thing there is to do at it.
 *
 * It stands on the ground the whole app stands on, `duck`. The name, a rule and
 * the tagline hang near the top of the window as one block, and the button
 * stands lower down, both placed against percentages of the window
 * (`gate-chrome.ts`). Those percentages are read against this component's own
 * root below, `position: fixed; inset: 0`. They were places on a photograph of
 * a gate until issue #222 removed it; the layout is the old one and goes when
 * this screen is redrawn (#224).
 *
 * The name is lettered rather than written: Alegreya Sans at its bold, in
 * capitals held apart by `LOGOTYPE_TRACKING`, in ink — sized off a `vw`-driven
 * `clamp()` so the rendered line stays inside the block continuously rather
 * than at a handful of sampled widths (issue #148). Its face was a logotype of
 * its own until issue #244; its capitals, tracking and size stay until the
 * screen is redrawn (#224). The rule between the name and the tagline is
 * decoration (`GATE_RULE_SX`): `aria-hidden`, and a `div` rather than an
 * `<hr>`, so nothing is read out between the two. The tagline underneath is set
 * in the interface's own text face at its regular weight.
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
    <Box component="main" sx={{ position: 'fixed', inset: 0 }}>
      <Box sx={GATE_LOCKUP_SX}>
        <Typography
          component="h1"
          sx={{
            margin: 0,
            fontFamily: TEXT_FONT_FAMILY,
            fontWeight: WEIGHTS.bold,
            color: STREET.ink,
            // A continuous formula off the viewport's width rather than a
            // handful of steps pinned to MUI's breakpoints, the same size the
            // rule below also uses so its own `margin-top` scales with this
            // line (issue #191, `GATE_LOCKUP_TEXT_SIZE`).
            fontSize: GATE_LOCKUP_TEXT_SIZE,
            // Tight on purpose: a line height with room in it moves the
            // rendered line outside the block it is measured against.
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: LOGOTYPE_TRACKING,
            // The tracking sits after the last letter as well as between, so
            // a centred line counts it as part of its own width and the
            // letters land half a tracking short of the middle. Taking the
            // whole space off the right corrects it, the same way the button
            // below does for its own tracking.
            marginRight: `-${LOGOTYPE_TRACKING}`,
          }}
        >
          Across the Street
        </Typography>

        <Box aria-hidden sx={GATE_RULE_SX} />

        <Typography
          sx={{
            margin: '0.55em 0 0',
            fontFamily: TEXT_FONT_FAMILY,
            fontWeight: 400,
            color: STREET.ink,
            // Fixed rather than clamped, unlike the name above: the template
            // holds the tagline at one size, 10.5px, at every width (issue
            // #191).
            fontSize: '10.5px',
            lineHeight: 1.3,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            // No trailing-tracking margin here, unlike the name above: the
            // template's own `.tag` sets this line's `0.3em` tracking with no
            // `margin-right` correction, only the name's `.name` gets one.
            // Its own inked centre sits a couple of pixels off the name's as
            // a result — measured and left rather than corrected, since the
            // template renders the same way.
          }}
        >
          A cooperative crossword
        </Typography>
      </Box>

      <Box sx={GATE_ACTION_SX}>
        <PillButton component={RouterLink} to="/create">
          Create a game
        </PillButton>
      </Box>
    </Box>
  );
};
