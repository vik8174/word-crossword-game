import type { TypographyVariantsOptions } from '@mui/material/styles';
import type { CSSProperties } from 'react';

import {
  inRem,
  SIGN_FONT_FAMILY,
  SIGN_FONT_WEIGHT,
  SIGN_TRACKING,
  TEXT_FONT_FAMILY,
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
 * A heading: the text face at its bold weight, on one of the four levels.
 *
 * The family is not named here either, for the same reason {@link textLevel}
 * does not name it — a heading used to be a different face from the text
 * around it (issue #124); issue #147 dropped that face, and a heading is now
 * told apart from a paragraph by weight and size alone.
 *
 * @param level - The level it is set on, from {@link TEXT_LEVELS}
 */
const headingLevel = (level: number) => ({
  fontWeight: WEIGHTS.bold,
  fontSize: inRem(level),
  // Tighter than the text below it, because a heading of two lines that is
  // leaded like a paragraph reads as two headings.
  lineHeight: 1.25,
});

/**
 * Text: the text face, on one of the two small levels.
 *
 * The family is not named here. It is the one the theme is set in, so a variant
 * that says nothing about a family gets the text face and there is one place
 * that decides which face that is.
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
 * The heading role has two levels rather than four, and MUI has four slots for
 * it. All four are pinned to those two, so reaching for `h3` where `h2` was
 * meant lands on the scale instead of on a default.
 */
export const TYPOGRAPHY: TypographyVariantsOptions = {
  fontFamily: TEXT_FONT_FAMILY,
  fontWeightRegular: WEIGHTS.regular,
  // Two weights, so `medium` and `bold` are the same bold rather than a third
  // and a fourth thickness nobody chose between.
  fontWeightMedium: WEIGHTS.bold,
  fontWeightBold: WEIGHTS.bold,

  h1: headingLevel(TEXT_LEVELS.title),
  h2: headingLevel(TEXT_LEVELS.heading),
  h3: headingLevel(TEXT_LEVELS.heading),
  h4: headingLevel(TEXT_LEVELS.heading),

  // Below the four heading levels, a heading is a label on a panel rather
  // than something to look at, so it is set at the size of the text under
  // it — told apart from a paragraph by weight alone.
  h5: textLevel(TEXT_LEVELS.body, WEIGHTS.bold),
  h6: textLevel(TEXT_LEVELS.body, WEIGHTS.bold),
  subtitle1: textLevel(TEXT_LEVELS.body, WEIGHTS.bold),
  subtitle2: textLevel(TEXT_LEVELS.aside, WEIGHTS.bold),

  body1: textLevel(TEXT_LEVELS.body, WEIGHTS.regular),
  body2: textLevel(TEXT_LEVELS.aside, WEIGHTS.regular),
  caption: textLevel(TEXT_LEVELS.aside, WEIGHTS.regular),
  overline: {
    ...textLevel(TEXT_LEVELS.aside, WEIGHTS.bold),
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  // A button says what pressing it does, in the words of the sentence beside
  // it rather than shouted in capitals.
  button: { ...textLevel(TEXT_LEVELS.body, WEIGHTS.bold), textTransform: 'none' },

  // The third role, which nothing in the interface uses and the garden does:
  // lettering on a sign, in capitals held apart (issue #115).
  signage: {
    fontFamily: SIGN_FONT_FAMILY,
    fontWeight: SIGN_FONT_WEIGHT,
    fontSize: inRem(TEXT_LEVELS.heading),
    lineHeight: 1.25,
    textTransform: 'uppercase',
    letterSpacing: SIGN_TRACKING,
  },
};
