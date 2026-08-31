import { describe, expect, it } from 'vitest';

import { paintPetals, type PetalBrush } from './paint-petals';
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
    firstly,
    of: (call: string) => strokes.filter((drawn) => drawn.call === call),
  };
};

describe('paintPetals', () => {
  it('draws every petal of the sky', () => {
    const petals = fillSky(SKY, () => 0.5);
    const { brush, of } = recordingBrush();

    paintPetals(brush, petals, SKY, '#A54460');

    expect(of('fill')).toHaveLength(petals.length);
  });

  it('clears the frame before it, so a petal leaves no trail behind it', () => {
    const { brush, strokes, firstly } = recordingBrush();

    paintPetals(brush, [], SKY, '#A54460');

    expect(strokes).toHaveLength(1);
    expect(firstly('clearRect')).toEqual([0, 0, SKY.width, SKY.height]);
  });

  it('draws in the colour it was handed rather than one of its own', () => {
    const { brush } = recordingBrush();

    paintPetals(brush, [], SKY, '#A54460');

    expect(brush.fillStyle).toBe('#A54460');
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
    };
    const { brush, firstly } = recordingBrush();

    paintPetals(brush, [petal], SKY, '#A54460');

    expect(firstly('translate')).toEqual([120, 40]);
    expect(firstly('rotate')).toEqual([0.5]);
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
    });
    const { brush, alphas } = recordingBrush();

    paintPetals(brush, [at(0.2), at(0.4)], SKY, '#A54460');

    expect(alphas).toEqual([0.2, 0.4]);
  });

  it('draws nothing that falls across the temple doorway', () => {
    const doorway = { x: 200, y: 100, width: 300, height: 200 };
    const at = (x: number, y: number): Petal => ({
      x,
      y,
      fall: 30,
      sway: 0,
      phase: 0,
      spin: 0,
      angle: 0,
      size: 8,
      ink: 0.3,
    });
    const { brush, of } = recordingBrush();

    // Three in the garden and two over the hall. It is geometry and not a
    // setting: nothing here knows the app is playing a game, only that these
    // two petals are inside a rectangle.
    paintPetals(
      brush,
      [at(10, 10), at(199, 200), at(250, 150), at(499, 299), at(600, 400)],
      SKY,
      '#A54460',
      doorway,
    );

    expect(of('fill')).toHaveLength(3);
  });

  it('lets the weather through a doorway that is nowhere, and one with no size', () => {
    const petal: Petal = {
      x: 0,
      y: 0,
      fall: 30,
      sway: 0,
      phase: 0,
      spin: 0,
      angle: 0,
      size: 8,
      ink: 0.3,
    };

    for (const doorway of [null, { x: 0, y: 0, width: 0, height: 0 }]) {
      const { brush, of } = recordingBrush();

      // A window that has not been laid out yet projects the doorway onto a
      // point, and a point that swallowed the weather would be a blank page.
      paintPetals(brush, [petal], SKY, '#A54460', doorway);

      expect(of('fill')).toHaveLength(1);
    }
  });

  it('leaves the brush as it found it, so what it drew cannot leak onto anything else', () => {
    const { brush, of } = recordingBrush();

    paintPetals(
      brush,
      fillSky(SKY, () => 0.5),
      SKY,
      '#A54460',
    );

    expect(of('save')).toHaveLength(of('restore').length);
  });
});
