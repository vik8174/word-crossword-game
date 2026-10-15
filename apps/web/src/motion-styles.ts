import { MOTION_MS as MS, OUT_CURVE as OUT } from './motion';
import { at, ms, noPreference } from './motion-css';

/**
 * The rules that make the street move: a port of the motion block of
 * `design/templates/state-tree.html` (lines 308-359), written from the numbers
 * in `motion.ts` and nowhere else, as a style sheet so that it reads against
 * the drawing rule for rule.
 *
 * The drawing's classes are the hooks, so the elements that carry them are
 * those of the drawing and the rules read the same:
 *
 * - `enter` is on a screen for the first `ENTER_MS` after it opens
 *   (`ScreenEnter`). Everything a screen does on arrival is under it: the page
 *   blocks rise (`data-rise` on a block, `data-rise-children` on the element
 *   whose children are blocks; `--i` is their place in reading order across the
 *   screen), and the street draws itself (`shutter`, `who`, `line-draw`,
 *   `card`).
 * - `pegged` is the card of the word just answered, `cell just` a square of it
 *   (`--d` its place in the word) and `cell refused` a square of a wrong answer.
 * - `data-fiesta="arrives"` is on a finished screen reached from `playing`
 *   within the session. Under it the fiesta card springs up, the flags and
 *   lanterns drop and the confetti falls. Without it the fiesta is already
 *   there and only the flags and lanterns sway: a reload, a new tab or a link
 *   to a finished room does not throw it again.
 *
 * Every rule lives inside `no-preference`: with reduced motion the page is
 * simply there, and nothing waits for a delay to come into view (`theme.ts`
 * zeroes delays as well).
 *
 * Only `transform`, `opacity`, `clip-path`, `background-color`, `box-shadow`
 * and, for the line alone, `stroke-dashoffset` are animated.
 *
 * Two differences from the drawing, both for MUI's sake: the dialog's veil has
 * no fill after it ends, because MUI fades the backdrop out with a transition
 * on `opacity` and an animation holding the opacity at 1 would hold it there
 * through the fade-out; and a fiesta that is already standing sways from a
 * negative delay, so each piece is part-way through a swing at the first frame.
 */

/**
 * The rules of a screen opening: the blocks rise and the street draws itself.
 * Mounted once, with the app, because the first screen of all is one.
 */
export const MOTION_CSS = noPreference([
  `.enter [data-rise],.enter [data-rise-children]>*{animation:s-rise ${ms(MS.rise)} ${OUT} both;animation-delay:${at('--i', MS.riseStep, MS.riseDelay)}}`,
  `@keyframes s-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`,
  `.enter svg .shutter{transform-box:fill-box;animation:s-swing ${ms(MS.shutters)} ${OUT} both}`,
  `.enter svg .shutter.sl{transform-origin:100% 50%}`,
  `.enter svg .shutter.sr{transform-origin:0 50%}`,
  `@keyframes s-swing{from{transform:scaleX(-1)}35%{transform:scaleX(-.6)}to{transform:scaleX(1)}}`,
  `.enter svg .card{animation:s-appear ${ms(MS.cards)} ease ${ms(MS.cardsDelay)} both}`,
  `@keyframes s-appear{from{opacity:0}to{opacity:1}}`,
  `.enter svg .who{animation:s-lean ${ms(MS.lean)} ${OUT} ${ms(MS.leanDelay)} both}`,
  `@keyframes s-lean{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`,
  `.enter svg .line-draw{stroke-dasharray:1;animation:s-draw ${ms(MS.line)} ${OUT} ${ms(MS.lineDelay)} both}`,
  `@keyframes s-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`,
]);
