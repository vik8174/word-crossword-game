/**
 * How far apart two opaque colours are, 1:1 to 21:1, as WCAG defines it.
 *
 * Used by the tests that hold a pair of colours to a bar (`4.5:1` for text).
 * It reads `#rrggbb` and the `rgb(r, g, b)` that MUI works out for a shade, and
 * nothing else: a colour with an opacity needs to be laid over the surface it
 * is drawn on first, which is `theme.test.ts`'s own job.
 *
 * @param foreground - The colour of what is written
 * @param background - The opaque surface it is written on
 * @returns The ratio, unrounded
 *
 * @example
 * contrastBetween('#1B2D38', '#E6EEEC'); // 12.04…
 */
export const contrastBetween = (foreground: string, background: string): number => {
  const luminance = (colour: string): number => {
    const [red, green, blue] = channelsOf(colour).map((channel) => {
      const value = channel / 255;

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const one = luminance(foreground);
  const other = luminance(background);

  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
};

/** A colour as three channels, from `#rrggbb` or from `rgb(r, g, b)`. */
const channelsOf = (colour: string): readonly [number, number, number] => {
  if (colour.startsWith('#')) {
    return [
      parseInt(colour.slice(1, 3), 16),
      parseInt(colour.slice(3, 5), 16),
      parseInt(colour.slice(5, 7), 16),
    ];
  }

  const [red = NaN, green = NaN, blue = NaN] = colour
    .slice(colour.indexOf('(') + 1, colour.lastIndexOf(')'))
    .split(',')
    .map(Number);

  if (Number.isNaN(red + green + blue)) {
    throw new Error(`Not a colour this helper can read: ${colour}`);
  }

  return [red, green, blue];
};
