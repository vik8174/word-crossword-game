import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { GATE_ACTION_SX, GATE_INK, GATE_NAME_SX, GATE_TAGLINE_SX } from '../scenes/gate-chrome';
import { GateScene } from '../scenes/GateScene';
import { ON_SCENE_SX } from '../garden/scene-surface';
import {
  inRem,
  LOGOTYPE_FONT_FAMILY,
  LOGOTYPE_FONT_WEIGHT,
  LOGOTYPE_TRACKING,
  SIGN_TRACKING,
  TEXT_FONT_FAMILY,
  TEXT_LEVELS,
} from '../scale';
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
 * The name is lettered rather than written, in the logotype — Dela Gothic
 * One, the one weight it has — sized off a `vw`-driven `clamp()` so the
 * rendered line stays inside `GATE_NAME_BAND` continuously rather than at a
 * handful of sampled widths (issue #148, following the same technique the
 * button's own sizing used first). `GATE_NAME_SIZE`, one step above `title`
 * in `scale.ts`, was sized for the previous, unconstrained `max-content` box
 * this text no longer sits in — left there for a later ticket, not read from
 * here. The tagline underneath is set in the interface's own text face
 * instead: it needs six letters — C, P, T, I, V, S — the logotype's subset
 * does not carry, cutting a wider subset being issue #147's call and not this
 * page's to reopen.
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
          sx={{
            fontFamily: LOGOTYPE_FONT_FAMILY,
            fontWeight: LOGOTYPE_FONT_WEIGHT,
            // A continuous formula off the viewport's width rather than a
            // handful of steps pinned to MUI's breakpoints — the same
            // technique the previous string on this line was sized with, and
            // for the same reason: a value sampled at a few widths passes at
            // those widths and nowhere it wasn't checked. `3.7vw` is a hair
            // under the exact ratio the band's own width and this string's
            // measured one imply (0.53 / (409.4 / 31) ≈ 4.01vw at the
            // ceiling), so "WORD GARDEN" clears one line inside
            // `GATE_NAME_BAND` at every width rather than at three sampled
            // points, clamped to the floor and ceiling of `scale.ts`'s own
            // ladder (`aside` 13px, `title` 31px).
            fontSize: 'clamp(13px, 3.7vw, 31px)',
            // Tight on purpose: the clear band of sky this sits in is a
            // twentieth of the picture's own height, and a line height with
            // room in it moves the rendered line outside a box measured down
            // to a tenth of a percent (`handoffs/scenes/README.md`).
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: LOGOTYPE_TRACKING,
            // The tracking sits after the last letter as well as between, so
            // a centred line counts it as part of its own width and the
            // letters land half a tracking short of the middle. Taking the
            // whole space off the right corrects it, the same way the button
            // below does for its own tracking — safe to do here, unlike the
            // previous string on this line, because it is the flex item's
            // own box that is centred (`justifyContent: 'center'` in
            // `GATE_NAME_SX`) and a negative margin on that same box shrinks
            // it by exactly the width it removes, rather than a margin meant
            // for a `transform: translate(-50%)` box shifting a second,
            // unrelated box's centring math (the trap the previous string
            // hit, `getBoundingClientRect` at 1440, 834 and 375 catching the
            // rendered name clearing the band's 77% right edge).
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
            '&&&': { color: GATE_INK },
          }}
        >
          WORD GARDEN
        </Typography>
      </Box>

      <Box sx={GATE_TAGLINE_SX}>
        <Typography
          sx={{
            fontFamily: TEXT_FONT_FAMILY,
            fontWeight: 400,
            // A tenth the size of the name's own ladder step — the tagline is
            // read, not lettered, and the band under the name is about half
            // its height, so the same `vw`-driven `clamp()` technique is used
            // at a smaller floor and ceiling rather than at a fixed size that
            // would only fit one width.
            fontSize: 'clamp(9px, 1.8vw, 13px)',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            '&&&': { color: GATE_INK },
          }}
        >
          A cooperative crossword
        </Typography>
      </Box>

      <Box sx={GATE_ACTION_SX}>
        <Button
          component={RouterLink}
          to="/create"
          variant="contained"
          size="large"
          sx={(theme) => ({
            // Lettered rather than written, off the sign face
            // (`theme.typography.signage`) — not the same face the name over
            // the gate is set in any more (issue #148 moved the name onto the
            // logotype, Dela Gothic One, a face this button's label cannot
            // borrow: it is subset to the eight letters of `WORD GARDEN` and
            // has none of "Create a game"'s own). The button keeps the sign
            // face instead, the same lettering `garden/` draws its own labels
            // in (issue #115).
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
