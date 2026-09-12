/**
 * The one transition every change of scene plays, and the numbers it plays
 * with.
 *
 * All four are Viktor's own, measured against a real render and accepted on
 * the scene prototype (`handoffs/scenes/README.md`, issue #153, PRD #145):
 * an 1800ms opacity crossfade, a 26s Ken Burns push every picture makes
 * forward and never back, a warm bloom peaking at 38% of the fade, and the
 * temple's own red opening out of the middle over the same 1800ms. They are
 * carried into the app unchanged rather than redesigned here — a value that
 * looks wrong in the running app is something to report, not to adjust.
 *
 * It runs on a change of *scene*, not a change of screen: `GardenScene` only
 * ever asks for one of these when the picture it is about to show is not the
 * one already showing (issue #153's central rule, `ADR 0030`'s fourth thing).
 * Nine screens stand on three pictures, and moving between two screens of the
 * same picture — `create` to `create/errors`, say — is not a journey.
 */

/** How long the crossfade between two pictures takes. */
export const SCENE_FADE_MS = 1800;

/**
 * The curve the crossfade travels on.
 *
 * Numerically the same curve `motion.ts` calls {@link MOTION_EASING}, and
 * declared again here rather than imported from it on purpose: that file is
 * explicit that the screen shift, the petals and the cloth each carry a
 * number "decided and tested on its own terms", and folding one of those onto
 * the shared row is exactly the mistake it warns against. This curve was
 * measured for the scene, not for a button, and the two being the same
 * cubic-bezier is a coincidence of taste rather than a shared source of
 * truth.
 */
export const SCENE_EASING = 'cubic-bezier(.4, 0, .2, 1)';

/**
 * How long a picture takes to push from `scale(1)` to `scale(1.11)`.
 *
 * Far longer than the crossfade, and longer than most visits to a screen: the
 * push is meant to be barely perceptible, felt rather than watched. It runs
 * once, forward, for as long as a picture is on screen at all — it does not
 * reset when a crossfade starts, and it does not run back.
 */
export const KEN_BURNS_MS = 26_000;

/** How far a picture has pushed in by the time it stops: `scale(1.11)`. */
export const KEN_BURNS_SCALE = 1.11;

/** The crossfade in, from nothing to fully shown. */
export const SCENE_ARRIVES = {
  animation: `scene-arrives ${SCENE_FADE_MS}ms ${SCENE_EASING} forwards`,
  '@keyframes scene-arrives': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
} as const;

/**
 * The crossfade out, held at invisible rather than snapping back into view
 * for the instant between the animation ending and the element being taken
 * off the page.
 */
export const SCENE_LEAVES = {
  animation: `scene-leaves ${SCENE_FADE_MS}ms ${SCENE_EASING} forwards`,
  '@keyframes scene-leaves': {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
} as const;

/**
 * The forward push every picture makes for as long as it is on screen.
 *
 * `forwards` rather than looping or reversing: a picture that has pushed in
 * stays pushed in, on purpose (`docs/decisions/0031-one-camera-and-what-it-promises.md`'s
 * "always forward, never back"). Applied to the picture's own inner layer
 * rather than the layer the crossfade animates, so the two `animation`
 * shorthands do not overwrite one another.
 */
export const KEN_BURNS_PUSH = {
  animation: `scene-ken-burns ${KEN_BURNS_MS}ms linear forwards`,
  '@keyframes scene-ken-burns': {
    from: { transform: 'scale(1)' },
    to: { transform: `scale(${KEN_BURNS_SCALE})` },
  },
} as const;

/** How far through the fade the bloom is at its brightest. */
export const BLOOM_PEAK_PERCENT = 38;

/**
 * The warm light that washes over a change of scene, brightest at
 * {@link BLOOM_PEAK_PERCENT} of the fade and gone by the time it ends.
 */
export const SCENE_BLOOM_SX = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  opacity: 0,
  backgroundImage:
    'radial-gradient(circle at 50% 52%, rgba(255, 226, 170, 0.5) 0%, rgba(255, 210, 140, 0.16) 34%, rgba(255, 200, 120, 0) 62%)',
  animation: `scene-bloom ${SCENE_FADE_MS}ms ease-out`,
  '@keyframes scene-bloom': {
    '0%': { opacity: 0 },
    [`${BLOOM_PEAK_PERCENT}%`]: { opacity: 1 },
    '100%': { opacity: 0 },
  },
} as const;

/** The curve the sun opens and closes on. */
export const SUN_EASING = 'cubic-bezier(.2, .7, .3, 1)';

/**
 * How wide the sun is before it opens, in pixels.
 *
 * One number rather than three, because the other two are derived from it:
 * the circle is as tall as it is wide, and it is pulled back by half of
 * itself so that its centre — not its corner — sits on the point the bloom is
 * drawn around. Written down once so that changing the size cannot leave the
 * two halves of that arrangement disagreeing.
 */
const SUN_DIAMETER_PX = 84;

/**
 * Half the sun's own width, as a CSS length rather than as a number.
 *
 * The unit is the whole of the point. `marginLeft` and `marginTop` are
 * spacing props, and a bare number in an `sx` is an index into the theme's
 * own spacing scale (`SPACING_STEPS`, `theme.ts`) rather than a count of
 * pixels. `-42` is not one of those steps, so MUI dropped both margins and
 * handed the browser nothing: the circle rendered from its corner at 50% /
 * 52% instead of around it, 42 px low and right of the light it belongs
 * inside, in dev and in a production build alike. A string with a unit on it
 * goes through untouched.
 */
const SUN_OFFSET = `${-SUN_DIAMETER_PX / 2}px`;

/**
 * The temple's own red, opening out of the middle of the picture and gone
 * before the crossfade is: `scale(.2)` to `scale(7)`, opacity `0` through
 * `.85` back to `0`, over the same {@link SCENE_FADE_MS}.
 *
 * The same mark that sits on the button and beside the name
 * (`scene-surface.ts`'s `CONTROL.mark`) — never a second meaning of it on one
 * screen, which is why this plays only on the scene changing and never
 * doubles as a loading indicator.
 *
 * It opens around 50% / 52% of the window, which is the point
 * {@link SCENE_BLOOM_SX} draws its own light around: the sun belongs inside
 * the bloom, and the two are registered against each other by standing on the
 * same point rather than by being placed separately. {@link SUN_OFFSET} is
 * what puts the circle's centre there instead of its corner, and it is a
 * length rather than a number for a reason worth reading before touching it.
 */
export const SCENE_SUN_SX = {
  position: 'absolute',
  left: '50%',
  top: '52%',
  width: SUN_DIAMETER_PX,
  height: SUN_DIAMETER_PX,
  marginLeft: SUN_OFFSET,
  marginTop: SUN_OFFSET,
  borderRadius: '50%',
  pointerEvents: 'none',
  opacity: 0,
  animation: `scene-sun ${SCENE_FADE_MS}ms ${SUN_EASING}`,
  '@keyframes scene-sun': {
    '0%': { opacity: 0, transform: 'scale(0.2)' },
    '30%': { opacity: 0.85, transform: 'scale(1)' },
    '100%': { opacity: 0, transform: 'scale(7)' },
  },
} as const;
