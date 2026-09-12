import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { GATE_ACTION_SX, GATE_INK, GATE_NAME_SX } from '../scenes/gate-chrome';
import { GateScene } from '../scenes/GateScene';
import { ON_SCENE_SX } from '../garden/scene-surface';
import { inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
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
 * `theme.typography.signage`, at three sizes off `scale.ts`'s own ladder
 * (`aside`, `body`, `title`) chosen so the rendered name — however many lines
 * it wraps to at that width — stays inside the measured band rather than
 * merely fitting under a discrete breakpoint's nominal size: `title` (31px)
 * is already the widest that keeps a single line inside the band's height at
 * a desktop width, and `aside` (13px) is the largest that still fits two
 * lines inside it at a phone's. `GATE_NAME_SIZE`, one step above `title`, was
 * sized for the previous, unconstrained `max-content` box and does not fit
 * this one at any width — left in `scale.ts` for whichever later round of
 * canvas 1 (#148) decides what replaces it, not read from here. Nothing about
 * the face, the capitals, the tracking or the words themselves is decided
 * here — the name and a tagline are #148's, and this page stands whatever
 * they are in the same measured band.
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
            // A continuous formula off the viewport's width rather than three
            // discrete steps pinned to MUI's breakpoints. The breakpoint
            // version passed at 375, 834 and 1440 (the three widths the
            // ticket names) but failed everywhere from 900 to about 1185px
            // wide: `title` (31px) needs roughly 628px to set "Word Crossword
            // Game" on one line, and the band is 53% of the viewport, so a
            // single line was only possible from ~1185px up — `md`'s own
            // floor is 900. `2.4vw` is a hair under the exact ratio that
            // formula implies (0.53 / (628/31) ≈ 2.62vw), so the text clears
            // one line at every width it can rather than at three sampled
            // points, clamped to the same floor and ceiling the discrete
            // steps used (`aside` 13px, `title` 31px).
            fontSize: 'clamp(13px, 2.4vw, 31px)',
            // Tight on purpose: the clear band of sky this sits in is a
            // twentieth of the picture's own height, and the theme's own
            // `signage` line height (1.25) is written for a sign with room
            // around it rather than a lockup measured down to a tenth of a
            // percent (`handoffs/scenes/README.md`).
            lineHeight: 1,
            // No trailing-tracking margin here, unlike the button below: that
            // trick shifts a flex item's own centring math by the width it
            // removes, which is correct against `transform: translate(-50%)`
            // (the previous, painted gate's own centring) but overshoots the
            // right edge of a `justifyContent: 'center'` flex box by roughly
            // the same amount instead of correcting it — measured against the
            // stage with `getBoundingClientRect` at 1440, 834 and 375, a
            // negative margin here was the reason the rendered name cleared
            // the box's own 77% right edge at every one of the three widths.
            //
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
            '&&&': { color: GATE_INK },
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
