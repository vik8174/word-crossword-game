import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { inRem, SIGN_TRACKING, TEXT_LEVELS } from '../scale';
import { fitToWindow } from './canvas-layer';
import { CLOTH, CLOTH_MS, clothBand, GREETING_FROM } from './cloth';
import { paintCloth } from './paint-cloth';
import { useViewport } from './use-viewport';

/** How wide the rule under the greeting is, and how thick. */
const RULE = { width: '15rem', height: '2px' } as const;

/** How wide the one action is padded, as steps of the row. */
const ACTION_PADDING = { across: 5, down: 3 } as const;

/** How far the words lift as they arrive. */
const RISE = '14px';

/** When the words start and how long they take, in milliseconds. */
const WORDS = {
  after: GREETING_FROM * CLOTH_MS,
  lasting: (1 - GREETING_FROM) * CLOTH_MS,
} as const;

/**
 * The cloth, and the one thing there is to do once it is down.
 *
 * This is the whole of what a finished game is answered with. The camera does
 * not pull back and the room is not left: the player stays at the table they
 * played at, and a cloth is drawn across it from both sides carrying a pattern
 * that was already printed on it
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 *
 * The paper is painted and the words are not. A canvas cannot be read out, kept
 * at the reader's own text size, or tabbed to, so what is on the cloth is
 * ordinary text and an ordinary button standing on a painted surface — which is
 * also why the two halves of this component are two files
 * ({@link paintCloth}).
 *
 * Two readers get the result rather than the event, and they get it in the same
 * way — the cloth is not laid faster, it is simply already down with the words
 * on it. One is somebody who turned animation off in their operating system,
 * which is the answer the camera and the petals give and which no setting in
 * this app overrides. The other is somebody who was not there: a game that
 * ended while the tab was behind another one has already ended by the time they
 * look, and an event played for them then is the reload case wearing a
 * different hat (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * @param props.summary - The one line the game has to say for itself
 *
 * @example
 * <RewardCloth summary="You finished the crossword together — all 12 of its words, between the 2 of you." />
 */
export const RewardCloth = ({ summary }: { readonly summary: string }) => {
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const canvas = useRef<HTMLCanvasElement>(null);
  const band = clothBand(useViewport());

  // Whether anybody was looking at the moment the game ended. Read once and
  // never followed: what matters is whether there was somebody there to see the
  // cloth laid, and nothing that happens afterwards changes the answer.
  const [wasWatched] = useState(() => document.visibilityState !== 'hidden');
  const isAtOnce = isStill || !wasWatched;

  useEffect(() => {
    const element = canvas.current;

    if (element === null) {
      return undefined;
    }

    const brush = element.getContext('2d');

    if (brush === null) {
      return undefined;
    }

    // How far through the event the last frame was, so that a window resized
    // afterwards is repainted as it stood rather than played again.
    let time = isAtOnce ? 1 : 0;
    let frame = 0;
    let started: number | null = null;

    const paint = () => {
      paintCloth(brush, fitToWindow(element, brush), time);
    };

    const step = (now: number) => {
      started ??= now;
      time = Math.min((now - started) / CLOTH_MS, 1);
      paint();

      if (time < 1) {
        frame = window.requestAnimationFrame(step);
      }
    };

    paint();

    if (!isAtOnce) {
      frame = window.requestAnimationFrame(step);
    }

    window.addEventListener('resize', paint);

    return () => {
      window.removeEventListener('resize', paint);
      window.cancelAnimationFrame(frame);
    };
  }, [isAtOnce]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        // Over the finished room rather than beside it. What is behind is the
        // board they filled in, dimmed by the painting below and left there:
        // the cloth is laid over the table, not instead of it.
        zIndex: 'modal',
        display: 'grid',
      }}
    >
      <Box
        component="canvas"
        ref={canvas}
        aria-hidden
        sx={{ gridArea: '1 / 1', width: '100%', height: '100%' }}
      />

      <Box
        component="section"
        aria-labelledby="reward-heading"
        sx={{
          gridArea: '1 / 1',
          position: 'absolute',
          left: 0,
          right: 0,
          top: band.y,
          height: band.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 5,
          textAlign: 'center',
          ...(isAtOnce
            ? {}
            : {
                animation: `reward-words ${WORDS.lasting}ms ease-out ${WORDS.after}ms both`,
                '@keyframes reward-words': {
                  from: { opacity: 0, transform: `translateY(${RISE})` },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }),
        }}
      >
        <Typography
          component="h2"
          variant="signage"
          id="reward-heading"
          sx={{
            fontSize: { xs: inRem(TEXT_LEVELS.heading), sm: inRem(TEXT_LEVELS.title) },
            // The tracking is put after the last letter as well as between, so
            // a centred line sits half a letter to the right without this.
            marginRight: `-${SIGN_TRACKING}`,
            color: CLOTH.ink,
          }}
        >
          Congratulations
        </Typography>

        {/* The temple's red, under the word it belongs to. */}
        <Box
          aria-hidden
          sx={{ width: RULE.width, height: RULE.height, mt: 3, backgroundColor: CLOTH.rule }}
        />

        <Typography sx={{ mt: 5, color: CLOTH.inkDim, maxWidth: '34rem' }}>{summary}</Typography>

        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          sx={(theme) => ({
            mt: 6,
            // Lettered rather than written, off the same face every sign in
            // this place is set in.
            ...theme.typography.signage,
            fontSize: inRem(TEXT_LEVELS.body),
            px: ACTION_PADDING.across,
            py: ACTION_PADDING.down,
            paddingRight: `calc(${theme.spacing(ACTION_PADDING.across)} - ${SIGN_TRACKING})`,
            // Opaque, unlike every other control in this app: those stand on a
            // forest and let it through, and this one stands on paper, which
            // lets nothing through and would wash it out
            // (`scene-palette.test.ts`).
            backgroundColor: CLOTH.action.fill,
            color: CLOTH.action.ink,
            '&:hover': { backgroundColor: CLOTH.action.fill },
          })}
        >
          Back to the gate
        </Button>
      </Box>
    </Box>
  );
};
