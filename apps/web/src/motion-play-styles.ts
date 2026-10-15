import { MOTION_MS as MS, OUT_CURVE as OUT, SPRING_CURVE as SPRING } from './motion';
import { at, ms, noPreference } from './motion-css';
import { STREET } from './street';

/**
 * The rules of the screens that play and are asked for: the board turning over
 * and shaking, the card pegged, the fiesta, a message rising, a fault unfolding,
 * the dialog and its veil. They are the second half of the movement sheet
 * `motion-styles.ts` opens (the rest of the module comment there applies to
 * these rules too).
 *
 * A module of its own, mounted with the pages that draw them (`RoomPage`,
 * `CreateRoomPage`), which are fetched only when they are asked for, so the
 * first visit does not carry them.
 */

/** A sway that never ends: the flags and the lanterns. */
const sway = (duration: number): string => `s-sway ${ms(duration)} ease-in-out infinite alternate`;

export const MOTION_PLAY_CSS = noPreference([
  `.cell.just{animation:s-turn ${ms(MS.turn)} ${OUT} both;animation-delay:${at('--d', MS.turnStep, 0)}}`,
  `.cell.just>[aria-label]{animation:s-tone ${ms(MS.turn)} ${OUT} both;animation-delay:${at('--d', MS.turnStep, 0)}}`,
  `@keyframes s-turn{from{transform:perspective(300px) rotateX(-95deg)}to{transform:none}}`,
  `@keyframes s-tone{from{background-color:${STREET.tile}}55%{background-color:${STREET.sage}}}`,
  `svg .pegged{transform-box:fill-box;transform-origin:50% 0;animation:s-peg ${ms(MS.peg)} ${OUT} ${ms(MS.pegDelay)} both}`,
  `@keyframes s-peg{0%{opacity:0;transform:translateY(-26px) rotate(-16deg)}45%{opacity:1;transform:translateY(0) rotate(9deg)}70%{transform:rotate(-4deg)}88%{transform:rotate(1.5deg)}100%{transform:none}}`,
  `.cell.refused{animation:s-shake ${ms(MS.shake)} ${OUT} both}`,
  `@keyframes s-shake{0%,100%{transform:none}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-2px)}80%{transform:translateX(1px)}}`,
  `.modal-veil{animation:s-veil ${ms(MS.veil)} ease-out backwards}`,
  `@keyframes s-veil{from{opacity:0}to{opacity:1}}`,
  `.dialog{animation:s-lift ${ms(MS.dialog)} ${OUT} ${ms(MS.dialogDelay)} both}`,
  `@keyframes s-lift{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}`,
  `.field-fault{animation:s-unfold ${ms(MS.fault)} ${OUT} both}`,
  `@keyframes s-unfold{from{clip-path:inset(0 0 100% 0);opacity:0}to{clip-path:inset(0 0 0 0);opacity:1}}`,
  `.msg{animation:s-rise ${ms(MS.message)} ${OUT} both}`,
  `.fiesta .flag{animation:${sway(MS.flagSway)};animation-delay:calc(var(--k,0)*-${ms(MS.flagStep * 2)})}`,
  `svg .lantern{transform-box:fill-box;transform-origin:50% 0;animation:${sway(MS.lanternSway)};animation-delay:calc(var(--k,0)*-${ms(MS.lanternStep * 2)})}`,
  `[data-fiesta=arrives] .fiesta{animation:s-spring ${ms(MS.fiestaCard)} ${SPRING} ${ms(MS.fiestaCardDelay)} both}`,
  `@keyframes s-spring{from{opacity:0;transform:translateY(20px) scale(.92)}to{opacity:1;transform:none}}`,
  `[data-fiesta=arrives] .fiesta .flag{animation:s-drop ${ms(MS.flagDrop)} ${SPRING} both,${sway(MS.flagSway)};animation-delay:${at('--k', MS.flagStep, MS.flagDropDelay)},${at('--k', MS.flagStep, MS.flagSwayDelay)}}`,
  `[data-fiesta=arrives] svg .lantern{animation:s-drop ${ms(MS.lanternDrop)} ${SPRING} both,${sway(MS.lanternSway)};animation-delay:${at('--k', MS.lanternStep, MS.lanternDropDelay)},${at('--k', MS.lanternStep, MS.lanternSwayDelay)}}`,
  `@keyframes s-drop{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:none}}`,
  `@keyframes s-sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}`,
  `[data-fiesta=arrives] svg .confetti{animation:s-fall ${ms(MS.confetti)} ${OUT} both;animation-delay:${at('--k', MS.confettiStep, MS.confettiDelay)}}`,
  `@keyframes s-fall{from{opacity:0;transform:translateY(-140px) rotate(-120deg)}20%{opacity:1}to{opacity:1;transform:none}}`,
  ``,
]);
