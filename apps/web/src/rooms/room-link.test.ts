import { describe, expect, it } from 'vitest';

import { roomPath, roomUrl, ROOM_ROUTE_PATTERN } from './room-link';

describe('room links', () => {
  it('builds the in-app path of a room', () => {
    expect(roomPath('abc123')).toBe('/room/abc123');
  });

  it('builds the shareable link from the origin the app runs on', () => {
    expect(roomUrl('abc123', 'https://example.com')).toBe('https://example.com/room/abc123');
  });

  it('keeps the shareable link on the route the room screen is registered under', () => {
    expect(roomPath('abc123')).toBe(ROOM_ROUTE_PATTERN.replace(':roomId', 'abc123'));
  });
});
