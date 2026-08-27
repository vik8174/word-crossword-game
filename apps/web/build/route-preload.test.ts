import { describe, expect, it } from 'vitest';
import { reachableChunks, routeChunkFor, routeChunks, routePreloadScript } from './route-preload';

/** A build's output as this module sees it: chunks and what each one imports. */
const bundle = [
  { fileName: 'index.js', imports: ['react.js', 'mui.js'] },
  { fileName: 'react.js', imports: [] },
  { fileName: 'mui.js', imports: [] },
  { fileName: 'RoomPage.js', imports: ['react.js', 'mui.js', 'firestore.js'] },
  { fileName: 'firestore.js', imports: ['firebase-core.js'] },
  { fileName: 'firebase-core.js', imports: [] },
];

describe('reachableChunks', () => {
  it('follows imports all the way down', () => {
    expect(reachableChunks(bundle, 'RoomPage.js').sort()).toEqual([
      'RoomPage.js',
      'firebase-core.js',
      'firestore.js',
      'mui.js',
      'react.js',
    ]);
  });

  it('survives chunks that import each other', () => {
    const circular = [
      { fileName: 'a.js', imports: ['b.js'] },
      { fileName: 'b.js', imports: ['a.js'] },
    ];

    expect(reachableChunks(circular, 'a.js').sort()).toEqual(['a.js', 'b.js']);
  });
});

describe('routeChunks', () => {
  it('leaves out what the first load already fetches', () => {
    expect(routeChunks(bundle, 'RoomPage.js', 'index.js').sort()).toEqual([
      'RoomPage.js',
      'firebase-core.js',
      'firestore.js',
    ]);
  });

  it('asks for nothing when the route is part of the first load', () => {
    expect(routeChunks(bundle, 'react.js', 'index.js')).toEqual([]);
  });
});

describe('routeChunkFor', () => {
  const built = [
    {
      fileName: 'RoomPage.js',
      imports: [],
      facadeModuleId: '/repo/apps/web/src/pages/RoomPage.tsx',
    },
    { fileName: 'index.js', imports: [], facadeModuleId: null },
  ];

  it('finds the chunk a route was built into', () => {
    expect(routeChunkFor(built, 'src/pages/RoomPage.tsx')?.fileName).toBe('RoomPage.js');
  });

  it('finds it whichever way the platform writes a path', () => {
    const onWindows = [
      {
        fileName: 'RoomPage.js',
        imports: [],
        facadeModuleId: 'C:\\repo\\src\\pages\\RoomPage.tsx',
      },
    ];

    expect(routeChunkFor(onWindows, 'src/pages/RoomPage.tsx')?.fileName).toBe('RoomPage.js');
  });

  it('answers nothing for a route that has no chunk of its own', () => {
    expect(routeChunkFor(built, 'src/pages/CreateRoomPage.tsx')).toBeUndefined();
  });
});

describe('routePreloadScript', () => {
  it('preloads a route only at the addresses it belongs to', () => {
    const script = routePreloadScript([{ prefix: '/room/', hrefs: ['/assets/RoomPage.js'] }]);

    expect(script).toContain('/room/');
    expect(script).toContain('/assets/RoomPage.js');
    expect(script).toContain('location.pathname.startsWith');
    expect(script).toContain("l.rel='modulepreload'");
  });

  it('writes no script when there is nothing to preload', () => {
    expect(routePreloadScript([{ prefix: '/room/', hrefs: [] }])).toBe('');
    expect(routePreloadScript([])).toBe('');
  });
});
