import type { CSSProperties } from 'react';

import { inRem } from './scale';

/**
 * The colours of Across the Street (design v2), by the names the drawing gives
 * them in `design/templates/state-tree.html`, lines 50-56.
 *
 * They sit beside the old tokens: nothing reads them yet, and the screens move
 * onto them in #222 and in their own issues. The four derived values are the
 * ones the drawing computes rather than names (its contrast table, lines
 * 27-43).
 */
export interface StreetPalette {
  /** The ground. */
  readonly duck: string;
  /** Squares and cards. */
  readonly tile: string;
  /** Text and outlines. */
  readonly ink: string;
  /** Secondary text. */
  readonly slate: string;
  /** The action. */
  readonly spruce: string;
  /** The lit window. */
  readonly ochre: string;
  /** The filling of the word being filled. */
  readonly wash: string;
  /** The refused square. */
  readonly rose: string;
  /** Drawing only, never text. */
  readonly stone: string;
  /** Rules. */
  readonly line: string;
  /** Refusal and error ink. */
  readonly brick: string;
  /** An answered square. */
  readonly sage: string;
  /** A word you explain, on your board. */
  readonly paper: string;
  /** The finished card. */
  readonly fiesta: string;
  /** The action's label and the fiesta card's text. */
  readonly onAccent: string;
  /** The surface of a disabled action. */
  readonly disabledSurface: string;
  /** The label of a disabled action. */
  readonly disabledLabel: string;
  /** The rule round a disabled action. */
  readonly disabledRule: string;
}

export const STREET: StreetPalette = {
  duck: '#E6EEEC',
  tile: '#FAFBFA',
  ink: '#1B2D38',
  slate: '#4C6170',
  spruce: '#2D6658',
  ochre: '#F2C766',
  wash: '#F6E3B4',
  rose: '#E9CBC1',
  stone: '#C5D8D6',
  line: '#C3D0CD',
  brick: '#A33A2C',
  sage: '#D3E8DD',
  paper: '#EFE6D2',
  fiesta: '#B23A28',
  onAccent: '#FFFFFF',
  disabledSurface: '#BFCBC8',
  disabledLabel: '#3E5058',
  disabledRule: '#8A9997',
};

/** A variant, which may carry media queries beside its plain properties. */
type StreetStyle = CSSProperties & Record<string, unknown>;

type StreetVariants = Record<
  'title' | 'stepTitle' | 'lede' | 'heading' | 'body' | 'label' | 'hint' | 'small',
  StreetStyle
>;
type StreetVariantsOptions = Partial<StreetVariants>;

/** The width under which the title and the lede are set smaller. */
const PHONE_BELOW = 768;

const underPhoneWidth = `@media (max-width:${PHONE_BELOW - 1}px)`;

/**
 * The eight text sizes of the drawing (lines 110-114), as theme variants.
 * Only the sizes, weights and leading are here: the face is #244.
 */
export const STREET_TYPOGRAPHY: StreetVariantsOptions = {
  title: {
    fontSize: inRem(88),
    fontWeight: 700,
    lineHeight: 0.95,
    letterSpacing: '-.015em',
    [underPhoneWidth]: { fontSize: inRem(54) },
  },
  stepTitle: { fontSize: inRem(34), fontWeight: 700, lineHeight: 1.1 },
  lede: {
    fontSize: inRem(24),
    lineHeight: 1.4,
    [underPhoneWidth]: { fontSize: inRem(20) },
  },
  heading: { fontSize: inRem(22), fontWeight: 700, lineHeight: 1.3 },
  body: { fontSize: inRem(18), lineHeight: 1.5 },
  label: { fontSize: inRem(17), lineHeight: 1.5 },
  hint: { fontSize: inRem(16), lineHeight: 1.5 },
  small: { fontSize: inRem(15), lineHeight: 1.5 },
};

declare module '@mui/material/styles' {
  interface Palette {
    street: StreetPalette;
  }

  interface PaletteOptions {
    street?: StreetPalette;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TypographyVariants extends StreetVariants {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TypographyVariantsOptions extends StreetVariantsOptions {}
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    title: true;
    stepTitle: true;
    lede: true;
    heading: true;
    body: true;
    label: true;
    hint: true;
    small: true;
  }
}
