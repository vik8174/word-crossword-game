import { describe, expect, it } from 'vitest';

import { roomPath } from '../rooms/room-link';
import { pageViewFor } from './page-view';

const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

const browserLocation = (pathname: string, referrer = '') => ({
  origin: 'https://example.com',
  pathname,
  referrer,
});

describe('pageViewFor', () => {
  it('reports a page that is not a room by its own path', () => {
    expect(pageViewFor(browserLocation('/create'))).toEqual({
      location: 'https://example.com/create',
      path: '/create',
      referrer: '',
    });
  });

  it('reports a room without naming which room', () => {
    const pageView = pageViewFor(browserLocation(roomPath(ROOM_ID)));

    expect(pageView.path).not.toContain(ROOM_ID);
    expect(pageView.location).not.toContain(ROOM_ID);
    expect(pageView.path).toBe('/room/:roomId');
  });

  it('drops the query string and the fragment rather than reporting them', () => {
    // Shaped like the real `window.location`, which carries more than a page
    // view is allowed to say — this is what the caller actually hands over.
    const wholeLocation = {
      ...browserLocation('/create'),
      search: '?invited-by=Vik',
      hash: '#words',
    };

    const pageView = pageViewFor(wholeLocation);

    expect(pageView.location).toBe('https://example.com/create');
    expect(pageView.path).toBe('/create');
  });

  it('keeps a room id out of the referrer too', () => {
    const pageView = pageViewFor(browserLocation('/', `https://example.com${roomPath(ROOM_ID)}`));

    expect(pageView.referrer).not.toContain(ROOM_ID);
    expect(pageView.referrer).toBe('https://example.com/room/:roomId');
  });
});
