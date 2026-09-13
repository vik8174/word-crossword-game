import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type CrosswordLayout, generateCrossword, validateWordList } from 'shared';

import { UnplacedWordsNotice } from '../components/UnplacedWordsNotice';
import { WordListForm, type WordListFormNotice } from '../components/WordListForm';
import { useGardenControls } from '../garden/garden-controls';
import {
  GATE_BAND_WIDTH,
  ON_SCENE_SX,
  fullHeightBandSx,
  stepTitleSx,
} from '../garden/scene-surface';
import { normalizeNickname } from '../rooms/nickname';
import { readRememberedNickname, rememberNickname } from '../rooms/nickname-store';
import { roomPath } from '../rooms/room-link';
import { createRoom } from '../rooms/room-service';
import { gapAt } from '../scale';
import { logGameEvent } from '../telemetry/analytics';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** The step of the row this page keeps between itself and the edge of the window. */
const PAGE_PADDING_STEP = 4;
const PAGE_PADDING = gapAt(PAGE_PADDING_STEP);

/**
 * How wide the column standing on the band is: the gate's band
 * (`garden/scene-surface.ts`'s `GATE_BAND_WIDTH`), less the page's own padding
 * either side of it — the same arithmetic a band in a room is measured by, run
 * the other way (`components/RoomShell.tsx`).
 */
const COLUMN_WIDTH = `calc(${GATE_BAND_WIDTH} - ${PAGE_PADDING} - ${PAGE_PADDING})`;

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
 * It is the second screen of the funnel, so it says it was reached (issue #51),
 * and it is the second screen at the gate — but unlike the landing page, this
 * one is lazy-loaded, so it claims the gate's own picture on its own mount
 * rather than trusting `Garden` to have guessed it (`garden-controls.ts`'s
 * `DEFAULT_SCENE`; issue #152's second finding is what a guess there used to
 * cost).
 *
 * @example
 * <Route path="/create" element={<CreateRoomPage />} />
 */
export const CreateRoomPage = () => {
  useScreenReached('create');

  const { showScene } = useGardenControls();

  useEffect(() => {
    showScene('gate');
  }, [showScene]);

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
    // Still at the gate, so the step is named in the corner of the window with
    // the temple's red run under it. What stands under it is a band down the
    // middle of the window rather than a box held against its left edge, and
    // that is a decision reversed rather than a layout tidied: #118 kept
    // everything off the middle of the picture because that is where the path
    // through the gate goes. Seen on a screen, the interface standing beside
    // the opening read as a form laid over a photograph. It stands in the
    // opening now — this screen is somebody walking in, and the path is where
    // walking in happens (issue #123).
    <Box
      component="main"
      sx={{
        // What the band is measured against, and why it is at least a window
        // tall: it runs from the top of the page to the bottom, and the page is
        // never shorter than the window and grows with what the form has to say
        // (`garden/scene-surface.ts`).
        position: 'relative',
        minHeight: '100dvh',
        // A column, so that the space the form does not use can be given to the
        // form rather than left under it. Items are not stretched: the name of
        // the step is only as wide as its own letters, and the rule under it
        // stops where the last letter does.
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        px: PAGE_PADDING_STEP,
        py: 5,
        ...ON_SCENE_SX,
      }}
    >
      <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />

      <Typography
        component="h1"
        variant="signage"
        // The gap under the title is the title's own, not the form's: the form
        // is centred by margins that go to nothing the moment it is taller than
        // the window, and a gap made of those would go with them.
        sx={(theme) => ({ ...stepTitleSx(theme, `-${PAGE_PADDING}`), marginBottom: gapAt(5) })}
      >
        New game
      </Typography>

      {/* Positioned, because the band is: an absolute box paints over the
        ordinary flow beside it, and what is written on a band has to be on top
        of it. Its own width is the band's less the padding either side, which
        is what puts the two of them concentric at every width.

        Centred in what is left of the band by margins rather than by
        `justify-content`, and that is the whole reason for the flex column
        above. Centring a column that has become taller than the window pushes
        the top of it off the top of the page, where no amount of scrolling
        reaches it — and this form does grow: an error, or the list of words
        that would not fit, is another block of text. An auto margin is zero
        when there is no room to give away, so at that point the form simply
        stands under its title again. */}
      <Box sx={{ position: 'relative', width: '100%', maxWidth: COLUMN_WIDTH, m: 'auto' }}>
        {renderPhase()}
      </Box>
    </Box>
  );
};
