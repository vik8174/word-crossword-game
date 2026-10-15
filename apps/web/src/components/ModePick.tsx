import Box from '@mui/material/Box';
import { type KeyboardEvent, useRef } from 'react';

import type { RoomMode } from '../rooms/room-document';
import { modeOptionSx, modePickSx, modeTextSx, modeTitleSx } from './mode-pick-styles';
import { BLOCK_PROPS } from './screen-blocks';

/** The two cards, in the order they stand (template lines 280-285). */
const OPTIONS: readonly {
  readonly mode: RoomMode;
  readonly title: string;
  readonly text: string;
}[] = [
  {
    mode: 'pair',
    title: 'Play with a friend',
    text: 'You and one other person. You explain your words, they explain theirs.',
  },
  {
    mode: 'lesson',
    title: 'Run a lesson',
    text: 'Two of your students play. You choose the words, deal them and watch; you do not play.',
  },
];

interface ModePickProps {
  /** The mode that is picked. */
  readonly value: RoomMode;
  /** Called with the mode the reader picked. */
  readonly onChange: (mode: RoomMode) => void;
  /** Frozen while the room is being written: the cards stay readable but take no pick. */
  readonly disabled?: boolean;
}

/**
 * The first choice on `/create`: what the room is for, as two radio cards
 * ("Play with a friend" and "Run a lesson").
 *
 * It comes first because it decides who the seats are for, and it cannot be
 * changed once the room exists (ADR 0037). The cards are one radio group: the
 * chosen card is the one in the tab order, and the arrow keys move the choice
 * from card to card and wrap round, as a radio group does, so a reader on a
 * keyboard needs no more than the template's pointer does.
 *
 * Built to `?state=create` of `design/templates/state-tree.html` (lines
 * 846-854 and 280-289). Pair is picked unless the screen says otherwise.
 *
 * @param props.value - The picked mode
 * @param props.onChange - Told the mode the reader picked
 * @param props.disabled - Whether the cards take a pick
 *
 * @example
 * <ModePick value={mode} onChange={setMode} />
 */
export const ModePick = ({ value, onChange, disabled = false }: ModePickProps) => {
  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  /** Picks the card at `target`, counted round the group, and takes focus to it. */
  const pick = (target: number) => {
    OPTIONS.forEach(({ mode }, index) => {
      if (index === (target + OPTIONS.length) % OPTIONS.length) {
        onChange(mode);
        cards.current[index]?.focus();
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) {
      return;
    }

    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];

    if (step === undefined) {
      return;
    }

    event.preventDefault();
    pick(index + step);
  };

  return (
    <Box {...BLOCK_PROPS} role="radiogroup" aria-label="What kind of game" sx={modePickSx}>
      {OPTIONS.map(({ mode, title, text }, index) => {
        const chosen = mode === value;

        return (
          <Box
            key={mode}
            ref={(card: HTMLButtonElement | null) => {
              cards.current[index] = card;
            }}
            component="button"
            type="button"
            role="radio"
            aria-checked={chosen}
            tabIndex={chosen ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(mode)}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index)}
            sx={modeOptionSx(chosen)}
          >
            <Box component="b" sx={modeTitleSx(chosen)}>
              {title}
            </Box>
            <Box component="span" sx={modeTextSx}>
              {text}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
