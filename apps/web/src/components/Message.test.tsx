import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Message } from './Message';

/**
 * Every severity, and what each part is drawn in by its role: the mark's fill
 * and glyph are the kind's own, the head line is ink except an error's, which
 * is brick (template lines 139-148).
 */
const KINDS = [
  { kind: 'error', glyph: '×', fill: 'rgb(233, 203, 193)', head: 'rgb(163, 58, 44)' },
  { kind: 'warning', glyph: '!', fill: 'rgb(242, 199, 102)', head: 'rgb(27, 45, 56)' },
  { kind: 'info', glyph: 'i', fill: 'rgb(250, 251, 250)', head: 'rgb(27, 45, 56)' },
  { kind: 'success', glyph: '✓', fill: 'rgb(45, 102, 88)', head: 'rgb(27, 45, 56)' },
] as const;

describe('Message', () => {
  it.each(KINDS)('draws $kind in the colours of its roles', ({ kind, glyph, fill, head }) => {
    render(
      <Message kind={kind} heading="A head line">
        A sentence.
      </Message>,
    );

    const surface = screen.getByRole('alert');
    const style = getComputedStyle(surface);

    // surface: a tile with a 1.5px ink ring, 12px corners, 16px 18px padding
    expect(style.backgroundColor).toBe('rgb(250, 251, 250)');
    expect(style.boxShadow.toLowerCase()).toBe('0 0 0 1.5px #1b2d38');
    expect(style.borderRadius).toBe('0.75rem');
    expect(style.padding).toBe('16px 18px');
    expect(style.gap).toBe('0.875rem');

    const headStyle = getComputedStyle(screen.getByText('A head line'));

    expect(headStyle.fontSize).toBe('19px');
    expect(headStyle.fontWeight).toBe('700');
    expect(headStyle.color).toBe(head);
    expect(headStyle.marginBottom).toBe('2px');
    expect(headStyle.textTransform).not.toBe('uppercase');

    const bodyStyle = getComputedStyle(screen.getByText('A sentence.'));

    expect(bodyStyle.fontSize).toBe('17px');
    expect(bodyStyle.color).toBe('rgb(27, 45, 56)');

    const mark = surface.querySelector('[aria-hidden="true"]') as HTMLElement;
    const markStyle = getComputedStyle(mark);

    expect(mark).toHaveTextContent(glyph);
    expect(markStyle.width).toBe('26px');
    expect(markStyle.height).toBe('26px');
    expect(markStyle.borderRadius).toBe('0.375rem');
    expect(markStyle.backgroundColor).toBe(fill);
  });

  it('draws its list as list items, at the size of the sentence', () => {
    render(
      <Message
        kind="warning"
        heading="The list needs a change"
        items={['"apple" appears twice', '"a" is shorter than three letters']}
      >
        Fix these before the game can be built:
      </Message>,
    );

    expect(screen.getByRole('list')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('"apple" appears twice');

    expect(getComputedStyle(screen.getByRole('list')).fontSize).toBe('17px');
  });

  it('draws no list when none is given', () => {
    render(
      <Message kind="error" heading="Could not join the game">
        Check your connection and try again.
      </Message>,
    );

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('announces itself as an alert by default', () => {
    render(
      <Message kind="info" heading="A head line">
        A sentence.
      </Message>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('takes the role a caller gives it, e.g. status for a finished game', () => {
    render(
      <Message kind="success" heading="Every word is in" role="status">
        You finished the crossword together.
      </Message>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lets a heading carry an id, for a caller with its own aria-labelledby', () => {
    render(
      <Message kind="success" heading="Every word is in" headingId="game-completed-heading">
        You finished the crossword together.
      </Message>,
    );

    expect(screen.getByText('Every word is in')).toHaveAttribute('id', 'game-completed-heading');
  });
});
