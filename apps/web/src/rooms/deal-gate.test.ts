import { describe, expect, it, vi } from 'vitest';

import { createDealGate } from './deal-gate';
import type { RoomDocument } from './room-document';
import type { StartGameInput } from './room-service';

/** A room is only ever read for its status here, so that is all one is. */
const room = (status: RoomDocument['status']): RoomDocument => ({ status }) as RoomDocument;

const INPUT = { roomId: 'room-1', room: room('lobby') } satisfies StartGameInput;

/** A write that is answered by hand, as the database answers it. */
const unansweredWrite = () => {
  const answers: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  const write = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        answers.push({ resolve, reject });
      }),
  );

  return { write, answers };
};

const shown = () => {
  const rooms: (RoomDocument | null)[] = [];

  return { rooms, deliver: (next: RoomDocument | null) => rooms.push(next) };
};

describe('the deal gate', () => {
  it('passes every room on while no deal is waiting', () => {
    const gate = createDealGate();
    const { rooms, deliver } = shown();
    const [lobby, playing] = [room('lobby'), room('playing')];

    gate.admit(lobby, deliver);
    gate.admit(playing, deliver);
    gate.admit(null, deliver);

    expect(rooms).toEqual([lobby, playing, null]);
  });

  it('keeps a playing room back while the deal is unanswered, and passes the rest on', async () => {
    const { write } = unansweredWrite();
    const gate = createDealGate(write);
    const { rooms, deliver } = shown();
    const lobby = room('lobby');
    void gate.deal(INPUT).catch(() => {});

    gate.admit(room('playing'), deliver);
    gate.admit(lobby, deliver);

    expect(rooms).toEqual([lobby]);
  });

  it('passes the latest kept room on, once, when the deal is confirmed', async () => {
    const { write, answers } = unansweredWrite();
    const gate = createDealGate(write);
    const { rooms, deliver } = shown();
    const [first, last] = [room('playing'), room('playing')];
    const dealing = gate.deal(INPUT);

    gate.admit(first, deliver);
    gate.admit(last, deliver);
    answers[0]?.resolve();
    await dealing;

    expect(rooms).toEqual([last]);
  });

  it('drops the optimistic room of a refused deal, and passes the rollback on', async () => {
    const { write, answers } = unansweredWrite();
    const gate = createDealGate(write);
    const { rooms, deliver } = shown();
    const rolledBack = room('lobby');
    const dealing = gate.deal(INPUT);

    gate.admit(room('playing'), deliver);
    answers[0]?.reject(new Error('refused'));
    await expect(dealing).rejects.toThrow('refused');
    gate.admit(room('playing'), deliver);
    gate.admit(rolledBack, deliver);

    expect(rooms).toEqual([rolledBack]);
  });

  it('drops the optimistic room however the refusal and the room are ordered', async () => {
    const { write, answers } = unansweredWrite();
    const gate = createDealGate(write);
    const { rooms, deliver } = shown();
    const dealing = gate.deal(INPUT);

    // The refusal first, the optimistic room after it, and only then the rollback.
    answers[0]?.reject(new Error('refused'));
    await expect(dealing).rejects.toThrow('refused');
    gate.admit(room('playing'), deliver);

    expect(rooms).toEqual([]);
  });

  it('passes rooms on as before once the rollback has gone by', async () => {
    const { write, answers } = unansweredWrite();
    const gate = createDealGate(write);
    const { rooms, deliver } = shown();
    const dealing = gate.deal(INPUT);

    answers[0]?.reject(new Error('refused'));
    await expect(dealing).rejects.toThrow('refused');
    gate.admit(room('lobby'), deliver);
    const playing = room('playing');
    gate.admit(playing, deliver);

    expect(rooms.at(-1)).toBe(playing);
  });
});
