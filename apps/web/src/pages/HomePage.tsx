import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { belowFrame } from '../components/frame-height';
import { gateHintSx } from '../components/gate-panel-styles';
import { lobbyTightStackSx } from '../components/lobby-styles';
import { PillButton } from '../components/PillButton';
import { BLOCKS_PROPS } from '../components/screen-blocks';
import { ScreenEnter } from '../components/ScreenEnter';
import { Street } from '../components/Street';
import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** The drawing's name for a screen reader: what the picture shows (template `scene()`). */
const STREET_LABEL =
  'Two neighbours on facing balconies in a white Andalusian street, with a line strung between them';

/** The steps, in the order a game goes. */
const STEPS = [
  'Type 10 to 20 words',
  'Send the link to one person',
  'Explain and guess out loud',
] as const;

/** From the template's wide layout (`layoutFor`, line 1099): two columns, steps along the bottom. */
const FROM_WIDE = '@media (min-width: 1200px)';
/** Under the template's tablet layout: the phone's smaller lettering. */
const PHONE = '@media (max-width: 767.95px)';
/** From the tablet layout up: the side padding is 32px, 48px from wide. */
const FROM_TABLET = '@media (min-width: 768px)';

/**
 * Landing page: the name, one sentence, the one action, the street drawn
 * beside them, and the three steps of a game.
 *
 * Built to `?state=home` of `design/templates/state-tree.html` (lines 244-252
 * and 834-844). Wide, the text and the drawing (640px) stand side by side and
 * the steps run along the bottom of the screen, 44px above its edge. Narrower,
 * the drawing comes first, at most 560px wide, and the steps stack under the
 * action. The screen is at least the window less the frame's header
 * (`belowFrame`), so the steps' place is measured from the window's bottom.
 *
 * Under the action stands the hint that a lesson can be run (template line 841,
 * 10px under the button): plain text, since the way into `/create` with the
 * lesson already chosen is the lesson summary's issue (#236).
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one. It is where the funnel starts, so it says it was reached (issue #51).
 */
export const HomePage = () => {
  useScreenReached('home');

  return (
    <ScreenEnter>
      <Box
        {...BLOCKS_PROPS}
        component="main"
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          alignItems: 'center',
          gap: inRem(24),
          minHeight: belowFrame('100dvh'),
          padding: `${inRem(24)} ${inRem(18)} ${inRem(40)}`,
          [FROM_TABLET]: { paddingInline: inRem(32) },
          [FROM_WIDE]: {
            gridTemplateColumns: 'minmax(0, 1fr) 640px',
            gap: inRem(64),
            paddingInline: inRem(48),
            paddingBottom: inRem(120),
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: inRem(24) }}>
          <Typography
            component="h1"
            sx={{
              margin: 0,
              fontFamily: TEXT_FONT_FAMILY,
              fontWeight: 700,
              color: STREET.ink,
              fontSize: inRem(88),
              lineHeight: 0.95,
              letterSpacing: '-0.015em',
              [PHONE]: { fontSize: inRem(54) },
            }}
          >
            Across the Street
          </Typography>

          <Typography
            sx={{
              margin: 0,
              fontFamily: TEXT_FONT_FAMILY,
              color: STREET.slate,
              fontSize: inRem(24),
              lineHeight: 1.4,
              [PHONE]: { fontSize: inRem(20) },
            }}
          >
            A cooperative crossword. You explain your words out loud, your friend guesses them, and
            the board fills up between you.
          </Typography>

          <Box sx={lobbyTightStackSx}>
            <Box>
              <PillButton component={RouterLink} to="/create">
                Create a game
              </PillButton>
            </Box>
            <Box component="p" sx={gateHintSx}>
              Teaching a language? Run it as a lesson for two of your students.
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            order: -1,
            width: '100%',
            maxWidth: 560,
            marginInline: 'auto',
            [FROM_WIDE]: { order: 0, maxWidth: 'none', marginInline: 0 },
          }}
        >
          <Street letters="radio" mood="talk" crop="full" label={STREET_LABEL} />
        </Box>

        <Box
          component="ol"
          sx={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: inRem(12),
            [FROM_WIDE]: {
              flexDirection: 'row',
              gap: inRem(40),
              position: 'absolute',
              left: inRem(48),
              bottom: inRem(44),
            },
          }}
        >
          {STEPS.map((step, index) => (
            <Box
              component="li"
              key={step}
              sx={{
                display: 'flex',
                gap: inRem(12),
                alignItems: 'baseline',
                maxWidth: 240,
                fontSize: inRem(17),
                color: STREET.slate,
              }}
            >
              <Box
                component="b"
                sx={{
                  flex: 'none',
                  width: inRem(28),
                  height: inRem(28),
                  borderRadius: '5px',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: inRem(16),
                  color: STREET.ink,
                  backgroundColor: STREET.tile,
                  boxShadow: `inset 0 0 0 1.5px ${STREET.ink}`,
                }}
              >
                {index + 1}
              </Box>
              {step}
            </Box>
          ))}
        </Box>
      </Box>
    </ScreenEnter>
  );
};
