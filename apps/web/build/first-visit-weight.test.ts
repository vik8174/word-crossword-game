import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assetHrefs,
  declaredFaces,
  FIRST_VISIT_CEILING_BYTES,
  firstVisitWeight,
  LATIN_EXT_CEILING_BYTES,
  latinExtHrefs,
  latinExtTooHeavyReport,
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

/** One face the way index.html writes it: declared, preloaded or not, for a range or for none. */
const ranged = (href: string, preloaded: boolean, range: string | null): string => `
  ${preloaded ? `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin />` : ''}
  <style>@font-face { src: url('${href}') format('woff2');${range === null ? '' : ` unicode-range: ${range};`} }</style>
`;

const LATIN = 'U+0000-00FF, U+0131, U+0152-0153';
const LATIN_EXT = 'U+0100-0130, U+0132-0151, U+0154-02BA';
const VIETNAMESE = 'U+1EA0-1EF9';

describe('the faces counted apart, by the range they are declared for', () => {
  const FACE = '/fonts/face.woff2';
  const notOnList: readonly string[] = [];

  /** Where the one face of `html` is counted. */
  const whereCounted = (html: string, list: readonly string[] = notOnList): string => {
    const places = [
      assetHrefs(html, list).length > 0 ? 'first visit' : null,
      latinExtHrefs(html, list).length > 0 ? 'latin-ext' : null,
      notCountedHrefs(html, list).length > 0 ? 'nowhere' : null,
    ].filter((place) => place !== null);

    return places.join(' and ');
  };

  it('counts a face whose range is wholly beyond the latin one against the second ceiling', () => {
    const html = ranged(FACE, false, LATIN_EXT);

    expect(latinExtHrefs(html, notOnList)).toEqual([FACE]);
    expect(assetHrefs(html, notOnList)).toEqual([]);
    expect(whereCounted(html)).toBe('latin-ext');
  });

  it('counts the fixture range U+1EA0-1EF9 against the second ceiling: it shares nothing with latin', () => {
    // Google's own vietnamese range shares U+0304, U+0308 and U+0329 with the
    // latin one and would land in the first ceiling by this rule, as written.
    expect(whereCounted(ranged(FACE, false, VIETNAMESE))).toBe('latin-ext');
    expect(
      whereCounted(
        ranged(FACE, false, 'U+0102-0103, U+0110-0111, U+0300-0301, U+0303-0304, U+1EA0-1EF9'),
      ),
    ).toBe('first visit');
  });

  it('counts a face whose range shares a code point with the latin one against the first', () => {
    // One code point is enough, wherever in the range it sits.
    expect(whereCounted(ranged(FACE, false, `${LATIN_EXT}, U+0131`))).toBe('first visit');
    expect(whereCounted(ranged(FACE, false, 'U+00FF-0100'))).toBe('first visit');
    expect(whereCounted(ranged(FACE, false, LATIN))).toBe('first visit');
  });

  it('counts a face that declares no range against the first: it covers every letter', () => {
    expect(whereCounted(ranged(FACE, false, null))).toBe('first visit');
  });

  it('counts a preloaded latin-ext face against the first, since a preload fetches it at once', () => {
    expect(whereCounted(ranged(FACE, true, LATIN_EXT))).toBe('first visit');
  });

  it('counts a preloaded face against the first whatever its range says', () => {
    expect(whereCounted(ranged(FACE, true, VIETNAMESE))).toBe('first visit');
  });

  it('counts a face on the list, not preloaded, with the latin range, against neither ceiling', () => {
    // #263's rule comes first: the latin italic is weighed, reported and counted by nothing.
    expect(whereCounted(ranged(FACE, false, LATIN), [FACE])).toBe('nowhere');
  });

  it('counts a face on the list, not preloaded, with a latin-ext range, against neither ceiling', () => {
    expect(whereCounted(ranged(FACE, false, LATIN_EXT), [FACE])).toBe('nowhere');
  });

  it('counts a face on the list that is preloaded against the first, whatever its range', () => {
    expect(whereCounted(ranged(FACE, true, LATIN), [FACE])).toBe('first visit');
    expect(whereCounted(ranged(FACE, true, LATIN_EXT), [FACE])).toBe('first visit');
  });

  it('puts every declared face in one place and no face in two', () => {
    const html =
      ranged('/fonts/a.woff2', true, LATIN) +
      ranged('/fonts/b.woff2', false, LATIN) +
      ranged('/fonts/c.woff2', false, LATIN_EXT) +
      ranged('/fonts/d.woff2', false, VIETNAMESE) +
      ranged('/fonts/e.woff2', false, null) +
      ranged('/fonts/f.woff2', true, LATIN_EXT);
    const list = ['/fonts/b.woff2'];
    const everywhere = [
      ...assetHrefs(html, list),
      ...latinExtHrefs(html, list),
      ...notCountedHrefs(html, list),
    ];

    expect([...everywhere].sort()).toEqual(
      declaredFaces(html)
        .map(({ href }) => href)
        .sort(),
    );
    expect(new Set(everywhere).size).toBe(everywhere.length);
    expect(assetHrefs(html, list)).toEqual(['/fonts/a.woff2', '/fonts/f.woff2', '/fonts/e.woff2']);
    expect(latinExtHrefs(html, list)).toEqual(['/fonts/c.woff2', '/fonts/d.woff2']);
    expect(notCountedHrefs(html, list)).toEqual(['/fonts/b.woff2']);
  });

  it('reads a range out of a minified stylesheet, with no space and a lower-case u', () => {
    const html =
      '<style>@font-face{font-family:Alegreya Sans;src:url(/fonts/m.woff2) format("woff2");unicode-range:u+0132-0151,u+1e00-1e9f}</style>';

    expect(declaredFaces(html)).toEqual([
      { href: '/fonts/m.woff2', range: 'u+0132-0151,u+1e00-1e9f' },
    ]);
    expect(latinExtHrefs(html, notOnList)).toEqual(['/fonts/m.woff2']);
  });

  it('reads the range of the rule it belongs to, not of the one beside it', () => {
    const html =
      ranged('/fonts/one.woff2', false, LATIN) + ranged('/fonts/two.woff2', false, LATIN_EXT);

    expect(declaredFaces(html)).toEqual([
      { href: '/fonts/one.woff2', range: LATIN },
      { href: '/fonts/two.woff2', range: LATIN_EXT },
    ]);
  });

  it('counts a font file named outside any @font-face against the first, as it has no range', () => {
    const html = '<style>.x { background: url(/fonts/loose.woff2); }</style>';

    expect(assetHrefs(html, notOnList)).toEqual(['/fonts/loose.woff2']);
  });

  it('counts a file declared twice where it counts most heavily', () => {
    const html =
      ranged('/fonts/twice.woff2', false, LATIN_EXT) + ranged('/fonts/twice.woff2', false, LATIN);

    expect(assetHrefs(html, notOnList)).toEqual(['/fonts/twice.woff2']);
    expect(latinExtHrefs(html, notOnList)).toEqual([]);
  });

  it('stops the build on a range it cannot read rather than counting the face somewhere', () => {
    expect(() => assetHrefs(ranged(FACE, false, 'U+0100-banana'), notOnList)).toThrow(/banana/);
  });

  it('sends the three latin-ext files of the shipped index.html to the second ceiling, and nothing else', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

    expect(latinExtHrefs(html)).toEqual([
      '/fonts/alegreya-sans-v28-latin-ext-400.woff2',
      '/fonts/alegreya-sans-v28-latin-ext-700.woff2',
      '/fonts/alegreya-sans-v28-latin-ext-400italic.woff2',
    ]);
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

describe('latinExtTooHeavyReport', () => {
  it('says nothing about faces under the ceiling, or exactly on it', () => {
    const files = [{ fileName: 'fonts/a.woff2', gzipBytes: 30 * KIB }];

    expect(latinExtTooHeavyReport(files, 60 * KIB)).toBeNull();
    expect(latinExtTooHeavyReport([{ ...files[0]!, gzipBytes: 60 * KIB }], 60 * KIB)).toBeNull();
  });

  it('adds the faces up, names each and puts the heaviest first', () => {
    const report = latinExtTooHeavyReport(
      [
        { fileName: 'fonts/light.woff2', gzipBytes: 20 * KIB },
        { fileName: 'fonts/heavy.woff2', gzipBytes: 41 * KIB },
      ],
      60 * KIB,
    );

    expect(report).not.toBeNull();
    expect(report).toContain('61.0 KiB');
    expect(report).toContain('60.0 KiB');
    expect(report?.indexOf('fonts/heavy.woff2')).toBeLessThan(
      report?.indexOf('fonts/light.woff2') ?? 0,
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

  it('is joined by a second, for the latin-ext faces, of sixty kibibytes gzipped', () => {
    // Viktor's decision of 2026-10-14, said in bytes for the same reason.
    expect(LATIN_EXT_CEILING_BYTES).toBe(60 * KIB);
  });
});
