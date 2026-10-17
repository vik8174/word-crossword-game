/**
 * The one place the time and the curve of every movement in the app is written
 * down.
 *
 * "The street wakes up" (`docs/decisions/0039-the-street-wakes-up.md`): one
 * language for every movement, taken from the drawing rather than from a
 * library. The numbers are those of the motion block of
 * `design/templates/state-tree.html` (lines 308-359), which is the source;
 * where this file and the block ever disagree, the block is right.
 *
 * There are two curves and the CSS keywords the block uses (`ease`,
 * `ease-out`, `ease-in-out`), each where the block puts it, and no other.
 * `motion-styles.ts` writes the rules from these numbers, `theme.ts` points
 * every transition MUI draws at the first curve, and `button-styles.ts` reads
 * the button's own row from here.
 */

/** The curve of arriving: quick off the mark, settling softly (`--out`). */
/**
 * The class of the face of a square, on both boards. The wave's colour
 * (`s-tone`) selects it, because the teacher's face has no `aria-label`.
 */
export const SQUARE_FACE_CLASS = 'face';

export const OUT_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** The curve of celebrating: overshoots a little and comes back (`--spring`). */
export const SPRING_CURVE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * Every duration, delay and stagger of the table, in milliseconds.
 *
 * A `*Delay` is the base delay of a movement, a `*Step` is what each further
 * element of a sequence adds to it (`--i`, `--d`, `--k` times the step).
 */
export const MOTION_MS = {
  /** A page block rises 14 px and fades in. */
  rise: 620,
  riseDelay: 120,
  riseStep: 70,
  /** The shutters swing open from their hinge. */
  shutters: 900,
  /** A neighbour leans in 10 px and fades in. */
  lean: 700,
  leanDelay: 420,
  /** The line is drawn across. */
  line: 1000,
  lineDelay: 700,
  /** The cards fade in. */
  cards: 500,
  cardsDelay: 1250,
  /** An answered word's squares run a wave, one after another. */
  wave: 760,
  waveStep: 90,
  /** Its card is pegged on the line and swings still. */
  peg: 1100,
  pegDelay: 420,
  /** A refused answer shakes once. */
  shake: 420,
  /** A message rises. */
  message: 520,
  /** The dialog lifts 18 px; the veil behind it fades in. */
  dialog: 460,
  dialogDelay: 60,
  veil: 260,
  /** The fault strip of a field unfolds. */
  fault: 420,
  /** The fiesta card springs up. */
  fiestaCard: 760,
  fiestaCardDelay: 200,
  /** The fiesta's flags drop, then sway for ever. */
  flagDrop: 640,
  flagDropDelay: 400,
  flagStep: 70,
  flagSway: 2400,
  flagSwayDelay: 1040,
  /** The lanterns drop, then sway for ever. */
  lanternDrop: 760,
  lanternDropDelay: 300,
  lanternStep: 80,
  lanternSway: 2600,
  lanternSwayDelay: 1060,
  /** The confetti falls, turning. */
  confetti: 1800,
  confettiDelay: 500,
  confettiStep: 45,
  /** A button lifts on hover; a press is quicker. */
  lift: 160,
  press: 60,
  /** A button's or a mode option's background colour on hover. */
  tone: 220,
  /** A word row's background on hover. */
  row: 200,
} as const;

/**
 * How long a screen stays "entering" after it opens, in milliseconds.
 *
 * The longest movement of a new screen is the cards, which start at 1250 ms
 * and last 500 ms; the page blocks end well before that. After this the
 * `enter` mark comes off, so a block that appears later in the same screen
 * (a panel when the other player arrives) is not a new screen rising again.
 */
export const ENTER_MS = 2000;

/**
 * The two durations MUI's own components move for, and there are no others.
 *
 * Handed to `theme.transitions.duration` in `theme.ts`, where every one of
 * MUI's seven slots points at one of these. A control that changes in place
 * takes the button's lift, 160 ms. A surface that leaves takes the veil's
 * 260 ms. A surface that arrives is the table's own (the dialog's lift and
 * the veil's fade), not MUI's.
 */
export const MOTION_DURATIONS_MS = { quick: MOTION_MS.lift, settle: MOTION_MS.veil } as const;

/**
 * The one curve every transition MUI draws uses, in and out alike: `--out`.
 * MUI's four easing slots all point here, so none of its components moves on a
 * third curve.
 */
export const MOTION_EASING = OUT_CURVE;
