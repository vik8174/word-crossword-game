import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { AnsweredMark } from './AnsweredMark';

/** A token as a browser reports it once computed: `#2D6658` is `rgb(45, 102, 88)`. */
const computed = (hex: string): string =>
  `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

describe('AnsweredMark', () => {
  it('draws an open ring for a word still to answer, not a filled disc', () => {
    const { container } = render(<AnsweredMark isSolved={false} />);

    const mark = container.firstChild as HTMLElement;
    const style = getComputedStyle(mark);
    // A ring rather than a tint of the same fill: a slate border draws it, and
    // nothing fills the disc itself.
    expect(style.borderTopStyle).toBe('solid');
    expect(style.borderTopColor).toBe(computed(theme.palette.street.slate));
    expect(style.backgroundColor).not.toBe(computed(theme.palette.street.spruce));
  });

  it('draws a filled disc in spruce for a word that has been answered, not an open ring', () => {
    const { container } = render(<AnsweredMark isSolved />);

    const mark = container.firstChild as HTMLElement;
    const style = getComputedStyle(mark);
    // A different shape rather than a different colour of the same one: the
    // ring is gone once the disc is filled, so the two states are told apart by
    // more than which colour sits where (issue #150).
    expect(mark).toHaveStyle({ backgroundColor: theme.palette.street.spruce });
    expect(style.borderTopStyle).not.toBe('solid');
  });

  it('is decorative, never named to a screen reader', () => {
    const { container } = render(<AnsweredMark isSolved />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
