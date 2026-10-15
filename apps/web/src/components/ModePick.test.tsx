import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RoomMode } from '../rooms/room-document';
import { modeOptionSx } from './mode-pick-styles';
import { ModePick } from './ModePick';

/** The picker with a state of its own, as `/create` holds it. */
const Holding = ({ initial = 'pair' as RoomMode, disabled = false }) => {
  const [mode, setMode] = useState<RoomMode>(initial);

  return <ModePick value={mode} onChange={setMode} disabled={disabled} />;
};

const pair = () => screen.getByRole('radio', { name: /Play with a friend/ });
const lesson = () => screen.getByRole('radio', { name: /Run a lesson/ });

describe('ModePick', () => {
  it('offers the two modes as one group of radios, in the template’s words', () => {
    render(<Holding />);

    expect(screen.getByRole('radiogroup', { name: 'What kind of game' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((card) => card.textContent)).toEqual([
      'Play with a friendYou and one other person. You explain your words, they explain theirs.',
      'Run a lessonTwo of your students play. You choose the words, deal them and watch; you do not play.',
    ]);
  });

  it('has the pair game chosen to begin with, and only one card chosen at any time', () => {
    render(<Holding />);

    expect(pair()).toBeChecked();
    expect(lesson()).not.toBeChecked();
  });

  it('chooses the lesson when its card is pressed, and gives the pair game up', () => {
    render(<Holding />);

    fireEvent.click(lesson());

    expect(lesson()).toBeChecked();
    expect(pair()).not.toBeChecked();
  });

  it('tells its owner the mode that was picked, and only when a card is pressed', () => {
    const onChange = vi.fn();
    render(<ModePick value="pair" onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(lesson());

    expect(onChange).toHaveBeenCalledWith('lesson');
  });

  describe('with a keyboard', () => {
    it('puts only the chosen card in the tab order, as a radio group does', () => {
      render(<Holding />);

      expect(pair()).toHaveAttribute('tabindex', '0');
      expect(lesson()).toHaveAttribute('tabindex', '-1');
    });

    it.each(['ArrowRight', 'ArrowDown'])(
      'moves the choice on with %s, and focus with it',
      (key) => {
        render(<Holding />);
        pair().focus();

        fireEvent.keyDown(pair(), { key });

        expect(lesson()).toBeChecked();
        expect(lesson()).toHaveFocus();
      },
    );

    it.each(['ArrowLeft', 'ArrowUp'])('moves it back with %s, and round the end', (key) => {
      render(<Holding />);
      pair().focus();

      // Back from the first card goes round to the last.
      fireEvent.keyDown(pair(), { key });
      expect(lesson()).toBeChecked();

      fireEvent.keyDown(lesson(), { key });
      expect(pair()).toBeChecked();
    });

    it('leaves every other key to the page', () => {
      render(<Holding />);
      pair().focus();

      fireEvent.keyDown(pair(), { key: 'a' });

      expect(pair()).toBeChecked();
    });
  });

  describe('while the room is being written', () => {
    it('freezes both cards but keeps them readable, and takes no pick', () => {
      const onChange = vi.fn();
      render(<ModePick value="lesson" onChange={onChange} disabled />);

      expect(lesson()).toBeDisabled();
      expect(pair()).toBeDisabled();
      expect(lesson()).toBeChecked();

      fireEvent.click(pair());
      fireEvent.keyDown(lesson(), { key: 'ArrowLeft' });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe('the movement of a card (template lines 353 and 356)', () => {
  const asSx = (value: unknown) => value as Record<string, Record<string, unknown>>;
  const motion = asSx(modeOptionSx(false))['@media (prefers-reduced-motion: no-preference)'];

  it('lifts 1px on hover, and only for a reader who has not asked for stillness', () => {
    expect(motion?.['&:hover']).toEqual({ transform: 'translateY(-1px)' });
    expect(asSx(modeOptionSx(false))['&:hover']).toBeUndefined();
  });

  it('takes the transitions of a button: 160ms on the arriving curve for the lift and the shadow, 220ms on ease for the colour', () => {
    expect(motion?.transition).toBe(
      'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms ease',
    );
  });

  it('is the same movement for the chosen card as for the other', () => {
    const chosen = asSx(modeOptionSx(true))['@media (prefers-reduced-motion: no-preference)'];

    expect(chosen).toEqual(motion);
  });
});
