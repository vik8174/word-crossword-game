import type { TypographyVariantsOptions } from '@mui/material/styles';
import type { CSSProperties } from 'react';

import {
  DISPLAY_FONT_FAMILY,
  inRem,
  SIGN_FONT_FAMILY,
  SIGN_FONT_WEIGHT,
  SYSTEM_FONT_FAMILY,
  TEXT_LEVELS,
  WEIGHTS,
} from './scale';

declare module '@mui/material/styles' {
  /**
   * The sign face as a variant of the theme's own.
   *
   * It is one of the three roles a face plays here and the only one MUI has no
   * slot for, so it is given one: the scene reads `theme.typography.signage`
   * rather than writing a family and a tracking of its own onto a canvas
   * (issue #115).
   */
  interface TypographyVariants {
    signage: CSSProperties;
  }

  interface TypographyVariantsOptions {
    signage?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    signage: true;
  }
}

/**
 * A heading: the display face at its one weight, on one of the two large
 * levels.
 *
 * @param level - The level it is set on, from {@link TEXT_LEVELS}
 */
const displayLevel = (level: number) => ({
  fontFamily: DISPLAY_FONT_FAMILY,
  fontWeight: WEIGHTS.regular,
  fontSize: inRem(level),
  // Tighter than the text below it, because a heading of two lines that is
  // leaded like a paragraph reads as two headings.
  lineHeight: 1.25,
});

/**
 * Text: the reader's own system font, on one of the two small levels.
 *
 * @param level - The level it is set on, from {@link TEXT_LEVELS}
 * @param weight - Which of the two weights, from {@link WEIGHTS}
 */
const textLevel = (level: number, weight: number) => ({
  fontSize: inRem(level),
  fontWeight: weight,
  lineHeight: 1.5,
});

/**
 * The four levels, on every variant MUI has.
 *
 * The app used seven sizes across four screens, and two of them — `body1` and
 * `subtitle1` — were the same sixteen pixels under two names. What is written
 * out here is not seven sizes tidied up but four, each variant pointing at the
 * level it belongs to: a variant left unsaid would keep a size of MUI's own
 * and so quietly be a fifth.
 *
 * The display face has two levels rather than four, and MUI has four slots for
 * it. All four are pinned to those two, so reaching for `h3` where `h2` was
 * meant lands on the scale instead of on a default.
 */
export const TYPOGRAPHY: TypographyVariantsOptions = {
  fontFamily: SYSTEM_FONT_FAMILY,
  fontWeightRegular: WEIGHTS.regular,
  // Two weights, so `medium` and `bold` are the same semibold rather than a
  // third and a fourth thickness nobody chose between.
  fontWeightMedium: WEIGHTS.semibold,
  fontWeightBold: WEIGHTS.semibold,

  h1: displayLevel(TEXT_LEVELS.title),
  h2: displayLevel(TEXT_LEVELS.heading),
  h3: displayLevel(TEXT_LEVELS.heading),
  h4: displayLevel(TEXT_LEVELS.heading),

  // Below the display face a heading is a label on a panel rather than
  // something to look at, and a label is read fastest in the font the
  // reader's system draws — at the size of the text under it, told apart by
  // its weight.
  h5: textLevel(TEXT_LEVELS.body, WEIGHTS.semibold),
  h6: textLevel(TEXT_LEVELS.body, WEIGHTS.semibold),
  subtitle1: textLevel(TEXT_LEVELS.body, WEIGHTS.semibold),
  subtitle2: textLevel(TEXT_LEVELS.aside, WEIGHTS.semibold),

  body1: textLevel(TEXT_LEVELS.body, WEIGHTS.regular),
  body2: textLevel(TEXT_LEVELS.aside, WEIGHTS.regular),
  caption: textLevel(TEXT_LEVELS.aside, WEIGHTS.regular),
  overline: {
    ...textLevel(TEXT_LEVELS.aside, WEIGHTS.semibold),
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  // A button says what pressing it does, in the words of the sentence beside
  // it rather than shouted in capitals.
  button: { ...textLevel(TEXT_LEVELS.body, WEIGHTS.semibold), textTransform: 'none' },

  // The third role, which nothing in the interface uses and the garden does:
  // lettering on a sign, in capitals held apart (issue #115).
  signage: {
    fontFamily: SIGN_FONT_FAMILY,
    fontWeight: SIGN_FONT_WEIGHT,
    fontSize: inRem(TEXT_LEVELS.heading),
    lineHeight: 1.25,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
  },
};
