import { Fragment, type CSSProperties, type ReactElement } from 'react';

import { TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { DRAWING_PALETTE } from './street-drawing-palette';
import { P0, P2 } from './street-geometry';

const { ink: INK, ochre: LIT, spruce: SPRUCE, tile: TILE } = STREET;
const { azul: AZUL, gera: GERA, leaf: LEAF, orange: ORANGE } = DRAWING_PALETTE;

/** The point a fraction `t` along the line, which sags by `sag` (template line 400). */
const along = (t: number, sag: number): readonly [number, number] => {
  const p1y = 300 + sag;
  const u = 1 - t;
  return [
    u * u * P0[0] + 2 * u * t * 320 + t * t * P2[0],
    u * u * P0[1] + 2 * u * t * p1y + t * t * P2[1],
  ];
};

/** A property that sets `--k`, the index that staggers each piece (`motion-play-styles.ts`). */
const indexed = (k: number): CSSProperties => ({ '--k': k }) as CSSProperties;

/** The letters of one word, each on a tile pegged to the line (line 552). */
export const LetterTiles = ({
  letters,
  sag,
}: {
  readonly letters: string;
  readonly sag: number;
}) => {
  const chars = Array.from(letters);
  const n = chars.length;
  return (
    <>
      {chars.map((ch, i) => {
        const t = n === 1 ? 0.5 : 0.24 + (0.52 * i) / (n - 1);
        const p = along(t, sag);
        const rot = i % 2 ? 4 : -4;
        return (
          <g
            key={i}
            className="card"
            transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${rot})`}
          >
            <rect
              x="-14"
              y="5"
              width="28"
              height="28"
              rx="4"
              fill={TILE}
              stroke={INK}
              strokeWidth="1.6"
            />
            <text
              x="0"
              y="25"
              textAnchor="middle"
              fontFamily={TEXT_FONT_FAMILY}
              fontWeight="700"
              fontSize="18"
              fill={INK}
            >
              {ch}
            </text>
            <rect x="-2.5" y="-4" width="5" height="12" rx="1.5" fill={SPRUCE} />
          </g>
        );
      })}
    </>
  );
};

interface WordCardsProps {
  readonly words: readonly string[];
  readonly sag: number;
}

/** The answered words, hung on the line in the order given (line 563). */
export const WordCards = ({ words, sag }: WordCardsProps) => {
  const n = words.length;
  return (
    <>
      {words.map((w, i) => {
        const t = n === 1 ? 0.5 : 0.16 + (0.68 * i) / (n - 1);
        const p = along(t, sag);
        const rot = i % 2 ? 3 : -3;
        const wd = Math.max(30, w.length * 8.2 + 12);
        const lift = i % 2 ? 34 : 4;
        return (
          <g
            key={w}
            className="card"
            transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${rot})`}
          >
            <g>
              {lift > 4 && <path d={`M0 0v${lift - 2}`} stroke={INK} strokeWidth="1.2" />}
              <rect
                x={-wd / 2}
                y={lift}
                width={wd}
                height="22"
                rx="4"
                fill={TILE}
                stroke={INK}
                strokeWidth="1.4"
              />
              <text
                x="0"
                y={lift + 16}
                textAnchor="middle"
                fontFamily={TEXT_FONT_FAMILY}
                fontStyle="italic"
                fontSize="14"
                fill={INK}
              >
                {w}
              </text>
              {lift <= 4 && <rect x="-2.5" y="-4" width="5" height="11" rx="1.5" fill={SPRUCE} />}
            </g>
          </g>
        );
      })}
    </>
  );
};

const FIESTA_COLOURS = [GERA, LIT, AZUL, TILE, LEAF, ORANGE];

/** One string of lanterns: `[x0, y0, x1, y1, sag]`. */
type StringSpec = readonly [number, number, number, number, number];

/** The two strings of lanterns. */
const STRINGS: readonly StringSpec[] = [
  [214, 150, 426, 160, 196],
  [214, 116, 426, 128, 150],
];

/** One lantern on a string at fraction `t`. */
const Lantern = ({
  gi,
  i,
  g,
}: {
  readonly gi: number;
  readonly i: number;
  readonly g: StringSpec;
}) => {
  const t = i / 8;
  const u = 1 - t;
  const x = u * u * g[0] + 2 * u * t * 320 + t * t * g[2];
  const y = u * u * g[1] + 2 * u * t * g[4] + t * t * g[3];
  const c = FIESTA_COLOURS[(i + gi * 3) % FIESTA_COLOURS.length];
  const r = gi ? 7 : 9;
  return (
    <g className="lantern" style={indexed(i + gi * 7)}>
      <path d={`M${x.toFixed(1)} ${y.toFixed(1)}v5`} stroke={INK} strokeWidth="1.2" />
      <rect x={(x - r * 0.5).toFixed(1)} y={(y + 4).toFixed(1)} width={r} height="3" fill={INK} />
      <ellipse
        cx={x.toFixed(1)}
        cy={(y + 7 + r).toFixed(1)}
        rx={r}
        ry={(r * 1.1).toFixed(1)}
        fill={c}
        stroke={INK}
        strokeWidth="1.4"
      />
      <path
        d={`M${(x - r).toFixed(1)} ${(y + 7 + r).toFixed(1)}h${2 * r}`}
        stroke={INK}
        strokeWidth="0.8"
        opacity=".5"
      />
      {c === TILE && (
        <>
          <circle cx={(x - 3).toFixed(1)} cy={(y + 5 + r).toFixed(1)} r="1.6" fill={GERA} />
          <circle cx={(x + 3).toFixed(1)} cy={(y + 10 + r).toFixed(1)} r="1.6" fill={GERA} />
        </>
      )}
    </g>
  );
};

/** One piece of confetti, placed by the template's seeded formula (lines 593-594). */
const confettiAt = (k: number): ReactElement | null => {
  let cx = (Math.sin(k * 12.9898) * 43758.5453) % 1;
  let cy = (Math.sin(k * 78.233) * 12345.678) % 1;
  cx = Math.abs(cx) * 640;
  cy = 140 + Math.abs(cy) * 220;
  if ((cx > 110 && cx < 210 && cy < 300) || (cx > 432 && cx < 532 && cy < 314)) {
    return null;
  }
  return (
    <g key={k} className="confetti" style={indexed(k)}>
      <rect
        x={cx.toFixed(1)}
        y={cy.toFixed(1)}
        width="4"
        height="8"
        rx="1"
        fill={FIESTA_COLOURS[k % FIESTA_COLOURS.length]}
        stroke={INK}
        strokeWidth=".6"
        transform={`rotate(${(k * 47) % 180} ${cx.toFixed(1)} ${cy.toFixed(1)})`}
      />
    </g>
  );
};

/** Lanterns strung across the street, and confetti: drawn only for a crossword filled in (line 577). */
export const Fiesta = () => (
  <>
    {STRINGS.map((g, gi) => (
      <Fragment key={gi}>
        <path
          d={`M${g[0]} ${g[1]}Q320 ${g[4]} ${g[2]} ${g[3]}`}
          fill="none"
          stroke={INK}
          strokeWidth="1.3"
        />
        {Array.from({ length: 7 }, (_, n) => (
          <Lantern key={n + 1} gi={gi} i={n + 1} g={g} />
        ))}
      </Fragment>
    ))}
    {Array.from({ length: 28 }, (_, k) => confettiAt(k))}
  </>
);
