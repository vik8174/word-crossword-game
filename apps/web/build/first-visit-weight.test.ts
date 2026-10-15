import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assetHrefs,
  FIRST_VISIT_CEILING_BYTES,
  firstVisitWeight,
  NOT_ON_FIRST_VISIT,
  notCountedHrefs,
  tooHeavyReport,
} from './first-visit-weight';

const KIB = 1024;

describe('assetHrefs', () => {
  it('finds what the HTML fetches before anything has run', () => {
    const html = `
      <link rel="preload" href="/fonts/some-face-v1-latin-400.woff2" as="font" crossorigin />
      <link rel="stylesheet" href="/assets/index.css" />
      <script type="module" src="/assets/index.js"></script>
    `;

    // The typefaces are the whole reason this exists: they are copied out of
    // `public/` and named by hand, so a measurement taken off the bundle alone
    // would miss twenty-five kilobytes every first visit pays for.
    expect(assetHrefs(html)).toEqual(['/fonts/some-face-v1-latin-400.woff2']);
  });

  it('counts a face the HTML declares without preloading it', () => {
    const html = `
      <style>
        @font-face {
          font-family: 'Zen Kaku Gothic New';
          src: url('/fonts/zen-kaku-gothic-new-v18-latin-300.woff2') format('woff2');
        }
      </style>
    `;

    // Otherwise a font becomes free by having its <link> deleted, and whether
    // anything asks for the family is a line of CSS in a component that no
    // build step can see.
    expect(assetHrefs(html)).toEqual(['/fonts/zen-kaku-gothic-new-v18-latin-300.woff2']);
  });

  it('counts a face that is both preloaded and declared exactly once', () => {
    const html = `
      <link rel="preload" href="/fonts/one.woff2" as="font" crossorigin />
      <style>@font-face { src: url('/fonts/one.woff2') format('woff2'); }</style>
    `;

    expect(assetHrefs(html)).toEqual(['/fonts/one.woff2']);
  });

  it('is not fooled by a link that merely mentions preloading', () => {
    const html = '<link rel="modulepreload" href="/assets/room.js" />';

    // A module preloaded for a route nobody has opened is not a first visit's
    // cost, and counting it would make the ceiling meaningless in the direction
    // that matters.
    expect(assetHrefs(html)).toEqual([]);
  });

  it('leaves a preloaded picture out, since a typeface is all the ceiling counts', () => {
    const html = `
      <link rel="preload" href="/fonts/some-face-v1-latin-400.woff2" as="font" crossorigin />
      <link rel="preload" href="/pictures/street.avif" as="image" />
    `;

    // Only `as="font"` links are a first visit's own: a picture preloaded for
    // the same reason a face is would otherwise be charged to a ceiling that
    // was never about pictures.
    expect(assetHrefs(html)).toEqual(['/fonts/some-face-v1-latin-400.woff2']);
  });

  it('finds nothing in an HTML that asks for nothing', () => {
    expect(assetHrefs('<html><body></body></html>')).toEqual([]);
  });
});

/** One face the way index.html writes it: declared, and preloaded or not. */
const face = (href: string, preloaded: boolean): string => `
  ${preloaded ? `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin />` : ''}
  <style>@font-face { src: url('${href}') format('woff2'); }</style>
`;

describe('the faces a first visit does not count', () => {
  const LISTED = '/fonts/listed.woff2';
  const OTHER = '/fonts/other.woff2';
  const list = [LISTED];

  it('counts a preloaded face', () => {
    const html = face(OTHER, true);

    expect(assetHrefs(html, list)).toEqual([OTHER]);
    expect(notCountedHrefs(html, list)).toEqual([]);
  });

  it('counts a declared face that is not preloaded and is not on the list', () => {
    // The old guard: a face does not become free by having its <link> deleted.
    const html = face(OTHER, false);

    expect(assetHrefs(html, list)).toEqual([OTHER]);
    expect(notCountedHrefs(html, list)).toEqual([]);
  });

  it('counts a face on the list that is still preloaded', () => {
    // The list never excuses a preload: the browser fetches the file at once.
    const html = face(LISTED, true);

    expect(assetHrefs(html, list)).toEqual([LISTED]);
    expect(notCountedHrefs(html, list)).toEqual([]);
  });

  it('reports a face on the list that is not preloaded, and does not count it', () => {
    const html = face(LISTED, false) + face(OTHER, true);

    expect(assetHrefs(html, list)).toEqual([OTHER]);
    expect(notCountedHrefs(html, list)).toEqual([LISTED]);
  });

  it('reports a listed face once however often it is declared', () => {
    const html = face(LISTED, false) + face(LISTED, false);

    expect(notCountedHrefs(html, list)).toEqual([LISTED]);
  });

  it('says nothing of a listed face the HTML does not declare', () => {
    expect(assetHrefs('<html></html>', list)).toEqual([]);
    expect(notCountedHrefs('<html></html>', list)).toEqual([]);
  });

  it('holds the latin italic alone', () => {
    expect(NOT_ON_FIRST_VISIT).toEqual(['/fonts/alegreya-sans-v28-latin-400italic.woff2']);
  });

  it('leaves the latin italic of the shipped index.html out of the count and in the report', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

    expect(assetHrefs(html)).toEqual([
      '/fonts/alegreya-sans-v28-latin-400.woff2',
      '/fonts/alegreya-sans-v28-latin-700.woff2',
    ]);
    expect(notCountedHrefs(html)).toEqual(['/fonts/alegreya-sans-v28-latin-400italic.woff2']);
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
    expect(FIRST_VISIT_CEILING_BYTES).toBe(218 * KIB);
  });
});
