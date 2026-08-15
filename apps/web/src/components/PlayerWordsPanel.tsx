import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { PlayerWordView } from '../rooms/word-visibility';

interface PlayerWordsPanelProps {
  /** This player's half of the room's words — never anybody else's. */
  readonly view: PlayerWordView;
}

/**
 * The words this player explains, and how many are being explained to them.
 *
 * This is the only place a word is ever spelled out on screen, and it holds
 * exactly the words hidden from someone else. The words hidden from the reader
 * are a number and nothing more: the grid stays letterless until a word is
 * guessed (see `docs/decisions/0010-letterless-grid-and-private-word-list.md`),
 * so nothing on this screen hands them a letter of their own words.
 *
 * @param props.view - What {@link wordViewFor} worked out for this player
 *
 * @example
 * <PlayerWordsPanel view={wordViewFor(room, viewerId)} />
 */
export const PlayerWordsPanel = ({ view }: PlayerWordsPanelProps) => {
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
        {`Words hidden from you, for the others to explain: ${view.toGuessCount}. Those are the ones you guess.`}
      </Typography>
    </section>
  );
};
