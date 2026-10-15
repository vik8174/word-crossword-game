import type { ReactElement } from 'react';

import { STREET } from '../street';
import { DRAWING_PALETTE } from './street-drawing-palette';

const { ink: INK, ochre: LIT, rose: ROSE, spruce: SPRUCE, tile: TILE } = STREET;
const {
  dark: DARK,
  white: WHITE,
  terra: TERRA,
  azul: AZUL,
  gera: GERA,
  pot: POT,
  leaf: LEAF,
} = DRAWING_PALETTE;

/** The terracotta eave over a house, with its scalloped edge (template line 494). */
export const Eave = ({
  x,
  y,
  w,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
}) => {
  let d = `M${x} ${y}h${w}v8`;
  for (let i = 0; i < w; i += 12) {
    d += 'a6 6 0 0 1 -12 0';
  }
  return <path d={`${d}Z`} fill={TERRA} />;
};

interface RailProps {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly h?: number;
}

/** A wrought-iron balcony rail (line 499). Its ink comes from the group it is drawn in. */
export const Rail = ({ x1, x2, y, h = 34 }: RailProps) => {
  let d = `M${x1} ${y}H${x2}M${x1} ${y + h - 4}H${x2}`;
  for (let x = x1; x <= x2; x += 8) {
    d += `M${x} ${y}V${y + h}`;
  }
  const rings = [];
  for (let c = x1 + 8; h > 20 && c < x2; c += 16) {
    rings.push(<circle key={c} cx={c} cy={y + 9} r="3" fill="none" strokeWidth="1.3" />);
  }
  return (
    <>
      <rect x={x1 - 6} y={y + h} width={x2 - x1 + 12} height="7" rx="1.5" fill={INK} />
      <path d={d} fill="none" strokeWidth="1.6" />
      <path d={`M${x1} ${y}H${x2}`} strokeWidth="3.5" />
      {rings}
    </>
  );
};

/** A pot of geraniums on a balcony (line 508). */
export const Geraniums = ({ x, y }: { readonly x: number; readonly y: number }) => (
  <>
    <path d={`M${x - 9} ${y}h18l-3 14h-12Z`} fill={POT} />
    <path
      d={`M${x - 8} ${y}c2-8 6-10 8-12M${x + 6} ${y}c-1-7-3-9-6-12`}
      fill="none"
      stroke={LEAF}
      strokeWidth="2"
    />
    <circle cx={x - 6} cy={y - 8} r="4.5" fill={GERA} />
    <circle cx={x + 2} cy={y - 13} r="5" fill={GERA} />
    <circle cx={x + 7} cy={y - 5} r="4" fill={GERA} />
  </>
);

/** A pot hung on the wall (line 513). */
export const WallPot = ({ x, y }: { readonly x: number; readonly y: number }) => (
  <>
    <path d={`M${x} ${y - 8}v6`} strokeWidth="1.3" />
    <path d={`M${x - 6} ${y}h12l-2 10h-8Z`} fill={AZUL} />
    <circle cx={x - 3} cy={y - 3} r="3" fill={GERA} strokeWidth="1.2" />
    <circle cx={x + 3} cy={y - 4} r="3" fill={GERA} strokeWidth="1.2" />
  </>
);

/** A door framed in azulejo tiles (line 517). */
export const AzulejoDoor = ({ x, y }: { readonly x: number; readonly y: number }) => {
  const tiles = [];
  for (let ty = y - 4; ty < 512; ty += 12) {
    tiles.push(
      <rect
        key={`l${ty}`}
        x={x - 5}
        y={ty}
        width="4"
        height="4"
        fill={WHITE}
        stroke="none"
        transform={`rotate(45 ${x - 3} ${ty + 2})`}
      />,
      <rect
        key={`r${ty}`}
        x={x + 53}
        y={ty}
        width="4"
        height="4"
        fill={WHITE}
        stroke="none"
        transform={`rotate(45 ${x + 55} ${ty + 2})`}
      />,
    );
  }
  return (
    <>
      <rect x={x - 8} y={y - 10} width="68" height={526 - y} fill={AZUL} />
      {tiles}
      <path d={`M${x} 516v-50a26 26 0 0 1 52 0v50Z`} fill={SPRUCE} />
      <path d={`M${x + 26} 446v70`} strokeWidth="1.4" />
    </>
  );
};

/** A barred window, lit or dark (line 525). */
export const Rejas = ({
  x,
  y,
  lit,
}: {
  readonly x: number;
  readonly y: number;
  readonly lit: boolean;
}) => {
  let d = '';
  for (let i = 8; i < 56; i += 8) {
    d += `M${x + i} ${y}v78`;
  }
  return (
    <>
      <rect x={x} y={y} width="56" height="78" rx="3" fill={lit ? LIT : DARK} />
      <path d={`${d}M${x} ${y + 26}h56M${x} ${y + 52}h56`} strokeWidth="1.5" />
      <rect x={x - 4} y={y + 78} width="64" height="5" rx="1" fill={INK} />
    </>
  );
};

interface ShuttersProps {
  readonly x1: number;
  readonly x2: number;
  readonly y1: number;
  readonly y2: number;
}

/** The two open shutters beside a window, `sl` and `sr` for #230 (line 531). */
export const Shutters = ({ x1, x2, y1, y2 }: ShuttersProps) => (
  <>
    {(
      [
        [x1 - 17, x1 - 1, 'sl'],
        [x2 + 1, x2 + 17, 'sr'],
      ] as const
    ).map(([left, right, side]) => {
      let d = '';
      for (let y = y1 + 8; y < y2; y += 8) {
        d += `M${left + 3} ${y}H${right - 3}`;
      }
      return (
        <g key={side} className={`shutter ${side}`}>
          <rect x={left} y={y1} width={right - left} height={y2 - y1} fill={SPRUCE} />
          <path d={d} stroke={TILE} strokeWidth="1" opacity=".5" />
        </g>
      );
    })}
  </>
);

interface ClosedShuttersProps {
  readonly path: string;
  readonly cx: number;
  readonly y1: number;
  readonly y2: number;
}

/** A window shut: the shutters closed over the arch (line 541). */
export const ClosedShutters = ({ path, cx, y1, y2 }: ClosedShuttersProps) => {
  let d = '';
  for (let y = y1 + 10; y < y2; y += 9) {
    d += `M${cx - 36} ${y}H${cx + 36}`;
  }
  return (
    <>
      <path d={path} fill={SPRUCE} />
      <path d={`M${cx} ${y1 - 2}V${y2}`} strokeWidth="1.6" />
      <path d={d} stroke={TILE} strokeWidth="1" opacity=".45" />
    </>
  );
};

interface CurtainsProps {
  readonly x1: number;
  readonly x2: number;
  readonly top: number;
  readonly bottom: number;
}

/** Curtains drawn across a window (line 547). */
export const Curtains = ({ x1, x2, top, bottom }: CurtainsProps): ReactElement => {
  const m = (x1 + x2) / 2;
  return (
    <>
      <path
        d={`M${x1 + 4} ${bottom}V${top + 40}c4-22 18-34 ${m - x1 - 4}-37c-8 30-8 ${bottom - top - 40} 0 ${bottom - top - 3}Z`}
        fill={ROSE}
        strokeWidth="1.6"
      />
      <path
        d={`M${x2 - 4} ${bottom}V${top + 40}c-4-22-18-34-${x2 - m - 4}-37c8 30 8 ${bottom - top - 40} 0 ${bottom - top - 3}Z`}
        fill={ROSE}
        strokeWidth="1.6"
      />
    </>
  );
};
