import { describe, expect, it } from 'vitest';

import { ROOM_ROUTE_PATTERN, roomPath, roomUrl } from '../rooms/room-link';
import { ROOMS_COLLECTION } from '../rooms/room-document';
import { redactRoomId, redactRoomIdsDeep } from './redaction';

/** A realistic Firestore auto-id — 20 characters, letters and digits mixed. */
const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

describe('redactRoomId', () => {
  it('turns a room path into the route pattern it was built from', () => {
    expect(redactRoomId(roomPath(ROOM_ID))).toBe(ROOM_ROUTE_PATTERN);
  });

  it('keeps the origin of a room link and drops only the id', () => {
    expect(redactRoomId(roomUrl(ROOM_ID, 'https://example.com'))).toBe(
      `https://example.com${ROOM_ROUTE_PATTERN}`,
    );
  });

  it('strips the id ahead of a query string or a fragment', () => {
    expect(redactRoomId(`${roomPath(ROOM_ID)}?ref=chat`)).toBe(`${ROOM_ROUTE_PATTERN}?ref=chat`);
    expect(redactRoomId(`${roomPath(ROOM_ID)}#grid`)).toBe(`${ROOM_ROUTE_PATTERN}#grid`);
  });

  it('strips the id out of a sentence, not only out of a bare path', () => {
    const redacted = redactRoomId(`Joining the room failed: GET ${roomPath(ROOM_ID)} was refused`);

    expect(redacted).not.toContain(ROOM_ID);
    expect(redacted).toBe(`Joining the room failed: GET ${ROOM_ROUTE_PATTERN} was refused`);
  });

  it('strips the id out of a Firestore document path as well as out of an address', () => {
    const redacted = redactRoomId(`No document to update: ${ROOMS_COLLECTION}/${ROOM_ID}`);

    expect(redacted).not.toContain(ROOM_ID);
  });

  it('leaves text with no room id in it alone', () => {
    expect(redactRoomId('/create')).toBe('/create');
    expect(redactRoomId('')).toBe('');
  });

  it('changes nothing the second time it runs', () => {
    const once = redactRoomId(roomUrl(ROOM_ID, 'https://example.com'));

    expect(redactRoomId(once)).toBe(once);
  });
});

describe('redactRoomIdsDeep', () => {
  it('reaches a room id nested in objects and arrays alike', () => {
    const redacted = redactRoomIdsDeep({
      request: { url: roomUrl(ROOM_ID, 'https://example.com') },
      breadcrumbs: [{ data: { from: roomPath(ROOM_ID), to: '/' } }],
    });

    expect(JSON.stringify(redacted)).not.toContain(ROOM_ID);
    expect(redacted.breadcrumbs[0]?.data.to).toBe('/');
  });

  it('keeps the shape and every value that is not a string', () => {
    expect(redactRoomIdsDeep({ level: 'error', wordCount: 7, handled: false, tags: null })).toEqual(
      { level: 'error', wordCount: 7, handled: false, tags: null },
    );
  });

  it('has no depth at which it gives up looking', () => {
    // Far deeper than any event the SDK assembles. A limit would be a place a
    // room id could sit and still be sent, so there is not one.
    const buried = Array.from({ length: 40 }).reduce<Record<string, unknown>>(
      (nested) => ({ nested }),
      { url: roomPath(ROOM_ID) },
    );

    expect(JSON.stringify(redactRoomIdsDeep(buried))).not.toContain(ROOM_ID);
  });

  it('redacts a value reached twice by two different routes, both times', () => {
    const shared = { url: roomPath(ROOM_ID) };

    const redacted = redactRoomIdsDeep({ request: shared, context: { original: shared } });

    expect(JSON.stringify(redacted)).not.toContain(ROOM_ID);
    expect(redacted.context.original.url).toBe(ROOM_ROUTE_PATTERN);
  });

  it('cuts a structure that refers back to itself, rather than sending it whole', () => {
    const event: Record<string, unknown> = { url: roomPath(ROOM_ID) };
    event.itself = event;

    const redacted = redactRoomIdsDeep(event);

    // Keeping the reference would have kept the original object, whose strings
    // are precisely the ones that were never redacted.
    expect(() => JSON.stringify(redacted)).not.toThrow();
    expect(JSON.stringify(redacted)).not.toContain(ROOM_ID);
  });
});
