import type { CSSObject } from '@mui/material/styles';

import { SCENE, SCENE_INK_DIM } from '../garden/scene-palette';
import { inRem, WEIGHTS } from '../scale';

/**
 * What is written inside a zone: its air, the gap between its blocks, and the
 * two pieces of text every block in it is made of, a heading and a hint.
 *
 * Every number here is the template's own (`design/templates/state-tree.html`:
 * `.zone` at line 306, `.zone h3` at 345, `.hint` at 349, `.stack` at 359) and
 * none of them is a step of `scale.ts`'s spacing row or one of its four text
 * levels, the same way the frame's padding is not (`RoomShell.tsx`'s
 * `FRAME_PADDING`). They are the zone's own, written once here because three
 * blocks read them: the player list, the invite link and the line that names
 * the crossword (issue #199). Lengths are in `rem`, so a reader who has made
 * their text larger gets a zone that grows with it.
 */

/** How much air a zone keeps between its own edge and what is written in it. */
export const ZONE_PADDING = `${inRem(14)} ${inRem(15)} ${inRem(16)}`;

/** How far apart the blocks of a zone stand: `.stack`, 14px. */
export const ZONE_BLOCK_GAP = inRem(14);

/**
 * The name of a block in a zone: 15px, bold, cream, its line the page's 1.6
 * (24px) and 3px under it before the hint.
 *
 * 15px is not one of the four levels `context.md` closes (31, 23, 17, 13). It
 * is a heading standing inside a panel rather than over a page, and the
 * drawing sets it at 15 on every screen that has a zone.
 */
export const zoneHeadingSx: CSSObject = {
  margin: `0 0 ${inRem(3)}`,
  fontSize: inRem(15),
  fontWeight: WEIGHTS.bold,
  lineHeight: 1.6,
  color: SCENE.cream,
};

/**
 * The sentence under a block's name: 11px, dim cream, and 10px before what
 * follows it. A block whose hint is the last thing in it takes the margin off.
 *
 * Written as a plain element and not as a `Typography` `body2`: `ON_SCENE_SX`
 * dims that variant by descendant selector, and a hint that is dim because of
 * its own rule cannot be dimmed a second time by somebody else's.
 */
export const zoneHintSx: CSSObject = {
  margin: `0 0 ${inRem(10)}`,
  fontSize: inRem(11),
  lineHeight: 1.5,
  color: SCENE_INK_DIM,
};
