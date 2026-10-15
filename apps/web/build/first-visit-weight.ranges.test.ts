import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assetHrefs, declaredFaces, latinExtHrefs, notCountedHrefs } from './first-visit-weight';

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
