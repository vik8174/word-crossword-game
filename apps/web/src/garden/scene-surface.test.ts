import { describe, expect, it } from 'vitest';

import { ON_SCENE_SX, fullHeightBandSx } from './scene-surface';
import { BAND, BAND_EDGE, CONTROL } from './scene-palette';

/** The one button rule, read out as a plain object rather than rendered. */
const BUTTON_SX = (ON_SCENE_SX['& .MuiButton-contained'] ?? {}) as Record<string, unknown>;

/** Its `&.Mui-disabled` override, the same way. */
const DISABLED_SX = (BUTTON_SX['&.Mui-disabled'] ?? {}) as Record<string, unknown>;

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

describe('the one control, in every one of its states', () => {
  it('carries the gold edge, the sun dot and the lift at rest', () => {
    expect(BUTTON_SX.backgroundColor).toBe(CONTROL.fill);
    expect(BUTTON_SX.border).toBe(`1.5px solid ${CONTROL.edge}`);
    expect(BUTTON_SX.boxShadow).toBe(CONTROL.lift);

    const dot = (BUTTON_SX['&::before'] ?? {}) as Record<string, unknown>;

    expect(dot.backgroundColor).toBe(CONTROL.mark);
    expect(dot.content).toBe('""');
  });

  it('keeps the edge and the lift once it cannot be pressed, and does not read its own edge', () => {
    // `disableElevation` (`theme.ts`) gives MUI's own `.Mui-disabled` rule a
    // `boxShadow: 'none'` of its own, still present in the sheet. The override
    // below outranks it by one extra class in its compiled selector — the same
    // reason `&&&`/`GATE_INK` wins in `HomePage.tsx` (issue #126) — but only
    // once `boxShadow` is actually named here, which it was not before this
    // ticket, and the lift silently vanished from every waiting control.
    expect(DISABLED_SX.backgroundColor).toBe(CONTROL.restingFill);
    expect(DISABLED_SX.color).toBe(CONTROL.restingInk);
    expect(DISABLED_SX.boxShadow).toBe(CONTROL.lift);
    // The edge is not restated here at all: it is the same gold in every
    // state, so nothing in this override may touch `border` or `borderColor`.
    expect(DISABLED_SX.border).toBeUndefined();
    expect(DISABLED_SX.borderColor).toBeUndefined();
  });

  it('never lights the label off the fill under a finger, and never off its edge', () => {
    const hover = (BUTTON_SX['&:hover'] ?? {}) as Record<string, unknown>;

    expect(hover.backgroundColor).toBe(CONTROL.litFill);
    expect(CONTROL.litFill).not.toBe(CONTROL.edge);
  });

  it('keeps the lift on a press and on a keyboard focus, not only at rest', () => {
    // The same `disableElevation` gap as `.Mui-disabled` above, and it would
    // have been easy to fix one and miss the rest: MUI's own styles zero
    // `boxShadow` on `:hover`, `:active` and `.Mui-focusVisible` alike, and
    // hover is the one state this ticket's own contrast figure is measured
    // on — a shadow that vanished the moment a reader's pointer was actually
    // over the label would have failed this ticket's own acceptance
    // criterion silently.
    const hover = (BUTTON_SX['&:hover'] ?? {}) as Record<string, unknown>;
    const active = (BUTTON_SX['&:active'] ?? {}) as Record<string, unknown>;
    const focusVisible = (BUTTON_SX['&.Mui-focusVisible'] ?? {}) as Record<string, unknown>;

    expect(hover.boxShadow).toBe(CONTROL.lift);
    expect(active.boxShadow).toBe(CONTROL.lift);
    expect(focusVisible.boxShadow).toBe(CONTROL.lift);
  });
});
