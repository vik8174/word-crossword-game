import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SCENE } from '../garden/scene-palette';
import { AnsweredMark } from './AnsweredMark';

describe('AnsweredMark', () => {
  it('draws an open ring for a word still to answer, not a filled disc', () => {
    const { container } = render(<AnsweredMark isSolved={false} />);

    const mark = container.firstChild as HTMLElement;
    const style = getComputedStyle(mark);
    // A ring rather than a tint of the same fill: the box-shadow that draws it
    // is present, and nothing fills the disc itself.
    expect(style.boxShadow).not.toBe('');
    expect(style.backgroundColor).not.toBe(SCENE.vermilionLit);
  });

  it('draws a filled disc for a word that has been answered, not an open ring', () => {
    const { container } = render(<AnsweredMark isSolved />);

    const mark = container.firstChild as HTMLElement;
    const style = getComputedStyle(mark);
    // A different shape rather than a different colour of the same one: the
    // ring's box-shadow is gone once the disc is filled, so the two states are
    // told apart by more than which colour sits where (issue #150).
    expect(mark).toHaveStyle({ backgroundColor: SCENE.vermilionLit });
    expect(style.boxShadow).toBe('');
  });

  it('is decorative, never named to a screen reader', () => {
    const { container } = render(<AnsweredMark isSolved />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
