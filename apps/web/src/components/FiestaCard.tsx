import Box from '@mui/material/Box';
import { type CSSProperties, useId } from 'react';

import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { DRAWING_PALETTE } from './street-drawing-palette';
import { OUTLINE_WIDTH } from './surface-styles';

const { azul: AZUL, gera: GERA, leaf: LEAF, orange: ORANGE } = DRAWING_PALETTE;

/**
 * The ten flags along the card's top edge, in the order the drawing strings them
 * (`fiestaCard`, `state-tree.html` line 1036): the six colours of the lanterns,
 * and the first four again.
 */
const FLAG_COLOURS = [
  GERA,
  STREET.ochre,
  AZUL,
  STREET.tile,
  LEAF,
  ORANGE,
  STREET.ochre,
  AZUL,
  STREET.tile,
  LEAF,
] as const;

/** A property that sets `--k`, the index that staggers each flag (`motion-play-styles.ts`). */
const indexed = (k: number): CSSProperties => ({ '--k': k }) as CSSProperties;

/**
 * The card's polka dots (`.fiesta`, line 99): radial dots of 3.5px at 16 %
 * white on a 20px grid, the first one 10px in. They are a background image, so
 * the text's contrast is that of `background-color` and the dots are not in it.
 */
const POLKA_DOTS = {
  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 3.5px, transparent 4px)',
  backgroundSize: '20px 20px',
  backgroundPosition: '10px 10px',
};

interface FiestaCardProps {
  /** What the card shouts, in the interface's language. */
  readonly headline: string;
  /** The sentence under it. */
  readonly children: string;
  /** Every word of the crossword, as a tile, in the order the board numbers them. */
  readonly words: readonly string[];
}

/**
 * The card a finished crossword is celebrated with: fiesta red, white polka
 * dots, a row of paper flags along the top, a headline, one sentence and the
 * crossword's words as tiles (`.fiesta` and `fiestaCard`, `state-tree.html`
 * lines 98-105 and 1035-1041).
 *
 * It is drawn at rest. The flags carry `--k` and the `flag` class, the hooks
 * `motion-play-styles.ts` moves: the card springs up and the flags drop and sway
 * only when the game finishes under the player's eyes (`ScreenEnter`), and
 * nothing here moves by itself. White on fiesta red is 5.95:1, which is
 * computed from the card's `background-color` with the dots left out.
 *
 * @param props.headline - The shout
 * @param props.children - The sentence
 * @param props.words - The words, as tiles
 *
 * @example
 * <FiestaCard headline="You did it!" words={['apple', 'bread']}>
 *   You finished the crossword together: all 2 of its words, between the 2 of you.
 * </FiestaCard>
 */
export const FiestaCard = ({ headline, children, words }: FiestaCardProps) => {
  const headingId = useId();

  return (
    <Box
      component="section"
      role="status"
      aria-labelledby={headingId}
      className="fiesta"
      sx={{
        position: 'relative',
        // A zone is a column of fixed height, and a card with `overflow: hidden` is
        // the one block in it that would shrink to fit, clipping its own tiles.
        flexShrink: 0,
        overflow: 'hidden',
        backgroundColor: STREET.fiesta,
        color: STREET.onAccent,
        borderRadius: inRem(14),
        padding: `${inRem(44)} ${inRem(22)} ${inRem(22)}`,
        boxShadow: `0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}, 4px 4px 0 0 ${STREET.ink}`,
        ...POLKA_DOTS,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: inRem(30),
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {FLAG_COLOURS.map((colour, index) => (
          <Box
            // The same colour twice in a row of ten, so the position is the identity.
            key={index}
            component="span"
            className="flag"
            style={indexed(index)}
            sx={{
              width: inRem(22),
              height: inRem(26),
              backgroundColor: colour,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              transformOrigin: '50% 0',
            }}
          />
        ))}
      </Box>

      <Box
        component="h2"
        id={headingId}
        sx={{
          margin: 0,
          fontFamily: TEXT_FONT_FAMILY,
          fontSize: inRem(56),
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        {headline}
      </Box>

      <Box component="p" sx={{ margin: `${inRem(8)} 0 0`, fontSize: inRem(18), color: 'inherit' }}>
        {children}
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          padding: 0,
          margin: `${inRem(14)} 0 0`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: inRem(8),
        }}
      >
        {words.map((word, index) => (
          <Box
            // A word listed twice is refused by the list's validator; the position
            // keeps the key honest without relying on that from another module.
            key={`${word}-${index}`}
            component="li"
            sx={{
              fontStyle: 'italic',
              fontSize: inRem(17),
              padding: `${inRem(2)} ${inRem(10)}`,
              borderRadius: inRem(6),
              backgroundColor: STREET.tile,
              color: STREET.ink,
              boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}`,
            }}
          >
            {word}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
