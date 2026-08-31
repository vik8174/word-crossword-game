import { describe, expect, it } from 'vitest';

import {
  CLOSED_AT,
  CLOTH_MS,
  clothBand,
  closed,
  dimming,
  GREETING_FROM,
  showingWords,
} from './cloth';

/** The numbers the ticket decided, kept here so a drift is a failure and not a surprise. */
const DECIDED = { totalMs: 1900, unrollUntil: 0.58, contentFrom: 0.64 };

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 780 };

describe('the numbers the cloth was decided on', () => {
  it('takes as long as the ticket said, and does each part of it when it said', () => {
    expect(CLOTH_MS).toBe(DECIDED.totalMs);
    expect(CLOSED_AT).toBe(DECIDED.unrollUntil);
    expect(GREETING_FROM).toBe(DECIDED.contentFrom);
  });

  it('finishes laying the cloth before it starts on the words', () => {
    // The order is the whole of the moment: the picture is given to the reader
    // first and the sentence second.
    expect(CLOSED_AT).toBeLessThan(GREETING_FROM);
  });
});

describe('closed', () => {
  it('starts from nothing and has met in the middle by the moment it was meant to', () => {
    expect(closed(0)).toBe(0);
    expect(closed(CLOSED_AT)).toBe(1);
    expect(closed(1)).toBe(1);
  });

  it('never goes backwards, and never opens again', () => {
    let last = -1;

    for (let step = 0; step <= 100; step += 1) {
      const now = closed(step / 100);

      expect(now).toBeGreaterThanOrEqual(last);
      expect(now).toBeLessThanOrEqual(1);
      last = now;
    }
  });
});

describe('showingWords', () => {
  it('says nothing at all while the cloth is still travelling', () => {
    expect(showingWords(0)).toBe(0);
    expect(showingWords(CLOSED_AT)).toBe(0);
    expect(showingWords(GREETING_FROM)).toBe(0);
  });

  it('has the whole greeting up by the end', () => {
    expect(showingWords(GREETING_FROM + 0.01)).toBeGreaterThan(0);
    expect(showingWords(1)).toBe(1);
    expect(showingWords(4)).toBe(1);
  });
});

describe('dimming', () => {
  it('darkens the room behind the cloth and then stops', () => {
    expect(dimming(0)).toBe(0);
    expect(dimming(0.25)).toBeGreaterThan(0);
    expect(dimming(1)).toBe(dimming(0.25));
  });

  it('leaves the board showing through rather than covering it', () => {
    // The board they filled in stays on the screen behind the cloth. It is put
    // down, not taken away (`docs/decisions/0030-where-movement-is-allowed.md`).
    expect(dimming(1)).toBeLessThan(1);
  });
});

describe('clothBand', () => {
  it('hangs across the whole window, with air above and below it', () => {
    const band = clothBand(DESKTOP);

    expect(band.x).toBe(0);
    expect(band.width).toBe(DESKTOP.width);
    expect(band.y).toBeGreaterThan(0);
    expect(band.y + band.height).toBeLessThan(DESKTOP.height);
  });

  it('is centred, whatever the window', () => {
    for (const viewport of [DESKTOP, PHONE, { width: 1024, height: 500 }]) {
      const band = clothBand(viewport);

      expect(band.y, `${viewport.width} by ${viewport.height}`).toBeCloseTo(
        viewport.height - band.y - band.height,
        6,
      );
    }
  });

  it('does not grow into a banner half a storey high on a tall window', () => {
    expect(clothBand({ width: 1440, height: 2000 }).height).toBe(clothBand(DESKTOP).height);
  });

  it('keeps enough cloth for the words on a window with almost no height', () => {
    const band = clothBand({ width: 390, height: 320 });

    expect(band.height).toBeGreaterThan(200);
    expect(band.y).toBeGreaterThanOrEqual(0);
  });
});
