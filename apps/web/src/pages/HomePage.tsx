import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useLayoutEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { PillButton } from '../components/PillButton';
import { useGardenControls } from '../garden/garden-controls';
import { ON_SCENE_SX } from '../garden/scene-surface';
import {
  GATE_ACTION_SX,
  GATE_INK,
  GATE_LOCKUP_SX,
  GATE_LOCKUP_TEXT_SIZE,
  GATE_RULE_SX,
} from '../scenes/gate-chrome';
import {
  LOGOTYPE_FONT_FAMILY,
  LOGOTYPE_FONT_WEIGHT,
  LOGOTYPE_TRACKING,
  TEXT_FONT_FAMILY,
} from '../scale';
import { useScreenReached } from '../telemetry/use-screen-reached';

/**
 * Landing page — the gate, and the one thing there is to do at it.
 *
 * It is a photograph rather than a painting (issue #151), drawn by the same
 * `GardenScene` every other screen shares rather than by a component of its
 * own: this page claims the `gate` scene on mount, in a layout effect rather
 * than the plain one `CreateRoomPage` claims its own in. `App.tsx` mounts
 * `Garden` here the same way it does everywhere else (issue #166) — so the
 * picture behind this page crossfades like any other change of scene, and
 * the same weather falls behind it as behind every other screen `Garden`
 * wraps. The layout effect matters because `/` is the first frame of a
 * session with nothing behind it yet:
 * `Garden` renders nothing while its `scene` is still `null`, and a plain
 * effect runs only after the browser has already painted that, which is
 * exactly the pictureless frame this ticket exists to close, reappearing at
 * the other end of the journey. A layout effect claims the scene, and the
 * render it causes, before that paint happens.
 * The name, a rule and the tagline hang in the clear sky above the torii as
 * one block, and the button stands on the stairs below it, both placed
 * against percentages of the picture (issue #191, `scenes/gate-chrome.ts`).
 * Those percentages are read against this component's own root below,
 * `position: fixed; inset: 0`, which is unchanged by where the picture
 * itself is drawn.
 *
 * The name is lettered rather than written, in the logotype — Dela Gothic
 * One, the one weight it has, sumi with a cream offset behind it — sized off
 * a `vw`-driven `clamp()` so the rendered line stays inside the block
 * continuously rather than at a handful of sampled widths (issue #148, the
 * same technique the name's own sizing already used for its previous
 * string, before this one). `GATE_NAME_SIZE`, one step above `title` in
 * `scale.ts`, was sized for an earlier, unconstrained `max-content` box this
 * text no longer sits in — left there for a later ticket, not read from
 * here. The rule between the name and the tagline is decoration
 * (`GATE_RULE_SX`): `aria-hidden`, and a `div` rather than an `<hr>`, so
 * nothing is read out between the two. The tagline underneath is set in the
 * interface's own text face instead: it needs six letters — C, P, T, I, V,
 * S — the logotype's subset does not carry, cutting a wider subset being
 * issue #147's call and not this page's to reopen.
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one.
 *
 * It is where the funnel starts, so it says it was reached (issue #51).
 */
export const HomePage = () => {
  useScreenReached('home');

  const { showScene } = useGardenControls();

  // A layout effect, not a plain one: `/` is the first frame of a session
  // with nothing behind it yet, unlike `/create`, which always arrives with
  // a picture already standing there from wherever it was reached. `Garden`
  // renders nothing while `scene` is still `null`, and a passive effect runs
  // only after the browser has already painted that — a flat frame with the
  // logotype, the tagline and the button standing on nothing, measured under
  // throttling at 24-62ms, which is the very defect this ticket exists to
  // close, moved from the exit to the entrance. A layout effect runs before
  // the paint, so the claim above and the render it causes both happen
  // first, and the browser never gets a frame with no photograph in it.
  useLayoutEffect(() => {
    showScene('gate');
  }, [showScene]);

  return (
    <Box component="main" sx={{ ...ON_SCENE_SX, position: 'fixed', inset: 0 }}>
      <Box sx={GATE_LOCKUP_SX}>
        <Typography
          component="h1"
          sx={{
            margin: 0,
            fontFamily: LOGOTYPE_FONT_FAMILY,
            fontWeight: LOGOTYPE_FONT_WEIGHT,
            // A continuous formula off the viewport's width rather than a
            // handful of steps pinned to MUI's breakpoints, the same size the
            // rule below also uses so its own `margin-top` scales with this
            // line (issue #191, `GATE_LOCKUP_TEXT_SIZE`).
            fontSize: GATE_LOCKUP_TEXT_SIZE,
            // Tight on purpose: a line height with room in it moves the
            // rendered line outside the block measured down to a tenth of a
            // percent (`handoffs/scenes/README.md`).
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: LOGOTYPE_TRACKING,
            // The tracking sits after the last letter as well as between, so
            // a centred line counts it as part of its own width and the
            // letters land half a tracking short of the middle. Taking the
            // whole space off the right corrects it, the same way the button
            // below does for its own tracking.
            marginRight: `-${LOGOTYPE_TRACKING}`,
            // `&&&` rather than a plain `color`: `ON_SCENE_SX` on this page's
            // own `<main>` carries `'& .MuiTypography-root': { color:
            // 'inherit' }` (`garden/scene-surface.ts`), a descendant rule at
            // specificity (0,2,0). A single generated `sx` class targeting
            // this element directly is only (0,1,0), so that rule always won
            // regardless of source order — sumi was never reaching the
            // screen, cream was, unmeasured because the only test on this
            // colour checked the constant rather than a rendered pixel. Three
            // ampersands repeat this element's own class three times,
            // (0,3,0), which beats (0,2,0) outright rather than depending on
            // which rule happens to be inserted last (issue #126 hit the same
            // trap first).
            '&&&': {
              color: GATE_INK,
              // The cream offset PRD #145 calls for: a second, lighter copy
              // of the letter shown down and right of the sumi one, so the
              // edge it peeks out from behind reads as a colour block
              // slightly out of register rather than as a shadow. `0.05em`
              // both ways, sumi's own cream (`garden/scene-palette.ts`'s
              // `SCENE.cream`, `#F3ECD9`) written as its own literal for the
              // same reason `GATE_INK` is: a token every scene's chrome
              // shares is not the same thing as a colour chosen against one
              // photograph, even where the two happen to match today. It
              // carries no contrast duty of its own — it reads against the
              // sumi letter it sits behind, which is where an offset is
              // supposed to read. Measured over the scene's real pixels plus
              // its veil, the letter itself is median 3.41:1 against the sky
              // with the offset present or not: large text (31px at 1440,
              // 30.86px at 834) clears the 3:1 WCAG threshold that size gets,
              // at 98.9% and 99.1%, but 375's 13.875px falls under the same
              // 4.5:1 the offset does not carry — a shortfall this ticket
              // inherits rather than introduces (`main` measures the same
              // band at 3.42:1 median, 0.1% at 4.5:1).
              textShadow: '0.05em 0.05em 0 #F3ECD9',
            },
          }}
        >
          WORD GARDEN
        </Typography>

        <Box aria-hidden sx={GATE_RULE_SX} />

        <Typography
          sx={{
            margin: '0.55em 0 0',
            fontFamily: TEXT_FONT_FAMILY,
            fontWeight: 400,
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
            '&&&': { color: GATE_INK },
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
