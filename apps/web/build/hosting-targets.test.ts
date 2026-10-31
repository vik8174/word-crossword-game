import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Where a release goes (issue #366).
 *
 * Production is two Hosting sites: `across-the-street`, where the game is found,
 * and `word-crossword-game-prod`, the project's default site, which serves the
 * same build and points at the first with its canonical. A Firebase target can
 * name only one site per project, so `firebase.json` has two entries, `app` and
 * `legacy`, and `deploy.yml` names the ones each environment has.
 *
 * `firebase target` only prints `.firebaserc` and passes on a layout that cannot
 * deploy. These tests run the CLI's own resolution instead, the code `deploy`
 * calls, with the `--only` string read from `deploy.yml`.
 */

// firebase-tools ships no type declarations, so a plain `import` fails `tsc`.
const require = createRequire(import.meta.url);
const { hostingConfig } = require('firebase-tools/lib/hosting/config') as {
  hostingConfig: (options: Record<string, unknown>) => { site: string }[];
};
const { Config } = require('firebase-tools/lib/config') as {
  Config: { load: (options: Record<string, unknown>) => unknown };
};
const { loadRC } = require('firebase-tools/lib/rc') as {
  loadRC: (options: Record<string, unknown>) => unknown;
};

const root = resolve(import.meta.dirname, '../../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

const aliases = (JSON.parse(read('.firebaserc')) as { projects: Record<string, string> }).projects;

/**
 * The `--only` string `deploy.yml` passes for one environment: the value of
 * `only` in the `case` arm that names it.
 */
const onlyFor = (environment: string): string => {
  const arm = new RegExp(`^\\s*${environment}\\) only='([^']+)' ;;$`, 'm').exec(
    read('.github/workflows/deploy.yml'),
  );

  if (arm?.[1] === undefined) {
    throw new Error(`deploy.yml has no --only string for ${environment}`);
  }

  return arm[1];
};

/**
 * The sites the deploy of one environment would publish to, as the CLI
 * resolves them. The resolution takes the project ID, not the alias.
 */
const sitesOf = (environment: string): string[] =>
  hostingConfig({
    config: Config.load({ cwd: root, configPath: resolve(root, 'firebase.json') }),
    rc: loadRC({ cwd: root }),
    project: aliases[environment],
    only: onlyFor(environment),
    cwd: root,
    projectRoot: root,
  })
    .map((entry) => entry.site)
    .sort();

describe('where a deploy publishes the app', () => {
  it('production publishes to across-the-street and to the default site', () => {
    expect(sitesOf('production')).toEqual(['across-the-street', 'word-crossword-game-prod']);
  });

  it('stage publishes to its own site only', () => {
    expect(sitesOf('stage')).toEqual(['word-crossword-game-stage']);
  });
});

describe('the two hosting entries of firebase.json', () => {
  const { hosting } = JSON.parse(read('firebase.json')) as {
    hosting: ({ target: string } & Record<string, unknown>)[];
  };

  it('are named app and legacy', () => {
    expect(hosting.map((entry) => entry.target)).toEqual(['app', 'legacy']);
  });

  it('are equal apart from their target', () => {
    const withoutTarget = hosting.map((entry) => {
      const rest = { ...entry } as Record<string, unknown>;

      delete rest.target;

      return rest;
    });

    expect(withoutTarget).toHaveLength(2);
    expect(withoutTarget[1]).toEqual(withoutTarget[0]);
  });
});
