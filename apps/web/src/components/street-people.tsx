import type { ReactElement } from 'react';

import { STREET } from '../street';
import { DRAWING_PALETTE } from './street-drawing-palette';

const { ink: INK, rose: ROSE, slate: SLATE, tile: TILE } = STREET;
const { can: CAN } = DRAWING_PALETTE;

/** The face a neighbour makes. */
export type Face = 'talk' | 'smile' | 'grin' | 'calm';
/** What a neighbour does with the free arm. */
export type ArmPose = 'gesture' | 'wave' | 'cheer' | 'rest' | 'note';

interface ArmProps {
  readonly sx: number;
  readonly sy: number;
  readonly ex: number;
  readonly ey: number;
  readonly hx: number;
  readonly hy: number;
  readonly shirt: string;
  readonly skin: string;
}

/** An arm drawn as a sleeve with an ink edge, ending in a hand. */
const Arm = ({ sx, sy, ex, ey, hx, hy, shirt, skin }: ArmProps): ReactElement => {
  const d = `M${sx} ${sy}Q${ex} ${ey} ${hx} ${hy}`;
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d={d} fill="none" stroke={shirt} strokeWidth="7" strokeLinecap="round" />
      <circle cx={hx} cy={hy} r="5" fill={skin} stroke={INK} strokeWidth="1.5" />
    </>
  );
};

interface PersonProps {
  /** Where the head is, in street coordinates. */
  readonly x: number;
  readonly y: number;
  /** The size, 1 unless given. */
  readonly s?: number;
  /** Which way the body leans: 1 faces right, -1 faces left. */
  readonly facing: 1 | -1;
  readonly face: Face;
  readonly arm: ArmPose;
  readonly skin: string;
  readonly hair: string;
  readonly shirt: string;
  readonly bun?: boolean;
  readonly glasses?: boolean;
  /** Where the can is held, in street coordinates. */
  readonly can?: readonly [number, number];
}

/** The free arm, by pose. */
const FreeArm = ({ pose, f, sx, sy, shirt, skin }: ArmPoseProps): ReactElement => {
  if (pose === 'gesture') {
    return (
      <>
        <Arm sx={sx} sy={sy} ex={-f * 34} ey={30} hx={-f * 31} hy={4} shirt={shirt} skin={skin} />
        <path
          d={`M${-f * 31} -1v-6M${-f * 35} 0l-3-5M${-f * 27} 0l3-5`}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    );
  }
  if (pose === 'wave') {
    return (
      <Arm sx={sx} sy={sy} ex={-f * 36} ey={18} hx={-f * 30} hy={-14} shirt={shirt} skin={skin} />
    );
  }
  if (pose === 'cheer') {
    return (
      <Arm sx={sx} sy={sy} ex={-f * 34} ey={6} hx={-f * 24} hy={-30} shirt={shirt} skin={skin} />
    );
  }
  if (pose === 'rest') {
    return (
      <Arm sx={sx} sy={sy} ex={-f * 26} ey={46} hx={-f * 8} hy={50} shirt={shirt} skin={skin} />
    );
  }
  return (
    <>
      <rect
        x="-15"
        y="22"
        width="30"
        height="20"
        rx="2"
        fill={TILE}
        stroke={INK}
        strokeWidth="1.5"
      />
      <path d="M-10 28h20M-10 33h20M-10 38h12" stroke={SLATE} strokeWidth="1.2" />
      <circle cx="-15" cy="34" r="4.5" fill={skin} stroke={INK} strokeWidth="1.4" />
      <circle cx="15" cy="34" r="4.5" fill={skin} stroke={INK} strokeWidth="1.4" />
    </>
  );
};

interface ArmPoseProps {
  readonly pose: ArmPose;
  readonly f: number;
  readonly sx: number;
  readonly sy: number;
  readonly shirt: string;
  readonly skin: string;
}

