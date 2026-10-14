import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { SCENE, SCENE_INK_DIM, SCENE_LINE } from '../garden/scene-palette';
import { inRem } from '../scale';
import { PLAYERS_PER_GAME, type RoomPlayerEntry } from '../rooms/room-access';
import { zoneHeadingSx, zoneHintSx } from './zone-styles';

/** The three things a row can say about a player, each with the look the template gives it. */
type BadgeKind = 'host' | 'you' | 'away';

/**
 * How a badge is drawn (`.badge`, `design/templates/state-tree.html` lines
 * 377-384): 8.5px capitals held apart, in a pill. `you` is the temple's red, and
 * `away` is the warning's own gold, the mark the app drew with a MUI `Chip` in
 * `warning` until issue #199.
 */
const BADGE_SX: Record<BadgeKind, CSSObject> = {
  host: {},
  you: {
    backgroundColor: 'rgba(218, 70, 32, 0.24)',
    borderColor: 'rgba(242, 118, 47, 0.6)',
    color: '#FFD3BE',
  },
  away: { borderColor: 'rgba(201, 162, 39, 0.7)', color: '#E0BC46' },
};

/** One small thing said beside a name. */
const Badge = ({ kind, children }: { readonly kind: BadgeKind; readonly children: ReactNode }) => (
  <Box
    component="span"
    sx={{
      padding: '2px 7px',
      border: `1px solid ${SCENE_LINE}`,
      borderRadius: '999px',
      fontSize: inRem(8.5),
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: SCENE_INK_DIM,
      ...BADGE_SX[kind],
    }}
  >
    {children}
  </Box>
);

interface PlayerListProps {
  /** Players of the room, in the order they joined. */
  readonly players: readonly RoomPlayerEntry[];
  /** UID of the player who created the room. */
  readonly ownerId: string;
  /** UID of the player looking at the screen. */
  readonly viewerId: string;
  /**
   * How long each away player has been away, by player id, from
   * `useRoomPresence`. A player who is present has no entry.
   *
   * Left out entirely by a screen that tracks nothing — a finished room, where
   * nobody is marking themselves present any more and every name would go quiet
   * within the minute, saying only that the game is over.
   */
  readonly awayDurations?: Readonly<Record<string, string>>;
}

/**
 * Who is in the room, updating as players arrive.
 *
 * Everyone sees the same list — players talk to each other out loud while they
 * play, so knowing who is already in is what tells them whether to wait.
 *
 * Only a deviation is labelled. `you`, `host` and a player who has gone quiet
 * are all things one row can say and another cannot; a label every row carried
 * would be read as decoration and tell nobody anything, which is what
 * `Players (2 of 4)` was fixed for (issue #29).
 *
 * @param props.players - Players in join order
 * @param props.viewerId - Marks which entry is the reader themselves
 * @param props.awayDurations - How long each away player has been quiet, if the
 * screen is one where presence is being marked at all
 *
 * @example
 * <PlayerList players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={playerId} />
 */
export const PlayerList = ({ players, ownerId, viewerId, awayDurations = {} }: PlayerListProps) => {
  return (
    <section aria-labelledby="players-heading">
      <Box component="h2" id="players-heading" sx={zoneHeadingSx}>
        In the room
      </Box>
      {/* The size, said as a requirement. It can be wrong in either direction:
          `N of 4` read as progress towards a fourth player a game never needed
          (issue #29), and "up to 2" would read as a ceiling, offering a second
          player this game cannot do without. Neither is what the number is:
          a game is played by two, and that is settled rather than pending
          (docs/decisions/0024-two-players-are-the-product-not-the-algorithm.md),
          which is what lets the sentence say "exactly". */}
      <Box component="p" sx={{ ...zoneHintSx, marginBottom: inRem(9) }}>
        {`A game is played by exactly ${PLAYERS_PER_GAME} people.`}
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: inRem(7),
        }}
      >
        {players.map((player) => (
          <Box
            component="li"
            key={player.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: inRem(7),
              fontSize: inRem(12.5),
              lineHeight: 1.6,
              color: SCENE.cream,
            }}
          >
            <span>{player.nickname}</span>
            {player.id === ownerId && <Badge kind="host">host</Badge>}
            {player.id === viewerId && <Badge kind="you">you</Badge>}
            {awayDurations[player.id] !== undefined && (
              <Badge kind="away">{`away for ${awayDurations[player.id]}`}</Badge>
            )}
          </Box>
        ))}
      </Box>
    </section>
  );
};
