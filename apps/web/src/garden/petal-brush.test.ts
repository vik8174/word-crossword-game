import { describe, expect, it } from 'vitest';

import { paintPetals, type PetalBrush } from './petal-brush';
import { fillSky, type Petal, type Sky } from './petals';

const SKY: Sky = { width: 800, height: 600 };

/** Everything a brush was told to do, in the order it was told. */
interface Stroke {
  readonly call: string;
  readonly args: readonly number[];
}

/**
 * A brush that draws nothing and remembers everything.
 *
 * jsdom has no canvas to draw on, which is the ordinary reason a drawing goes
 * unchecked. It is not the reason it should: what a petal is drawn as is
 * arithmetic like any other, and this reads it back.
 */
const recordingBrush = () => {
  const strokes: Stroke[] = [];
  const alphas: number[] = [];
  const tones: (string | CanvasGradient | CanvasPattern)[] = [];
  const record =
    (call: string) =>
    (...args: number[]) => {
      strokes.push({ call, args });
    };

  const brush: PetalBrush = {
    clearRect: record('clearRect'),
    save: record('save'),
    restore: record('restore'),
    translate: record('translate'),
    rotate: record('rotate'),
    scale: record('scale'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    fill: () => {
      alphas.push(brush.globalAlpha);
      tones.push(brush.fillStyle);
      strokes.push({ call: 'fill', args: [] });
    },
    globalAlpha: 1,
    fillStyle: '',
  };

  /**
   * The first time the brush was told to do something.
   *
   * @param call - What it was told to do
   * @returns The numbers it was told to do it with
   * @throws When it was never told to, which is the test's answer
   */
  const firstly = (call: string): readonly number[] => {
    const [stroke] = strokes.filter((drawn) => drawn.call === call);

    if (stroke === undefined) {
      throw new Error(`the brush was never told to ${call}`);
    }

    return stroke.args;
  };

  return {
    brush,
    strokes,
    alphas,
    tones,
    firstly,
    of: (call: string) => strokes.filter((drawn) => drawn.call === call),
  };
};

describe('paintPetals', () => {
  it('draws every petal of the sky', () => {
    const petals = fillSky(SKY, () => 0.5);
    const { brush, of } = recordingBrush();

    paintPetals(brush, petals, SKY);

    expect(of('fill')).toHaveLength(petals.length);
  });

  it('clears the frame before it, so a petal leaves no trail behind it', () => {
    const { brush, strokes, firstly } = recordingBrush();

    paintPetals(brush, [], SKY);

    expect(strokes).toHaveLength(1);
    expect(firstly('clearRect')).toEqual([0, 0, SKY.width, SKY.height]);
  });

  it('draws each petal in its own tone rather than in one colour for the sky', () => {
    const at = (tone: string): Petal => ({
      x: 0,
      y: 0,
      fall: 30,
      sway: 0,
      phase: 0,
      spin: 0,
      angle: 0,
      size: 8,
      ink: 0.6,
      tone,
    });
    const { brush, tones } = recordingBrush();

    paintPetals(brush, [at('#F7D3B8'), at('#EE9A8C')], SKY);

    expect(tones).toEqual(['#F7D3B8', '#EE9A8C']);
  });

  it('puts each petal where it is and turns it the way it is facing', () => {
    const petal: Petal = {
      x: 120,
      y: 40,
      fall: 30,
      sway: 10,
      phase: 0,
      spin: 0,
      angle: 0.5,
      size: 8,
      ink: 0.3,
      tone: '#F7D3B8',
    };
    const { brush, firstly } = recordingBrush();

    paintPetals(brush, [petal], SKY);

    expect(firstly('translate')).toEqual([120, 40]);
    expect(firstly('rotate')).toEqual([0.5]);
  });

  it('draws the template shape: 1.05 wide against its length, waisted at -0.02', () => {
    // Pinned through the curve it actually draws, rather than through
    // constants of its own `petal-brush.ts` keeps private: a size of 8 makes
    // the arithmetic easy to check by hand (issue #190).
    const petal: Petal = {
      x: 0,
      y: 0,
      fall: 30,
      sway: 0,
      phase: 0,
      spin: 0,
      angle: 0,
      size: 8,
      ink: 0.6,
      tone: '#F7D3B8',
    };
    const { brush, of } = recordingBrush();

    paintPetals(brush, [petal], SKY);

    const [curve] = of('quadraticCurveTo');

    expect(curve?.args).toEqual([8.4, -0.16, 0, 8]);
  });

  it('draws a petal at its own weight rather than all of them at one', () => {
    const at = (ink: number): Petal => ({
      x: 0,
      y: 0,
      fall: 30,
      sway: 0,
      phase: 0,
      spin: 0,
      angle: 0,
      size: 8,
      ink,
      tone: '#F7D3B8',
    });
    const { brush, alphas } = recordingBrush();

    paintPetals(brush, [at(0.2), at(0.4)], SKY);

    expect(alphas).toEqual([0.2, 0.4]);
  });

  it('leaves the brush as it found it, so what it drew cannot leak onto anything else', () => {
    const { brush, of } = recordingBrush();

    paintPetals(
      brush,
      fillSky(SKY, () => 0.5),
      SKY,
    );

    expect(of('save')).toHaveLength(of('restore').length);
  });
});
