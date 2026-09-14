import { describe, expect, it } from 'vitest';

import { GATE_ON_SCENE_SX, ON_SCENE_SX, fullHeightBandSx } from './scene-surface';
import { BAND, BAND_EDGE, SCENE } from './scene-palette';

/**
 * What this file is for: a band is told from a panel by two things, and both of
 * them are one character away from being written the other way round.
 *
 * The first is the hairline, which belongs to an edge rather than to a band: an
 * edge carries it when there is picture beyond it, and no other edge carries
 * anything. A line drawn all the way round is a border, and a surface with a
 * border round it is a panel. Written as a rule it covers all three places at
 * once, the phone included — where the band down the middle is as wide as the
 * window and no edge of it has any forest left beside it.
 *
 * The second is that the band is `absolute` — a band that went `fixed` would go
 * on looking right at the gate, where nothing moves, and come away from the
 * screen inside a room, where the shift puts it in a `transform`
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 */
const PLACES = ['left', 'right', 'centre'] as const;

describe('a band drawn out to the top and bottom of its frame', () => {
  it('is held against the page it belongs to rather than against the window', () => {
    for (const place of PLACES) {
      const band = fullHeightBandSx(place, '10rem');

      expect(band.position, place).toBe('absolute');
      expect(band.top, place).toBe(0);
      expect(band.bottom, place).toBe(0);
    }
  });

  it('is painted in the one colour the interface stands on', () => {
    for (const place of PLACES) {
      expect(fullHeightBandSx(place, '10rem').backgroundColor, place).toBe(BAND);
    }
  });

  it('is never wider than the frame it is in, wherever it stands', () => {
    for (const place of PLACES) {
      expect(fullHeightBandSx(place, '10rem').width, place).toBe('min(10rem, 100%)');
    }
  });

  it('carries the line down the edge it faces the picture with, and no other', () => {
    const left = fullHeightBandSx('left', '10rem');
    const right = fullHeightBandSx('right', '10rem');

    expect(left.left).toBe(0);
    expect(left.borderRight).toContain(BAND_EDGE);
    expect(left.borderLeft).toBeUndefined();

    expect(right.right).toBe(0);
    expect(right.borderLeft).toContain(BAND_EDGE);
    expect(right.borderRight).toBeUndefined();
  });

  it('carries it down both edges when it stands in the middle, where both face it', () => {
    const centre = fullHeightBandSx('centre', '10rem');

    expect(centre.borderLeft).toContain(BAND_EDGE);
    expect(centre.borderRight).toContain(BAND_EDGE);
  });

  it('carries none at all once it is as wide as the frame, where no edge faces it', () => {
    for (const place of PLACES) {
      const band = fullHeightBandSx(place, '10rem');

      expect(band['@media (max-width: 10rem)'], place).toEqual({ border: 'none' });
    }
  });

  it('loses them at the very width it stops being narrower at, and not at a number of its own', () => {
    // The one thing that could quietly rot here: a threshold written down
    // beside the width instead of taken from it. The first hand to change how
    // wide a band may be would leave the lines standing where the forest had
    // already stopped, and nothing on screen would say so.
    for (const atMost of ['34rem', 'calc(15rem + 32px)']) {
      const band = fullHeightBandSx('centre', atMost);

      expect(band.width).toBe(`min(${atMost}, 100%)`);
      expect(band[`@media (max-width: ${atMost})`]).toEqual({ border: 'none' });
    }
  });

  it('centres itself with its own margins, leaving no transform behind it', () => {
    // A transform makes a containing block, and what this app may not have is
    // one of those under the interface (`0030-where-movement-is-allowed.md`).
    const centre = fullHeightBandSx('centre', '10rem');

    expect(centre.transform).toBeUndefined();
    expect(centre.left).toBe(0);
    expect(centre.right).toBe(0);
    expect(centre.marginInline).toBe('auto');
  });
});

// `ON_SCENE_SX` used to carry a fourth describe block here, pinning
// `'& .MuiButton-contained'` and its states. Issue #184 removed that rule
// once nothing standing on the picture rendered MUI's `Button` any more —
// every button on a scene is `components/PillButton.tsx` now, which reads
// none of `ON_SCENE_SX`. Its own look is pinned in `button-styles.test.ts`
// instead, next to the styles it tests.

describe('the gate reading its own body text at full cream', () => {
  it('lifts exactly the one line the gate band still changes, and nothing else', () => {
    // `/create` and the room's `join` screen stand on the gate's own band,
    // under the lighter middle of the new veil, so their body text reads
    // full cream instead of the dimmer ink every other screen on a picture
    // still uses (issue #190). Everything else `ON_SCENE_SX` sets is
    // unchanged — this is `ON_SCENE_SX` with one rule overridden, not a
    // palette of its own.
    //
    // Two more lines used to be lifted here, `&& .MuiInputLabel-root` and
    // `&& .MuiFormHelperText-root`: issue #193 moved every field the gate
    // renders onto `components/Field.tsx`, which draws neither MUI class, so
    // a rule lifting them would now match nothing on this scene — the trap
    // this file's own comment above warned about.
    const overridden: (keyof typeof ON_SCENE_SX)[] = ['& .MuiTypography-body2'];

    for (const key of overridden) {
      expect(GATE_ON_SCENE_SX[key]).toEqual({ color: SCENE.cream });
    }

    for (const [key, value] of Object.entries(ON_SCENE_SX)) {
      if (!(overridden as string[]).includes(key)) {
        expect(GATE_ON_SCENE_SX[key as keyof typeof ON_SCENE_SX]).toEqual(value);
      }
    }
  });

  it('carries no rule for an element nothing on a scene renders any more', () => {
    // `RoomInvitePanel.tsx` is the one `TextField` left in the app and never
    // sets `helperText`, so `FormHelperText` renders nowhere on a scene —
    // the rule that used to colour it is gone from `ON_SCENE_SX` itself,
    // not only from `GATE_ON_SCENE_SX`'s own override of it.
    expect(ON_SCENE_SX['&& .MuiFormHelperText-root']).toBeUndefined();
    expect(ON_SCENE_SX['&& .MuiFormHelperText-root.Mui-error']).toBeUndefined();
  });
});
