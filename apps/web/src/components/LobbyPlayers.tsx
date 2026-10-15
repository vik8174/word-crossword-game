import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import { type RoomPlayerEntry, PLAYERS_PER_GAME } from '../rooms/room-access';
import { inRem } from '../scale';
import { STREET } from '../street';
import { lobbyHeadingSx, playerRowSx } from './lobby-styles';
import { OUTLINE_WIDTH } from './surface-styles';

/** Which of the three marks a row carries (`.mk`, template lines 169-171). */
type Mark = 'present' | 'away' | 'empty';

/**
 * The mark in front of a name: a circle 11px across. Present is filled ochre
 * with an ink ring, away is a hollow ink ring, and an open seat is a hollow
 * slate ring at 70%. The mark is drawn by shape and never by colour alone: the
 * words beside it say the same.
 */
const MARK_SX: Record<Mark, CSSObject> = {
  present: { backgroundColor: STREET.ochre, boxShadow: `0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}` },
  away: {
    backgroundColor: 'transparent',
    boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}`,
  },
  empty: {
    backgroundColor: 'transparent',
    boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.slate}`,
    opacity: 0.7,
  },
};

const MarkDot = ({ mark }: { readonly mark: Mark }) => (
  <Box
    component="span"
    aria-hidden
    sx={{
      flex: 'none',
      alignSelf: 'center',
      width: inRem(11),
      height: inRem(11),
      borderRadius: '50%',
      ...MARK_SX[mark],
    }}
  />
);

interface LobbyPlayersProps {
  /** Players of the room, in the order they joined. A lesson's teacher is not one. */
  readonly players: readonly RoomPlayerEntry[];
  /** UID of the player who created the room. */
  readonly ownerId: string;
  /** UID of the player looking at the screen. */
  readonly viewerId: string;
  /** How long each away person has been away, by UID, from `useRoomPresence`. */
  readonly awayDurations: Readonly<Record<string, string>>;
  /**
   * The teacher, when the room is a lesson: their row comes first, tagged
   * "teacher", and the list is worded for a lesson. Left out for a pair game,
   * whose owner is the first of its `players`.
   */
  readonly teacher?: RoomPlayerEntry;
}

/** The seats a room has, named in the order they fill (template `openRow`, line 669). */
const SEAT_ORDINALS = ['first', 'second'] as const;

/**
 * The line under "In the room": what the room is, said to the one reading.
 *
 * A lesson says it to the teacher as what they do and do not do, and to a
 * student as what the teacher does (template `players`, lines 678-683).
 */
const hintFor = (teacher: RoomPlayerEntry | undefined, viewerId: string): string => {
  if (teacher === undefined) {
    return `A game is played by exactly ${PLAYERS_PER_GAME} people.`;
  }

  return teacher.id === viewerId
    ? `A lesson is played by ${PLAYERS_PER_GAME} players. You deal the words and watch; you do not play.`
    : `A lesson is played by ${PLAYERS_PER_GAME} players. ${teacher.nickname}, the teacher, deals the words and watches.`;
};

interface PersonRowProps {
  readonly name: string;
  /** The tags after the name, in slate ("host, you"); none when empty. */
  readonly tags: string;
  /** How long they have been away, or `undefined` while they are here. */
  readonly away: string | undefined;
}

/** One person of the room: a mark, a name with its tags, and how long they have been away. */
const PersonRow = ({ name, tags, away }: PersonRowProps) => (
  <Box component="li" sx={playerRowSx}>
    <MarkDot mark={away === undefined ? 'present' : 'away'} />
    <Box component="span" sx={{ fontSize: inRem(21), fontWeight: 700 }}>
      {name}
    </Box>
    {tags !== '' && (
      <Box component="span" sx={{ fontSize: inRem(15), color: STREET.slate }}>
        {tags}
      </Box>
    )}
    {away !== undefined && (
      <Box
        component="span"
        sx={{
          marginInlineStart: 'auto',
          fontSize: inRem(15),
          fontStyle: 'italic',
          color: STREET.slate,
        }}
      >
        {`away for ${away}`}
      </Box>
    )}
  </Box>
);

/**
 * Who is in the room, drawn as the template's `players` block (lines 674-688):
 * a name at 21px bold with its tags ("host", "you") in slate, a mark in front,
 * "away for 2 min" at the far end of an away player's row, and a row for each
 * seat that is still free.
 *
 * In a lesson the teacher's row stands first, tagged "teacher" ("teacher, you"
 * for the teacher themselves), with the same mark and the same away line as a
 * player's, and the seats under it are the students' and are named in order:
 * with nobody in yet, "Waiting for the first player" and "the second player".
 *
 * The game room and both endings draw the same block (the template's `playing`,
 * `finished` and `closed-early` all call the same `players`, issues #228 and
 * #229).
 *
 * @param props.players - Players in join order
 * @param props.ownerId - The player who is the host
 * @param props.viewerId - The reader, tagged "you"
 * @param props.awayDurations - How long each away person has been quiet
 * @param props.teacher - The teacher, in a lesson
 *
 * @example
 * <LobbyPlayers players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={uid} awayDurations={{}} />
 */
export const LobbyPlayers = ({
  players,
  ownerId,
  viewerId,
  awayDurations,
  teacher,
}: LobbyPlayersProps) => (
  <section aria-labelledby="players-heading">
    <Box component="h2" id="players-heading" sx={lobbyHeadingSx}>
      In the room
    </Box>
    <Box component="p" sx={{ margin: 0, fontSize: inRem(16), color: STREET.slate }}>
      {hintFor(teacher, viewerId)}
    </Box>

    <Box component="ul" sx={{ listStyle: 'none', margin: `${inRem(8)} 0 0`, padding: 0 }}>
      {teacher !== undefined && (
        <PersonRow
          key={teacher.id}
          name={teacher.nickname}
          tags={['teacher', teacher.id === viewerId && 'you'].filter(Boolean).join(', ')}
          away={awayDurations[teacher.id]}
        />
      )}

      {players.map((player) => (
        <PersonRow
          key={player.id}
          name={player.nickname}
          tags={[player.id === ownerId && 'host', player.id === viewerId && 'you']
            .filter(Boolean)
            .join(', ')}
          away={awayDurations[player.id]}
        />
      ))}

      {SEAT_ORDINALS.slice(players.length).map((ordinal) => (
        <Box component="li" key={ordinal} sx={playerRowSx}>
          <MarkDot mark="empty" />
          <Box
            component="span"
            sx={{ fontSize: inRem(17), fontStyle: 'italic', color: STREET.slate }}
          >
            {`A free seat. Waiting for the ${ordinal} player`}
          </Box>
        </Box>
      ))}
    </Box>
  </section>
);
