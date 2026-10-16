import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const config = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../firebase.json'), 'utf8'),
) as {
  hosting: { headers: HeaderRule[] };
};
const rules = config.hosting.headers;
const noindexRules = rules.filter((rule) =>
  rule.headers.some((header) => header.key.toLowerCase() === 'x-robots-tag'),
);

/** The sources a rule's pattern lists, e.g. `{/room/**,/create}` is two. */
const sourcesOf = (rule: HeaderRule): string[] => {
  const braces = /^\{(.*)\}$/.exec(rule.source);

  return braces?.[1] === undefined ? [rule.source] : braces[1].split(',');
};

describe('firebase.json X-Robots-Tag', () => {
  it('is noindex, on rooms and on /create', () => {
    expect(noindexRules).toHaveLength(1);
    expect(noindexRules[0]?.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex' }]);
    expect(noindexRules.flatMap(sourcesOf).sort()).toEqual(['/create', '/room/**']);
  });

  it('is on no rule that matches the home page', () => {
    for (const source of noindexRules.flatMap(sourcesOf)) {
      expect(['/', '**', '/**', '!/assets/**']).not.toContain(source);
    }
  });
});
