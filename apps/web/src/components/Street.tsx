import type { CSSProperties, ReactElement } from 'react';

import { STREET } from '../street';
import { DRAWING_PALETTE } from './street-drawing-palette';
import {
  AzulejoDoor,
  ClosedShutters,
  Curtains,
  Eave,
  Geraniums,
  Rail,
  Rejas,
  Shutters,
  WallPot,
} from './street-houses';
import { P0, P2 } from './street-geometry';
import { Fiesta, LetterTiles, WordCards } from './street-line';
import { Person, type ArmPose, type Face } from './street-people';

const { ink: INK, ochre: LIT, spruce: SPRUCE, stone: STONE, wash: WASH } = STREET;
const {
  dark: DARK,
  white: WHITE,
  shade: SHADE,
  terra: TERRA,
  azul: AZUL,
  can: CAN,
  skin: SKIN,
  hair: HAIR,
} = DRAWING_PALETTE;

/** The right-hand balcony: a neighbour, curtains drawn, nobody yet, or shutters closed. */
export type StreetRight = 'here' | 'away' | 'empty' | 'shut';
/** The line between the cans. */
export type StreetLine = 'taut' | 'slack' | 'loose' | 'none';
/** How the neighbours behave. */
export type StreetMood = 'talk' | 'wave' | 'wait' | 'cheer' | 'calm';
/** How much of the street is shown. */
export type StreetCrop = 'full' | 'top' | 'band';

/** The viewBox of each crop (template line 436). */
const CROPS: Record<StreetCrop, string> = {
  full: '0 30 640 490',
  top: '0 40 640 312',
  band: '0 130 640 226',
};

/** The face and arm of the left neighbour, the right one and the teacher, by mood. */
const MOODS: Record<StreetMood, { L: [Face, ArmPose]; R: [Face, ArmPose]; T: Face }> = {
  talk: { L: ['talk', 'gesture'], R: ['smile', 'rest'], T: 'smile' },
  wave: { L: ['smile', 'wave'], R: ['smile', 'wave'], T: 'smile' },
  wait: { L: ['smile', 'rest'], R: ['smile', 'rest'], T: 'smile' },
  cheer: { L: ['grin', 'cheer'], R: ['grin', 'cheer'], T: 'grin' },
  calm: { L: ['calm', 'rest'], R: ['calm', 'rest'], T: 'calm' },
};

/** How far the line sags once the game has ended early. */
const SLACK_SAG = 48;

/** What every line but `loose` agrees on: a dashed throw belongs to the loose line alone. */
type LineProps =
  | { readonly line?: Exclude<StreetLine, 'loose'>; readonly thrown?: never }
  | { readonly line: 'loose'; readonly thrown?: boolean };

export type StreetProps = LineProps & {
  /** The right-hand balcony. `here` unless given. */
  readonly right?: StreetRight;
  /** How the neighbours behave. `talk` unless given. */
  readonly mood?: StreetMood;
  /**
   * The house at the end of the street: the teacher is `here` or `away`. Absent
   * in a pair game, where its shutters stay closed.
   */
  readonly teacher?: 'here' | 'away';
  /** Lanterns and confetti, for a crossword filled in. */
  readonly fiesta?: boolean;
  /** The words hanging on the line, in the order given. */
  readonly cards?: readonly string[];
  /** One of `cards`: that card carries the `pegged` class that is hung on the line and swings still. */
  readonly justAnswered?: string;
  /** One word, drawn as tiles pegged to the line. */
  readonly letters?: string;
  /** How much of the street is shown. `full` unless given. */
  readonly crop?: StreetCrop;
  /** The accessible name of the picture, used exactly as given. */
  readonly label: string;
};

const SVG_STYLE: CSSProperties = { display: 'block', width: '100%', height: 'auto' };

/**
 * The street of Across the Street (design v2): two whitewashed houses facing
 * each other, a neighbour on each balcony with a tin-can telephone, the line
 * between the cans with the answered words hanging on it, and the third house
 * at the end of the street.
 *
 * A port of `scene()` in `design/templates/state-tree.html` (lines 600-656),
 * with its geometry unchanged. It fills the width it is given and draws no
 * motion of its own: the template's motion class names (`shutter`, `who`,
 * `line-draw`, `card`, `pegged`, `lantern`, `confetti`) are on the same
 * elements, and the rules in `motion-styles.ts` move them when a screen opens
 * (`ScreenEnter`). The lanterns and the confetti carry the `--k` index that
 * staggers them; the flags of the fiesta card carry theirs (`FiestaCard`).
 *
 * @example
 * <Street right="empty" line="loose" crop="top" mood="wave" label="A neighbour waiting" />
 */
