import { describe, expect, it } from 'vitest';

import { routePatternOf } from './route-pattern';

describe('routePatternOf', () => {
  it.each([
    ['/', '/'],
    ['/create', '/create'],
    ['/room/abc123', '/room/:roomId'],
    ['/nowhere', '*'],
    ['/room', '*'],
  ])('reports %s as %s, never the address', (pathname, pattern) => {
    expect(routePatternOf(pathname)).toBe(pattern);
  });
});
