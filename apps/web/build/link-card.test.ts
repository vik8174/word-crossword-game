import { mkdirSync, mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CARD_ALT,
  DESCRIPTION,
  linkCard,
  robotsTxt,
  SITES,
  siteFor,
  sitemapXml,
} from './link-card';

const webRoot = resolve(import.meta.dirname, '..');

/** A page with nothing in it but what the plugin writes, built for real. */
const buildSite = async (environment: string | undefined, dir: string) => {
  const outDir = join(dir, `out-${environment ?? 'unset'}`);

  await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins: [linkCard({ environment, root: webRoot })],
    build: { outDir, emptyOutDir: true },
  });

  const read = (file: string) => readFileSync(join(outDir, file), 'utf8');
  const has = (file: string) => existsSync(join(outDir, file));

  return { html: read('index.html'), read, has, outDir };
};

/** The `content` of the one tag that matches, or `undefined` when none does. */
const contentOf = (html: string, attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];

describe('link card, built', () => {
  let dir = '';
  let production: Awaited<ReturnType<typeof buildSite>>;
  let stage: Awaited<ReturnType<typeof buildSite>>;
  let unset: Awaited<ReturnType<typeof buildSite>>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'link-card-'));
    writeFileSync(
      join(dir, 'index.html'),
      '<!doctype html><html lang="en"><head><title>Across the Street</title></head><body></body></html>',
    );
    mkdirSync(join(dir, 'public'), { recursive: true });
    production = await buildSite('production', dir);
    stage = await buildSite('stage', dir);
    unset = await buildSite(undefined, dir);
  }, 60_000);

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  for (const name of ['production', 'stage'] as const) {
    describe(name, () => {
      const site = SITES[name];
      const built = () => (name === 'production' ? production : stage);

      it('has the same head, with the values the issue gives', () => {
        const { html } = built();

        expect(contentOf(html, 'name', 'description')).toBe(DESCRIPTION);
        expect(contentOf(html, 'property', 'og:description')).toBe(DESCRIPTION);
        expect(contentOf(html, 'property', 'og:title')).toBe('Across the Street');
        expect(contentOf(html, 'property', 'og:type')).toBe('website');
        expect(contentOf(html, 'property', 'og:image:width')).toBe('1200');
        expect(contentOf(html, 'property', 'og:image:height')).toBe('630');
        expect(contentOf(html, 'property', 'og:image:type')).toBe('image/png');
        expect(contentOf(html, 'property', 'og:image:alt')).toBe(CARD_ALT);
        expect(contentOf(html, 'name', 'twitter:card')).toBe('summary_large_image');
        expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
      });

      it('names absolute og:image and og:url on its own origin', () => {
        const { html } = built();

        expect(contentOf(html, 'property', 'og:image')).toBe(`${site.origin}/link-card.png`);
        expect(contentOf(html, 'property', 'og:url')).toBe(`${site.origin}/`);
      });

      it('names no address of the other site anywhere it writes', () => {
        const other = SITES[name === 'production' ? 'stage' : 'production'];
        const { html, read, has } = built();

        expect(html).not.toContain(other.origin);
        expect(read('robots.txt')).not.toContain(other.origin);

        if (has('sitemap.xml')) {
          expect(read('sitemap.xml')).not.toContain(other.origin);
        }
      });

      it('publishes its own card at link-card.png', () => {
        const { outDir } = built();
        // The file is named here, not read from the table under test, so a swap
        // of the two cards in `SITES` fails this test.
        const expectedFile = {
          production: 'link-card/production.png',
          stage: 'link-card/stage.png',
        }[name];

        expect(site.cardFile).toBe(expectedFile);
        expect(
          readFileSync(join(outDir, 'link-card.png')).equals(
            readFileSync(join(webRoot, expectedFile)),
          ),
        ).toBe(true);
      });
    });
  }

  it('the two sites publish two different cards', () => {
    expect(
      readFileSync(join(production.outDir, 'link-card.png')).equals(
        readFileSync(join(stage.outDir, 'link-card.png')),
      ),
    ).toBe(false);
  });

  it('stage says noindex and production does not', () => {
    expect(stage.html).toContain('<meta name="robots" content="noindex">');
    expect(production.html).not.toMatch(/name="robots"/);
  });

  it('production carries exactly one canonical, the root of across-the-street.web.app; stage none', () => {
    const canonical = (html: string) => html.match(/<link rel="canonical"[^>]*>/g) ?? [];

    expect(canonical(production.html)).toEqual([
      '<link rel="canonical" href="https://across-the-street.web.app/">',
    ]);
    expect(canonical(stage.html)).toEqual([]);
    expect(canonical(unset.html)).toEqual([]);
  });

  it('production names the across-the-street site and never the default one', () => {
    expect(SITES.production.origin).toBe('https://across-the-street.web.app');

    for (const text of [
      production.html,
      production.read('robots.txt'),
      production.read('sitemap.xml'),
    ]) {
      expect(text).not.toContain('word-crossword-game-prod');
    }
  });

  it('a build that is neither is stage, so a stray build is never indexed', () => {
    expect(unset.html).toContain('<meta name="robots" content="noindex">');
    expect(contentOf(unset.html, 'property', 'og:url')).toBe(`${SITES.stage.origin}/`);
    expect(siteFor('anything-else')).toBe(SITES.stage);
    expect(siteFor('')).toBe(SITES.stage);
  });

  it('production writes robots.txt with a Sitemap and a sitemap.xml of one URL', () => {
    expect(production.read('robots.txt')).toBe(
      `User-agent: *\nAllow: /\nSitemap: ${SITES.production.origin}/sitemap.xml\n`,
    );
    expect(production.read('sitemap.xml')).toBe(sitemapXml(SITES.production));
    expect(production.read('sitemap.xml').match(/<loc>/g)).toHaveLength(1);
    expect(production.read('sitemap.xml')).toContain(`<loc>${SITES.production.origin}/</loc>`);
  });

  it('stage writes robots.txt that allows crawling, no Sitemap, and no sitemap.xml', () => {
    expect(stage.read('robots.txt')).toBe('User-agent: *\nAllow: /\n');
    expect(stage.has('sitemap.xml')).toBe(false);
    expect(robotsTxt(SITES.stage)).not.toMatch(/Disallow|Sitemap/);
  });
});

describe('the committed cards', () => {
  for (const name of ['production', 'stage'] as const) {
    it(`${name}.png is 1200 x 630 and at most 300 KB`, () => {
      const png = readFileSync(join(webRoot, SITES[name].cardFile));

      expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
      expect(png.length).toBeLessThanOrEqual(300 * 1024);
    });
  }
});