/** The mouth, by face. */
const Mouth = ({ face, mx }: { readonly face: Face; readonly mx: number }): ReactElement => {
  if (face === 'talk') {
    return <ellipse cx={mx} cy="9.5" rx="3.2" ry="2.8" fill={INK} />;
  }
  if (face === 'grin') {
    return <path d={`M${mx - 5.5} 7.5h11q-5.5 7.5-11 0Z`} fill={INK} />;
  }
  if (face === 'calm') {
    return <path d={`M${mx - 3} 10h6`} stroke={INK} strokeWidth="1.6" strokeLinecap="round" />;
  }
  return (
    <path
      d={`M${mx - 4} 8.5q4 4 8 0`}
      fill="none"
      stroke={INK}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  );
};

/**
 * A neighbour at a window, drawn as the template's `person()` (lines 451-492):
 * body, free arm, the arm that holds the can, and the head.
 */
export const Person = ({
  x,
  y,
  s = 1,
  facing: f,
  face,
  arm,
  skin,
  hair,
  shirt,
  bun,
  glasses,
  can,
}: PersonProps): ReactElement => {
  const size = s * 1.12;
  const sx = -f * 15;
  const sy = 31;
  const ex = f * 2;
  const ey = 1;
  const mx = f * 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path d="M-25 62C-26 8 26 8 25 62Z" fill={shirt} stroke={INK} strokeWidth="1.6" />
      <rect x="-5" y="11" width="10" height="10" fill={skin} stroke={INK} strokeWidth="1.4" />
      <FreeArm pose={arm} f={f} sx={sx} sy={sy} shirt={shirt} skin={skin} />
      {can && (
        <HeldCan
          can={can}
          x={x}
          y={y}
          size={size}
          f={f}
          sx={sx}
          sy={sy}
          shirt={shirt}
          skin={skin}
        />
      )}
      <circle cx="0" cy="-2" r="16" fill={hair} stroke={INK} strokeWidth="1.6" />
      {bun && <circle cx={-f * 11} cy="-14" r="7" fill={hair} stroke={INK} strokeWidth="1.6" />}
      <circle cx="0" cy="2" r="14" fill={skin} stroke={INK} strokeWidth="1.6" />
      <path d="M-14 -2Q0 -14 14 -4" fill={hair} stroke="none" />
      <circle cx={ex - 5} cy={ey} r="1.9" fill={INK} />
      <circle cx={ex + 5} cy={ey} r="1.9" fill={INK} />
      {glasses && (
        <g fill="none" stroke={INK} strokeWidth="1.3">
          <circle cx={ex - 5} cy={ey} r="4.2" />
          <circle cx={ex + 5} cy={ey} r="4.2" />
          <path d={`M${ex - 0.8} ${ey}h1.6`} />
        </g>
      )}
      <circle cx={ex - 8} cy="7" r="3" fill={ROSE} opacity=".8" />
      <circle cx={ex + 8} cy="7" r="3" fill={ROSE} opacity=".8" />
      <Mouth face={face} mx={mx} />
    </g>
  );
};

interface HeldCanProps {
  readonly can: readonly [number, number];
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly f: number;
  readonly sx: number;
  readonly sy: number;
  readonly shirt: string;
  readonly skin: string;
}

/** The tin can in the hand, and the arm that holds it. */
const HeldCan = ({ can, x, y, size, f, sx, sy, shirt, skin }: HeldCanProps): ReactElement => {
  const hx = (can[0] - x) / size;
  const hy = (can[1] - y) / size;
  return (
    <>
      <rect
        x={hx - 6.5}
        y={hy - 8.5}
        width="13"
        height="17"
        rx="2"
        fill={CAN}
        stroke={INK}
        strokeWidth="1.6"
      />
      <Arm
        sx={-sx}
        sy={sy}
        ex={(-sx + hx) / 2 + f * 4}
        ey={Math.max(sy, hy) + 12}
        hx={hx - f * 5}
        hy={hy + 3}
        shirt={shirt}
        skin={skin}
      />
    </>
  );
};
