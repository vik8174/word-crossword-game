import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HtmlTagDescriptor, Plugin } from 'vite';

/**
 * What a shared link shows, and whether a search engine may index the site
 * (issue #289).
 *
 * Every path of the app serves the same `index.html`, and a crawler does not
 * run JavaScript, so the card is one for every path: the home page's. A room's
 * words are secret and a room lives a day, so a room has no card of its own.
 *
 * The two sites differ in five things only: the origin, the picture, whether the
 * page says `noindex` or names a canonical address, and what `robots.txt` and
 * `sitemap.xml` say. Everything
 * else in the head is the same, and is written once here.
 */

/** The two deployed sites, by the word `deploy.yml` sets in `ENVIRONMENT`. */
export type SiteName = 'production' | 'stage';

/** What differs between the two sites. */
export interface Site {
  readonly name: SiteName;
  /** The address the site is served from, with no trailing slash. */
  readonly origin: string;
  /** The card, relative to the app's root: one file per site. */
  readonly cardFile: string;
  /** Whether a search engine may index `/`. */
  readonly indexed: boolean;
}

/**
 * The two origins, written in the build and nowhere else (README, "Deployment").
 * A custom domain is a one-line change here and a rebuild. Production is the
 * second Hosting site `across-the-street`; the project's default site,
 * `word-crossword-game-prod.web.app`, serves the same build and points here
 * with its canonical (issue #366).
 */
export const SITES: Readonly<Record<SiteName, Site>> = {
  production: {
    name: 'production',
    origin: 'https://across-the-street.web.app',
    cardFile: 'link-card/production.png',
    indexed: true,
  },
  stage: {
    name: 'stage',
    origin: 'https://word-crossword-game-stage.web.app',
    cardFile: 'link-card/stage.png',
    indexed: false,
  },
};

/** The one line that says what the game is, for a search result and for a card. */
export const DESCRIPTION =
  'A cooperative crossword. You explain your words out loud, your friend guesses them.';

/** The name of the game. */
export const TITLE = 'Across the Street';

/** The card as seen by somebody who cannot see it. */
export const CARD_ALT =
  'Across the Street: two neighbours on facing balconies in a white Andalusian street, with a line strung between them';

/** Where the card is served from, at the root of the build output. */
export const CARD_PUBLISHED_AS = 'link-card.png';

/**
 * Which site a build is for.
 *
 * Only `production` is production. Any other value, an unset variable included,
 * is stage: a stray build, a local one or a CI one, can never claim to be the
 * indexed site.
 *
 * @param environment - The value of `ENVIRONMENT`, as `deploy.yml` sets it
 * @returns The site the build is for
 */
export const siteFor = (environment: string | undefined): Site =>
  environment === 'production' ? SITES.production : SITES.stage;

const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({
  tag: 'meta',
  attrs,
  injectTo: 'head',
});

/**
 * The tags a crawler reads, for one site.
 *
 * @param site - The site being built
 * @returns The tags to add to the head of `index.html`
 */
export const headTags = (site: Site): HtmlTagDescriptor[] => [
  meta({ name: 'description', content: DESCRIPTION }),
  ...(site.indexed ? [] : [meta({ name: 'robots', content: 'noindex' })]),
  // Every path serves this head, so every page's canonical is the root: only `/`
  // is indexed. On production it makes the same build, served from the project's
  // default address, point at the site that is meant to be found.
  ...(site.indexed
    ? [
        {
          tag: 'link',
          attrs: { rel: 'canonical', href: `${site.origin}/` },
          injectTo: 'head' as const,
        },
      ]
    : []),
  meta({ property: 'og:title', content: TITLE }),
  meta({ property: 'og:description', content: DESCRIPTION }),
  meta({ property: 'og:type', content: 'website' }),
  meta({ property: 'og:url', content: `${site.origin}/` }),
  meta({ property: 'og:image', content: `${site.origin}/${CARD_PUBLISHED_AS}` }),
  meta({ property: 'og:image:width', content: '1200' }),
  meta({ property: 'og:image:height', content: '630' }),
  meta({ property: 'og:image:type', content: 'image/png' }),
  meta({ property: 'og:image:alt', content: CARD_ALT }),
  meta({ name: 'twitter:card', content: 'summary_large_image' }),
  {
    tag: 'link',
    attrs: { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    injectTo: 'head',
  },
];

/**
 * The text of `robots.txt`. Stage allows crawling on purpose and relies on
 * `noindex` alone: a `Disallow` would stop a messenger's crawler from fetching
 * the stage card, and Google cannot read a `noindex` on a page it may not crawl.
 *
 * @param site - The site being built
 * @returns The file's text
 */
export const robotsTxt = (site: Site): string =>
  ['User-agent: *', 'Allow: /', ...(site.indexed ? [`Sitemap: ${site.origin}/sitemap.xml`] : [])]
    .join('\n')
    .concat('\n');

/**
 * The text of `sitemap.xml`: the home page, the one page that is indexed.
 *
 * @param site - The site being built
 * @returns The file's text, or `null` for a site that is not indexed
 */
export const sitemapXml = (site: Site): string | null =>
  site.indexed
    ? '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      `  <url><loc>${site.origin}/</loc></url>\n` +
      '</urlset>\n'
    : null;

/**
 * Writes the head, the card, `robots.txt` and `sitemap.xml` for the site named
 * by `ENVIRONMENT`.
 *
 * The card is a committed PNG per site (`link-card/`), copied to the root of
 * the build output as `link-card.png`. A build that cannot find it fails rather
 * than ship a tag that points at nothing.
 *
 * @param options.environment - What `ENVIRONMENT` holds
 * @param options.root - The app's root, where `link-card/` lives
 * @returns A Vite plugin, for builds only
 */
export const linkCard = (options: {
  readonly environment: string | undefined;
  readonly root: string;
}): Plugin => {
  const site = siteFor(options.environment);

  return {
    name: 'link-card',
    apply: 'build',

    transformIndexHtml: {
      order: 'post',
      handler: () => headTags(site),
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: CARD_PUBLISHED_AS,
        source: readFileSync(resolve(options.root, site.cardFile)),
      });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(site) });

      const sitemap = sitemapXml(site);

      if (sitemap !== null) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      }
    },
  };
};
