import type { CSSProperties } from 'react';

import { inRem, TEXT_FONT_FAMILY } from './scale';

/**
 * The colours of Across the Street (design v2), by the names the drawing gives
 * them in `design/templates/state-tree.html`, lines 50-56.
 *
 * They are the colours of the app: the garden's are gone (#222), and every
 * module that draws in a colour reads one of these, through `theme.palette`
 * or by import from here. The four derived values are the ones the drawing
 * computes rather than names (its contrast table, lines 27-43). The board's
 * squares read these tokens too (`theme.ts`, issue #228).
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

/**
 * The ring a focused field is drawn with: a halo, a glow and a lift, in the
 * action's own colour.
 *
 * A focus indicator is not drawn for the picture, so it stays when the picture
 * goes (#222), with the three layers it always had, in the shape it had them.
 * Their colours are the street's: the two layers round the field are spruce,
 * thinned, and the lift under it is ink, thinned. Written here with the tokens
 * it is made of, so that no component declares a colour of its own.
 */
export const FOCUS_RING = [
  `0 0 0 3px color-mix(in srgb, ${STREET.spruce} 28%, transparent)`,
  `0 0 18px -2px color-mix(in srgb, ${STREET.spruce} 55%, transparent)`,
  `0 8px 22px -12px color-mix(in srgb, ${STREET.ink} 75%, transparent)`,
].join(', ');

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

/** A variant set in the app's one face, which a custom variant is not given by MUI. */
const inFace = (style: StreetStyle): StreetStyle => ({ fontFamily: TEXT_FONT_FAMILY, ...style });

/**
 * The eight text sizes of the drawing (lines 110-114), as theme variants, all
 * in Alegreya Sans (`--face`, line 53; issue #244). A variant MUI does not ship
 * gets no family of its own, so each names it rather than leaning on the page
 * around it.
 */
export const STREET_TYPOGRAPHY: StreetVariantsOptions = {
  title: inFace({
    fontSize: inRem(88),
    fontWeight: 700,
    lineHeight: 0.95,
    letterSpacing: '-.015em',
    [underPhoneWidth]: { fontSize: inRem(54) },
  }),
  stepTitle: inFace({ fontSize: inRem(34), fontWeight: 700, lineHeight: 1.1 }),
  lede: inFace({
    fontSize: inRem(24),
    lineHeight: 1.4,
    [underPhoneWidth]: { fontSize: inRem(20) },
  }),
  heading: inFace({ fontSize: inRem(22), fontWeight: 700, lineHeight: 1.3 }),
  body: inFace({ fontSize: inRem(18), lineHeight: 1.5 }),
  label: inFace({ fontSize: inRem(17), lineHeight: 1.5 }),
  hint: inFace({ fontSize: inRem(16), lineHeight: 1.5 }),
  small: inFace({ fontSize: inRem(15), lineHeight: 1.5 }),
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
