import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type CrosswordLayout, generateCrossword, validateWordList } from 'shared';

import { createPanelSx, gateScreenSx } from '../components/gate-panel-styles';
import { stepTitleSx } from '../components/surface-styles';
import { UnplacedWordsNotice } from '../components/UnplacedWordsNotice';
import { WordListForm, type WordListFormNotice } from '../components/WordListForm';
import { normalizeNickname } from '../rooms/nickname';
import { readRememberedNickname, rememberNickname } from '../rooms/nickname-store';
import { roomPath } from '../rooms/room-link';
import { createRoom } from '../rooms/room-service';
import { logGameEvent } from '../telemetry/analytics';
import { useScreenReached } from '../telemetry/use-screen-reached';

/**
 * Shown when no two words share a letter. Different from words being dropped:
 * there is no grid at all, so there is no game to create — the owner has to
 * change the list (see `docs/decisions/0008`, last consequence). A warning
 * rather than an error: this is the list's own problem, the same kind as the
 * list's other validation failures, not a write that was refused.
 */
const NO_GRID_NOTICE: WordListFormNotice = {
  kind: 'warning',
  heading: 'No crossword can be built',
  text: 'None of these words cross each other. Add or change a few words — words that share letters can cross.',
};

const CREATION_FAILED_NOTICE: WordListFormNotice = {
  kind: 'error',
  heading: 'The room could not be created',
  text: 'Check your connection and try again.',
};

/**
 * Where the owner is in the creation flow.
 *
 * `confirming` carries the layout the owner is being warned about, so
 * confirming creates the room from exactly the grid that was shown — not from
 * a freshly generated, different one (layouts are not deterministic).
 */
type CreationPhase =
  | { readonly phase: 'editing'; readonly notice?: WordListFormNotice }
  | { readonly phase: 'confirming'; readonly layout: CrosswordLayout }
  | { readonly phase: 'creating' };

/**
 * Room creation, end to end: word list in, the owner inside their own room.
 *
 * The crossword is generated in the browser before anything is written, so the
 * owner can see which words did not fit and decide, and so a word set that
 * cannot form a grid never becomes an unplayable room.
 *
 * Once the room exists this screen has nothing left to say: the room lives at
 * its own address, and the owner is taken there rather than left holding a link
 * on a page a reload would empty (see
 * `docs/decisions/0021-one-room-address.md`).
 *
 * It is the second screen of the funnel, so it says it was reached (issue #51).
 *
 * @example
 * <Route path="/create" element={<CreateRoomPage />} />
 */
export const CreateRoomPage = () => {
  useScreenReached('create');

  const navigate = useNavigate();
  // The field this fills is `WordListForm`'s, which is controlled: its value
  // has one source of truth and this is it. Read lazily, so the storage is not
  // asked again on every render of a form that re-renders as its owner types.
  const [nickname, setNickname] = useState(readRememberedNickname);
  const [rawWords, setRawWords] = useState('');
  const [creation, setCreation] = useState<CreationPhase>({ phase: 'editing' });

  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  const create = async (layout: CrosswordLayout) => {
    setCreation({ phase: 'creating' });

    const ownerNickname = normalizeNickname(nickname);

    try {
      const roomId = await createRoom({ layout, ownerNickname });

      // After the write, and the very text that went into the room: a name
      // nobody ever played under is not worth offering back, and a host who
      // creates most of the rooms would otherwise be the one player whose name
      // is never remembered (issue #75).
      rememberNickname(ownerNickname);

      // After the write came back, so a room that was never created is never
      // counted as one. The size of the crossword travels with it; the id and
      // the words do not, and could not — see `telemetry/analytics.ts`.
      void logGameEvent('room_created', { word_count: layout.placedWords.length });

      // Replaced, not pushed: Back from a room leads out of the flow rather
      // than to a filled-in word list, which invites creating a second room
      // nobody was sent the link to.
      void navigate(roomPath(roomId), { replace: true });
    } catch (error) {
      // Firebase messages ("Missing or insufficient permissions") mean nothing
      // to a player, so the owner gets a plain one and the details go to the
      // console for whoever is debugging.
      console.error('Creating the room failed', error);
      setCreation({ phase: 'editing', notice: CREATION_FAILED_NOTICE });
    }
  };

  const handleSubmit = () => {
    const layout = generateCrossword(validation.words);

    if (layout.placedWords.length === 0) {
      setCreation({ phase: 'editing', notice: NO_GRID_NOTICE });
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
        notice={creation.phase === 'editing' ? creation.notice : undefined}
        isCreating={creation.phase === 'creating'}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    // The step is named inside a panel down the middle of the window, as tall
    // as its own content, the way the template draws it (issue #197).
    <Box component="main" sx={gateScreenSx}>
      <Box sx={createPanelSx}>
        <Typography component="h1" variant="stepTitle" sx={stepTitleSx()}>
          New game
        </Typography>

        {renderPhase()}
      </Box>
    </Box>
  );
};
