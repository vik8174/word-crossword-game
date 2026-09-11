import { describe, expect, it } from 'vitest';

import { SCENE_IMAGE_CEILING_BYTES, tooHeavySceneReport } from './scene-weight';

const KIB = 1024;

describe('tooHeavySceneReport', () => {
  it('says nothing when every scene image is under the ceiling', () => {
    expect(
      tooHeavySceneReport(
        [
          { fileName: 'scenes/gate.avif', bytes: 160 * KIB },
          { fileName: 'scenes/gate.jpg', bytes: 150 * KIB },
        ],
        180 * KIB,
      ),
    ).toBeNull();
  });

  it('lets a scene image sit exactly on the ceiling', () => {
    expect(
      tooHeavySceneReport([{ fileName: 'scenes/gate.avif', bytes: 180 * KIB }], 180 * KIB),
    ).toBeNull();
  });

  it('names a file over the ceiling and how heavy it is', () => {
    const report = tooHeavySceneReport(
      [{ fileName: 'scenes/gate.avif', bytes: 200 * KIB }],
      180 * KIB,
    );

    expect(report).not.toBeNull();
    expect(report).toContain('scenes/gate.avif');
    expect(report).toContain('200.0 KiB');
    expect(report).toContain('180.0 KiB');
  });

  it('checks every file rather than the sum of them', () => {
    // Unlike the first-visit ceiling, this one is not a total: two scene
    // images each comfortably under 180 KiB may add up to well over it
    // without either of them being the problem, because only one of them
    // ever ships on a given route.
    expect(
      tooHeavySceneReport(
        [
          { fileName: 'scenes/gate.avif', bytes: 160 * KIB },
          { fileName: 'scenes/doors.avif', bytes: 150 * KIB },
          { fileName: 'scenes/hall.avif', bytes: 120 * KIB },
        ],
        180 * KIB,
      ),
    ).toBeNull();
  });

  it('names every file that is over, heaviest first', () => {
    const report = tooHeavySceneReport(
      [
        { fileName: 'scenes/gate.avif', bytes: 190 * KIB },
        { fileName: 'scenes/doors.avif', bytes: 250 * KIB },
      ],
      180 * KIB,
    );

    expect(report?.indexOf('scenes/doors.avif')).toBeLessThan(
      report?.indexOf('scenes/gate.avif') ?? 0,
    );
  });
});

describe('the ceiling itself', () => {
  it('is the number the ticket set, said in bytes', () => {
    // Written down as a test for the same reason FIRST_VISIT_CEILING_BYTES is:
    // changing it is a decision somebody should have to see in a diff.
    expect(SCENE_IMAGE_CEILING_BYTES).toBe(180 * KIB);
  });
});
