import { describe, expect, it } from 'vitest';

import {
  FIRST_VISIT_CEILING_BYTES,
  firstVisitWeight,
  preloadedHrefs,
  tooHeavyReport,
} from './first-visit-weight';

const KIB = 1024;

describe('preloadedHrefs', () => {
  it('finds what the HTML fetches before anything has run', () => {
    const html = `
      <link rel="preload" href="/fonts/zen-old-mincho-v13-latin-400.woff2" as="font" crossorigin />
      <link rel="stylesheet" href="/assets/index.css" />
      <script type="module" src="/assets/index.js"></script>
    `;

    // The font is the whole reason this exists: it is copied out of `public/`
    // and named by hand, so a measurement taken off the bundle alone would miss
    // sixteen kilobytes every first visit pays for.
    expect(preloadedHrefs(html)).toEqual(['/fonts/zen-old-mincho-v13-latin-400.woff2']);
  });

  it('is not fooled by a link that merely mentions preloading', () => {
    const html = '<link rel="modulepreload" href="/assets/room.js" />';

    // A module preloaded for a route nobody has opened is not a first visit's
    // cost, and counting it would make the ceiling meaningless in the direction
    // that matters.
    expect(preloadedHrefs(html)).toEqual([]);
  });

  it('finds nothing in an HTML that asks for nothing', () => {
    expect(preloadedHrefs('<html><body></body></html>')).toEqual([]);
  });
});

describe('firstVisitWeight', () => {
  it('is everything a visitor fetches, added up', () => {
    expect(
      firstVisitWeight([
        { fileName: 'index.html', gzipBytes: 1000 },
        { fileName: 'assets/index.js', gzipBytes: 5000 },
      ]),
    ).toBe(6000);
  });

  it('is nothing when nothing is fetched', () => {
    expect(firstVisitWeight([])).toBe(0);
  });
});

describe('tooHeavyReport', () => {
  it('says nothing about a landing page that is under the ceiling', () => {
    expect(tooHeavyReport([{ fileName: 'assets/index.js', gzipBytes: 100 * KIB }], 210 * KIB)).toBe(
      null,
    );
  });

  it('lets a landing page sit exactly on the ceiling', () => {
    // The ceiling is what is allowed rather than what is not: a build that
    // failed at the number written down would make the number a lie by one
    // byte.
    expect(tooHeavyReport([{ fileName: 'assets/index.js', gzipBytes: 210 * KIB }], 210 * KIB)).toBe(
      null,
    );
  });

  it('names every file and puts the heaviest first', () => {
    const report = tooHeavyReport(
      [
        { fileName: 'assets/index.js', gzipBytes: 10 * KIB },
        { fileName: 'assets/react.js', gzipBytes: 300 * KIB },
      ],
      210 * KIB,
    );

    expect(report).not.toBeNull();
    expect(report).toContain('310.0 KiB');
    expect(report).toContain('210.0 KiB');
    // The answer to being over is nearly always one import, and the list is
    // what points at it — so the biggest thing on the page is the first thing
    // read.
    expect(report?.indexOf('assets/react.js')).toBeLessThan(
      report?.indexOf('assets/index.js') ?? 0,
    );
  });
});

describe('the ceiling itself', () => {
  it('is the number the ticket set, said in bytes', () => {
    // Written down as a test because the number is a decision rather than a
    // measurement: changing it is somebody deciding the landing page may cost
    // more, which is a thing a reviewer should have to see.
    expect(FIRST_VISIT_CEILING_BYTES).toBe(210 * KIB);
  });
});
