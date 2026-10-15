import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEW, gameRoom, lessonRoom } from '../components/drawn-room';
import { logGameEvent } from '../telemetry/analytics';
import { useGameCompletion } from './use-game-completion';

vi.mock('../telemetry/analytics', () => ({ logGameEvent: vi.fn(() => Promise.resolve()) }));
vi.mock('./room-service', () => ({ completeGame: vi.fn(() => Promise.resolve()) }));

/** The drawing's words with every one of them answered, on a board that is still `playing`. */
const answered = FEW.map((word) => ({ ...word, isAnswered: true }));

beforeEach(() => {
  vi.mocked(logGameEvent).mockClear();
});

describe('reporting a finished game', () => {
  it('says it was a lesson when the room is one, with the same two counts', async () => {
    renderHook(() => {
      useGameCompletion('room-1', lessonRoom(answered, 7, 9));
    });

    await waitFor(() =>
      expect(logGameEvent).toHaveBeenCalledExactlyOnceWith('game_completed', {
        word_count: 6,
        player_count: 2,
        mode: 'lesson',
      }),
    );
  });

  it('says it was a pair game when the room is one', async () => {
    renderHook(() => {
      useGameCompletion('room-1', gameRoom(answered, 7, 9));
    });

    await waitFor(() =>
      expect(logGameEvent).toHaveBeenCalledExactlyOnceWith('game_completed', {
        word_count: 6,
        player_count: 2,
        mode: 'pair',
      }),
    );
  });
});
