import { describe, expect, it } from 'vitest';

import {
  APP_SHELL,
  ARRANGED_ROOM,
  BOX_AT_ITS_GRID,
  NARROW_WINDOW,
  TABLET_WINDOW,
  THREE_ZONES,
} from './room-layout';

describe('the room’s media queries', () => {
  it('has the tablet’s arrangement from 768 wide and 600 high', () => {
    expect(ARRANGED_ROOM).toBe('@media (min-width: 768px) and (min-height: 600px)');
    expect(TABLET_WINDOW).toBe(
      '@media (min-width: 768px) and (max-width: 1199px) and (min-height: 600px)',
    );
  });

  it('is an application on a tablet only from 900 high, and on a wide window from 600', () => {
    expect(APP_SHELL).toBe(
      '@media (min-width: 768px) and (max-width: 1199px) and (min-height: 900px), (min-width: 1200px) and (min-height: 600px)',
    );
    expect(THREE_ZONES).toBe('@media (min-width: 1200px) and (min-height: 600px)');
  });

  it('keeps the phone and the box at its grid where they were', () => {
    expect(NARROW_WINDOW).toBe('@media (max-width: 767px)');
    expect(BOX_AT_ITS_GRID).toBe(
      '@media (max-width: 767px), (min-width: 768px) and (max-width: 1199px) and (min-height: 600px)',
    );
  });
});
