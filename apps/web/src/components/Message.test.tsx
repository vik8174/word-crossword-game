import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Message } from './Message';

/**
 * Every severity, and the colour of each part by its role: the rule down the
 * left and the mark are the kind's own (brick, ochre, slate, spruce), the head
 * line is ink except an error's, which is brick.
 */
const KINDS = [
  {
    kind: 'error',
    rule: 'rgb(163, 58, 44)',
    mark: 'rgb(163, 58, 44)',
    head: 'rgb(163, 58, 44)',
  },
  {
    kind: 'warning',
    rule: 'rgb(242, 199, 102)',
    mark: 'rgb(242, 199, 102)',
    head: 'rgb(27, 45, 56)',
  },
  { kind: 'info', rule: 'rgb(76, 97, 112)', mark: 'rgb(76, 97, 112)', head: 'rgb(27, 45, 56)' },
  {
    kind: 'success',
    rule: 'rgb(45, 102, 88)',
    mark: 'rgb(45, 102, 88)',
    head: 'rgb(27, 45, 56)',
  },
] as const;

describe('Message', () => {
  it.each(KINDS)('draws $kind in the colours of its roles', ({ kind, rule, mark, head }) => {
    render(
      <Message kind={kind} heading="A head line">
        A sentence.
      </Message>,
    );

    const surface = screen.getByRole('alert');
    const style = getComputedStyle(surface);

    // surface: a tile with a 1.5px line outline, radius 2px, padding 12px 15px
    // 13px, gap 12px, and no shadow under it
    expect(style.backgroundColor).toBe('rgb(250, 251, 250)');
    expect(style.outline.toLowerCase()).toBe('1.5px solid #c3d0cd');
    expect(style.borderRadius).toBe('2px');
    expect(style.padding).toBe('12px 15px 13px');
    expect(style.gap).toBe('12px');
    expect(['', 'none']).toContain(style.boxShadow);
    expect(['', 'none']).toContain(style.backdropFilter);

    // left rule, 3px
    expect(style.borderLeftWidth).toBe('3px');
    expect(style.borderLeftStyle).toBe('solid');
    expect(style.borderLeftColor).toBe(rule);

    const head1 = screen.getByText('A head line');
    const headStyle = getComputedStyle(head1);

    expect(headStyle.fontSize).toBe('9.5px');
    expect(headStyle.fontWeight).toBe('700');
    // Resolved to pixels by the engine — 0.2em of a 9.5px head — rather than
    // read back as the `em` it was written in.
    expect(headStyle.letterSpacing).toBe('1.9px');
    expect(headStyle.textTransform).toBe('uppercase');
    expect(headStyle.color).toBe(head);
    expect(headStyle.marginBottom).toBe('3px');

    const body = screen.getByText('A sentence.');
    const bodyStyle = getComputedStyle(body);

    expect(bodyStyle.fontSize).toBe('12.5px');
    expect(bodyStyle.lineHeight).toBe('1.55');
    expect(bodyStyle.color).toBe('rgb(27, 45, 56)');

    const mark1 = surface.querySelector('[aria-hidden="true"]') as HTMLElement;
    const markStyle = getComputedStyle(mark1);

    expect(markStyle.width).toBe('8px');
    expect(markStyle.height).toBe('8px');
    expect(markStyle.marginTop).toBe('6px');
    expect(markStyle.borderRadius).toBe('50%');
    expect(markStyle.backgroundColor).toBe(mark);
  });

  it('draws its list as list items, in secondary text and smaller than the body', () => {
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

    const style = getComputedStyle(items[0] as HTMLElement);

    expect(style.fontSize).toBe('12px');
    expect(style.color).toBe('rgb(76, 97, 112)');
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
