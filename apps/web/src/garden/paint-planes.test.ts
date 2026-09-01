import { describe, expect, it } from 'vitest';

import type { SceneBrush } from './brushwork';
import { AIR, PLANES } from './forest-planes';
import { paintPlane, paintVeil } from './paint-planes';
import { type Rect, WORLD } from './world';

/**
 * What a plane does when it is put down, as against what a plane is.
 *
 * `forest-planes.test.ts` holds the table to going one way along its four
 * ramps. This holds the painting of it to three things the table cannot say:
 * that a crown hangs where its own trunk came out and not at a place of its
 * own, that a plane the window is not showing costs nothing, and that the sheet
 * of air between two planes covers the whole window rather than the whole
 * world — the second being what six planes are affordable out of, and the third
 * being what would otherwise paint three thousand two hundred units of haze to
 * show four hundred.
 */

/** A brush that draws nothing and remembers what it was told, following the transform. */
const recordingBrush = () => {
  const marks: { readonly call: string; readonly args: readonly number[]; readonly at: Spot }[] =
    [];
  const fills: string[] = [];
  const stack: Spot[] = [];
  let at: Spot = { x: 0, y: 0 };
  let style = '';

  const record =
    (call: string) =>
    (...args: number[]) => {
      marks.push({ call, args, at });

      if (call === 'roundRect' || call === 'fillRect') {
        fills.push(style);
      }
    };

  const brush = {
    save: () => {
      stack.push(at);
    },
    restore: () => {
      at = stack.pop() ?? { x: 0, y: 0 };
    },
    translate: (x: number, y: number) => {
      at = { x: at.x + x, y: at.y + y };
    },
    rotate: record('rotate'),
    scale: record('scale'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    closePath: record('closePath'),
    rect: record('rect'),
    roundRect: record('roundRect'),
    ellipse: record('ellipse'),
    clip: record('clip'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillRect: record('fillRect'),
    createLinearGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    createRadialGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    globalAlpha: 1,
    lineWidth: 1,
    get fillStyle() {
      return style;
    },
    set fillStyle(next: string | CanvasGradient | CanvasPattern) {
      style = typeof next === 'string' ? next : 'gradient';
    },
    strokeStyle: '',
  } satisfies SceneBrush;

  return { brush, marks, fills };
};

/** Where a space had its origin when a mark was made. */
interface Spot {
  readonly x: number;
  readonly y: number;
}

const EVERYTHING: Rect = { x: 0, y: 0, width: WORLD.width, height: WORLD.height };

/** Where every mark of a painting landed, in world units. */
const spread = (marks: ReturnType<typeof recordingBrush>['marks']) => {
  const xs = marks.filter((mark) => mark.call === 'roundRect').map((mark) => mark.at.x);
  const ys = marks.filter((mark) => mark.call === 'roundRect').map((mark) => mark.at.y);

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
};

describe('paintPlane', () => {
  it('hangs every crown where its own trunk came out, and not at a place of its own', () => {
    for (const plane of PLANES) {
      const { brush, marks } = recordingBrush();

      paintPlane(brush, EVERYTHING, plane);

      const painted = spread(marks);
      const trees = plane.trees;
      const highest = Math.min(...trees.map((tree) => tree.top - tree.rise - tree.down));
      const lowest = Math.max(...trees.map((tree) => tree.base));

      // Every mark of the plane falls between the top of its highest crown and
      // the foot of its lowest tree. A crown floating at a height of its own
      // would put marks outside that, which is what the whole picture used to
      // be: crowns with no trees under them.
      expect(painted.top, `${plane.name} reaches above its own crowns`).toBeGreaterThanOrEqual(
        highest - plane.size * 2,
      );
      expect(painted.bottom, `${plane.name} reaches below its own feet`).toBeLessThanOrEqual(
        lowest + plane.size * 2,
      );
    }
  });

  it('costs nothing but its sheet of air when the window is somewhere else', () => {
    const elsewhere: Rect = { x: 0, y: 0, width: 10, height: 10 };

    for (const plane of PLANES) {
      const { brush, marks } = recordingBrush();

      paintPlane(brush, elsewhere, plane);

      // The sheet is laid over the window whether or not the plane behind it is
      // in view — it is air between the reader and everything further off, and
      // what is further off includes the things that are not this plane.
      const strokes = marks.filter((mark) => mark.call === 'roundRect');
      const sheets = marks.filter((mark) => mark.call === 'fillRect');

      expect(strokes, `${plane.name} painted leaves off the edge of the window`).toEqual([]);
      expect(sheets.length, plane.name).toBe(plane.veil > 0 ? 1 : 0);
    }
  });

  it('paints the same plane every time', () => {
    const first = recordingBrush();
    const second = recordingBrush();
    const plane = PLANES[2];

    expect(plane).toBeDefined();

    if (plane !== undefined) {
      paintPlane(first.brush, EVERYTHING, plane);
      paintPlane(second.brush, EVERYTHING, plane);

      expect(second.marks).toEqual(first.marks);
      expect(second.fills).toEqual(first.fills);
    }
  });
});

describe('paintVeil', () => {
  it('covers the window and not the world', () => {
    const { brush, marks } = recordingBrush();
    const window: Rect = { x: 800, y: 400, width: 1440, height: 900 };

    paintVeil(brush, window, 0.2);

    const [sheet] = marks.filter((mark) => mark.call === 'fillRect');

    expect(sheet).toBeDefined();

    // Cut to the window with a couple of units to spare on every side: the edge
    // of a canvas is where a browser is entitled to blend, and a sheet stopping
    // exactly on it leaves a hairline round the picture.
    const [x, y, width, height] = sheet?.args ?? [];

    expect(x).toBeLessThan(window.x);
    expect(y).toBeLessThan(window.y);
    expect((x ?? 0) + (width ?? 0)).toBeGreaterThan(window.x + window.width);
    expect((y ?? 0) + (height ?? 0)).toBeGreaterThan(window.y + window.height);
    // And nowhere near the size of the world, which is what it used to cover.
    expect(width).toBeLessThan(WORLD.width / 2);
  });

  it('is drawn in the air itself, so it darkens the bottom of the picture rather than lifting it', () => {
    const { brush, fills } = recordingBrush();

    paintVeil(brush, EVERYTHING, 0.2);

    // A gradient rather than a colour. One flat colour would lift the dark
    // bottom of the world towards the middle of it, and the dark bottom is
    // where the water and the near bushes are.
    expect(fills).toEqual(['gradient']);
    expect(Object.values<string>(AIR)).toHaveLength(3);
  });

  it('lays nothing at all when there is no air to lay', () => {
    const { brush, marks } = recordingBrush();

    paintVeil(brush, EVERYTHING, 0);

    expect(marks).toEqual([]);
  });
});
