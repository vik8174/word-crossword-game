import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { finishedGameSummary } from '../rooms/game-summary';

interface GameCompletedPanelProps {
  /** Every word of the crossword, now that none of them is a secret. */
  readonly words: readonly string[];
  /** How many people played it, so the result is said to be theirs together. */
  readonly playerCount: number;
}

/**
 * The end of a game: the crossword is full and this is what the room did.
 *
 * The game is cooperative, so what is reported is the room's result and not
 * anybody's score, and the sentence that reports it is written down once
 * ({@link finishedGameSummary}) because the cloth laid over the table at the
 * moment the game ends says the same thing.
 *
 * @param props.words - The crossword's words, from `finishedWordsOf`
 * @param props.playerCount - Number of players in the room
 *
 * @example
 * <GameCompletedPanel words={finishedWordsOf(room)} playerCount={4} />
 */
export const GameCompletedPanel = ({ words, playerCount }: GameCompletedPanelProps) => {
  return (
    <section aria-labelledby="game-completed-heading">
      <Alert severity="success" role="status">
        <AlertTitle id="game-completed-heading">Every word is in</AlertTitle>
        {finishedGameSummary(words.length, playerCount)}
      </Alert>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, mb: 2 }}>
        The words you were playing for:
      </Typography>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
        {words.map((word, index) => (
          // The grid can hold the same word twice only if the owner listed it
          // twice, which the word-list validator refuses — but the index keeps
          // the key honest without relying on that from another module.
          <Chip key={`${word}-${index}`} label={word} color="success" variant="outlined" />
        ))}
      </Stack>
    </section>
  );
};
