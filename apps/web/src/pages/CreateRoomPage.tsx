import GlobalStyles from '@mui/material/GlobalStyles';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type CrosswordLayout, generateCrossword, validateWordList } from 'shared';

import { NewRoomColumn } from '../components/NewRoomColumn';
import { ScreenEnter } from '../components/ScreenEnter';
import { UnplacedWordsNotice } from '../components/UnplacedWordsNotice';
import { WordListForm } from '../components/WordListForm';
import { MOTION_PLAY_CSS } from '../motion-play-styles';
import { normalizeNickname } from '../rooms/nickname';
import { readRememberedNickname, rememberNickname } from '../rooms/nickname-store';
import type { RoomMode } from '../rooms/room-document';
import { roomPath } from '../rooms/room-link';
import { createRoom } from '../rooms/room-service';
import { logGameEvent } from '../telemetry/analytics';
import { useScreenReached } from '../telemetry/use-screen-reached';

/**
 * Where the owner is in the creation flow.
 *
 * `confirming` carries the layout the owner is being warned about, so
 * confirming creates the room from exactly the grid that was shown — not from
 * a freshly generated, different one (layouts are not deterministic).
 */
type CreationPhase =
  | {
      readonly phase: 'editing';
      /** The generator found no crossing, so there is no grid and no game to create. */
      readonly noCrossing?: boolean;
      /** The write was refused. */
      readonly writeFailed?: boolean;
    }
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
 * The first thing it asks is what the room is for: a game to play with a friend
 * or a lesson to run for two students (`ModePick`). The title and the help under
 * the nickname follow the choice, and the room is created in that mode.
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
  // What the room is for, chosen first: a pair game unless the owner says they
  // are running a lesson. It cannot change once the room exists, so it is the
  // owner's to settle here (ADR 0037).
  const [mode, setMode] = useState<RoomMode>('pair');
  const [rawWords, setRawWords] = useState('');
  const [creation, setCreation] = useState<CreationPhase>({ phase: 'editing' });

  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  const create = async (layout: CrosswordLayout) => {
    setCreation({ phase: 'creating' });

    const ownerNickname = normalizeNickname(nickname);

    try {
      const roomId = await createRoom({ layout, ownerNickname, mode });

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
      setCreation({ phase: 'editing', writeFailed: true });
    }
  };

  const handleSubmit = () => {
    const layout = generateCrossword(validation.words);

    if (layout.placedWords.length === 0) {
      setCreation({ phase: 'editing', noCrossing: true });
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
        mode={mode}
        nickname={nickname}
        onNicknameChange={setNickname}
        rawWords={rawWords}
        onWordsChange={handleWordsChange}
        validation={validation}
        noCrossing={creation.phase === 'editing' && creation.noCrossing === true}
        writeFailed={creation.phase === 'editing' && creation.writeFailed === true}
        isCreating={creation.phase === 'creating'}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    // The step is named at the top of a column that starts under the header, as
    // the template's `.column` does, so its title stands where it stands in
    // every state of the screen (issue #225).
    <ScreenEnter>
      <GlobalStyles styles={MOTION_PLAY_CSS} />
      <NewRoomColumn
        mode={mode}
        onModeChange={setMode}
        isFrozen={creation.phase === 'creating'}
        showsChoice={creation.phase !== 'confirming'}
      >
        {renderPhase()}
      </NewRoomColumn>
    </ScreenEnter>
  );
};
