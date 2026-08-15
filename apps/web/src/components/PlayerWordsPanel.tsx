import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { DealtWordView } from '../rooms/word-visibility';

interface PlayerWordsPanelProps {
  /** This player's half of the room's words — never anybody else's. */
  readonly view: DealtWordView;
}

/**
 * The words this player explains, and how far they have got with their own.
 *
 * This is the only place a word is ever spelled out on screen, and it holds
 * exactly the words hidden from someone else. Of the words hidden from the
 * reader there is a count and nothing more — their squares are in the grid, to
 * be typed into, but no letter of them reaches this screen until the group has
 * earned it (`docs/decisions/0010-letterless-grid-and-private-word-list.md`).
 *
 * It takes the one word view that holds words, so a player the deal never
 * covered cannot be rendered here by mistake — there is no such prop to pass.
 *
 * @param props.view - The `dealt` view {@link wordViewFor} worked out for this player
 *
 * @example
 * <PlayerWordsPanel view={wordViewFor(room, viewerId)} />
 */
export const PlayerWordsPanel = ({ view }: PlayerWordsPanelProps) => {
  const solved = view.toGuess.filter((word) => word.isSolved).length;

  return (
    <section aria-labelledby="your-words-heading">
      <Typography id="your-words-heading" variant="h6" component="h2">
        Your words
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Explain these to the others out loud — say anything except the word itself.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {view.toExplain.map((entry) => (
          <Chip key={entry.id} label={entry.word} />
        ))}
      </Stack>

      <Typography variant="body2" role="status">
        {`Words hidden from you, for the others to explain: ${view.toGuess.length}, of which ${solved} answered. Type them into the highlighted squares of the grid.`}
      </Typography>
    </section>
  );
};