export const Street = ({
  right = 'here',
  line = 'taut',
  thrown = false,
  mood: moodName = 'talk',
  teacher,
  fiesta = false,
  cards,
  justAnswered,
  letters,
  crop = 'full',
  label,
}: StreetProps): ReactElement => {
  const sag = line === 'slack' ? SLACK_SAG : 0;
  const mood = MOODS[moodName];
  const backArch = 'M298 226V192a22 22 0 0 1 44 0v34Z';
  const leftArch = 'M118 290V200a40 40 0 0 1 80 0v90Z';
  const rightArch = 'M442 304V214a40 40 0 0 1 80 0v90Z';
  const rightLit = right === 'here';
  const lineEnd = right === 'here' ? P2 : ([449, 258] as const);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={CROPS[crop]}
      role="img"
      aria-label={label}
      style={SVG_STYLE}
    >
      <circle cx="330" cy="100" r="56" fill={WASH} />
      <g stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* the house at the end of the street: the teacher's, in a lesson */}
        <rect x="262" y="152" width="116" height="372" fill={SHADE} />
        <Eave x={256} y={142} w={128} />
        <path d="M300 516v-40a20 20 0 0 1 40 0v40Z" fill={SPRUCE} />
        <Rejas x={292} y={380} lit={false} />
        <path d={backArch} fill={teacher === 'here' ? LIT : DARK} />
        {teacher === 'here' && (
          <g className="who" stroke="none">
            <Person
              x={320}
              y={196}
              s={0.56}
              facing={1}
              face={mood.T}
              arm="note"
              skin={SKIN[2]}
              hair={HAIR[2]}
              bun
              glasses
              shirt={SPRUCE}
            />
          </g>
        )}
        {teacher === 'away' && <Curtains x1={298} x2={342} top={170} bottom={226} />}
        {teacher === undefined && <ClosedShutters path={backArch} cx={320} y1={170} y2={226} />}
        <Rail x1={292} x2={348} y={212} h={14} />
        <Geraniums x={340} y={212} />
        {/* the left house */}
        <rect x="46" y="78" width="24" height="34" fill={WHITE} />
        <rect x="42" y="72" width="32" height="8" fill={TERRA} />
        <rect x="24" y="112" width="196" height="412" fill={WHITE} />
        <Eave x={14} y={100} w={216} />
        <WallPot x={44} y={150} />
        <WallPot x={76} y={158} />
        <Shutters x1={118} x2={198} y1={168} y2={290} />
        <path d={leftArch} fill={LIT} />
        <g className="who" stroke="none">
          <Person
            x={160}
            y={210}
            facing={1}
            face={mood.L[0]}
            arm={mood.L[1]}
            skin={SKIN[0]}
            hair={HAIR[0]}
            shirt={TERRA}
            can={P0}
          />
        </g>
        <Rail x1={112} x2={204} y={256} />
        <Geraniums x={124} y={256} />
        <Rejas x={44} y={340} lit={false} />
        <Rejas x={134} y={340} lit />
        <AzulejoDoor x={70} y={466} />
        {/* the right house */}
        <rect x="570" y="92" width="24" height="34" fill={WHITE} />
        <rect x="566" y="86" width="32" height="8" fill={TERRA} />
        <rect x="420" y="126" width="196" height="398" fill={WHITE} />
        <Eave x={410} y={114} w={216} />
        <rect x="416" y="150" width="204" height="10" fill={LIT} strokeWidth="1.6" />
        <WallPot x={566} y={184} />
        <WallPot x={596} y={176} />
        {right === 'shut' ? (
          <ClosedShutters path={rightArch} cx={482} y1={174} y2={304} />
        ) : (
          <>
            <Shutters x1={442} x2={522} y1={182} y2={304} />
            <path d={rightArch} fill={rightLit ? LIT : DARK} />
          </>
        )}
        {right === 'here' && (
          <g className="who" stroke="none">
            <Person
              x={482}
              y={226}
              facing={-1}
              face={mood.R[0]}
              arm={mood.R[1]}
              skin={SKIN[1]}
              hair={HAIR[1]}
              bun
              shirt={AZUL}
              can={P2}
            />
          </g>
        )}
        {right === 'away' && <Curtains x1={442} x2={522} top={174} bottom={304} />}
        <Rail x1={436} x2={528} y={270} />
        <Geraniums x={516} y={270} />
        {right === 'away' && <rect x="443" y="254" width="13" height="17" rx="2" fill={CAN} />}
        <Rejas x={450} y={354} lit={false} />
        <Rejas x={536} y={354} lit={right === 'here' || right === 'away'} />
        <AzulejoDoor x={520} y={466} />
        {/* the street */}
        <rect x="0" y="516" width="640" height="10" fill={STONE} />
        {/* the line */}
        {(line === 'taut' || line === 'slack') && (
          <path
            d={`M${P0[0]} ${P0[1]}Q320 ${300 + sag} ${lineEnd[0]} ${lineEnd[1]}`}
            fill="none"
            strokeWidth="1.5"
            pathLength="1"
            className="line-draw"
          />
        )}
        {line === 'loose' && (
          <path
            d={`M${P0[0]} ${P0[1]}Q236 330 ${thrown ? '330 290' : '214 300'}`}
            fill="none"
            strokeWidth="1.5"
            strokeDasharray={thrown ? '3 7' : undefined}
          />
        )}
      </g>
      {fiesta && <Fiesta />}
      {letters && <LetterTiles letters={letters} sag={sag} />}
      {cards && <WordCards words={cards} sag={sag} justAnswered={justAnswered} />}
    </svg>
  );
};
