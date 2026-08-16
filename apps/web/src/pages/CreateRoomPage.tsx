import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { type CrosswordLayout, generateCrossword, validateWordList } from 'shared';

import { RoomCreatedPanel } from '../components/RoomCreatedPanel';
import { UnplacedWordsNotice } from '../components/UnplacedWordsNotice';
import { WordListForm } from '../components/WordListForm';
import { normalizeNickname } from '../rooms/nickname';
import { createRoom } from '../rooms/room-service';
import { logGameEvent } from '../telemetry/analytics';

/**
 * Shown when no two words share a letter. Different from words being dropped:
 * there is no grid at all, so there is no game to create — the owner has to
 * change the list (see `docs/decisions/0008`, last consequence).
 */
const NO_GRID_MESSAGE =
  'None of these words cross each other, so no crossword can be built. Add or change a few words — words that share letters can cross.';

const CREATION_FAILED_MESSAGE =
  'The room could not be created. Check your connection and try again.';

/**
 * Where the owner is in the creation flow.
 *
 * `confirming` carries the layout the owner is being warned about, so
 * confirming creates the room from exactly the grid that was shown — not from
 * a freshly generated, different one (layouts are not deterministic).
 */
type CreationPhase =
  | { readonly phase: 'editing'; readonly errorMessage?: string }
  | { readonly phase: 'confirming'; readonly layout: CrosswordLayout }
  | { readonly phase: 'creating' }
  | { readonly phase: 'created'; readonly roomId: string };

/**
 * Room creation, end to end: word list in, shareable link out.
 *
 * The crossword is generated in the browser before anything is written, so the
 * owner can see which words did not fit and decide, and so a word set that
 * cannot form a grid never becomes an unplayable room.
 *
 * @example
 * <Route path="/create" element={<CreateRoomPage />} />
 */
export const CreateRoomPage = () => {
  const [nickname, setNickname] = useState('');
  const [rawWords, setRawWords] = useState('');
  const [creation, setCreation] = useState<CreationPhase>({ phase: 'editing' });

  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  const create = async (layout: CrosswordLayout) => {
    setCreation({ phase: 'creating' });

    try {
      const roomId = await createRoom({ layout, ownerNickname: normalizeNickname(nickname) });

      // After the write came back, so a room that was never created is never
      // counted as one. The size of the crossword travels with it; the id and
      // the words do not, and could not — see `telemetry/analytics.ts`.
      void logGameEvent('room_created', { word_count: layout.placedWords.length });

      setCreation({ phase: 'created', roomId });
    } catch (error) {
      // Firebase messages ("Missing or insufficient permissions") mean nothing
      // to a player, so the owner gets a plain one and the details go to the
      // console for whoever is debugging.
      console.error('Creating the room failed', error);
      setCreation({ phase: 'editing', errorMessage: CREATION_FAILED_MESSAGE });
    }
  };

  const handleSubmit = () => {
    const layout = generateCrossword(validation.words);

    if (layout.placedWords.length === 0) {
      setCreation({ phase: 'editing', errorMessage: NO_GRID_MESSAGE });
      return;
    }

    if (layout.unplacedWords.length > 0) {
      setCreation({ phase: 'confirming', layout });
      return;
    }

    void create(layout);
  };

  /** Any edit invalidates the previous verdict about the list. */
  const handleWordsChange = (nextRawWords: string) => {
    setRawWords(nextRawWords);
    setCreation({ phase: 'editing' });
  };

  const renderPhase = () => {
    if (creation.phase === 'created') {
      return <RoomCreatedPanel roomId={creation.roomId} origin={window.location.origin} />;
    }

    if (creation.phase === 'confirming') {
      return (
        <UnplacedWordsNotice
          layout={creation.layout}
          onConfirm={() => void create(creation.layout)}
          onBack={() => setCreation({ phase: 'editing' })}
        />
      );
    }

    return (
      <WordListForm
        nickname={nickname}
        onNicknameChange={setNickname}
        rawWords={rawWords}
        onWordsChange={handleWordsChange}
        validation={validation}
        errorMessage={creation.phase === 'editing' ? creation.errorMessage : undefined}
        isCreating={creation.phase === 'creating'}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        New game
      </Typography>

      {renderPhase()}
    </Container>
  );
};
