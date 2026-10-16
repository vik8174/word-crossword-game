import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { expect, test } from '@playwright/test';

import { createRoom, joinRoom, openPerson } from './support';

const PROJECT_ID = 'demo-across-the-street';
/** `AWAY_AFTER_MS` in `rooms/presence.ts` is 45 s; this is inside "45 to 50 s". */
const SILENCE_WHEN_AWAY_MS = 47_000;

/** When the guest's mark was last written, read from the room itself. */
const lastMarkOf = async (roomId: string, guestNickname: string): Promise<number> => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: Number(process.env.E2E_FIRESTORE_PORT ?? 8080) },
  });

  try {
    let millis = 0;

    await environment.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(doc(context.firestore(), 'rooms', roomId));
      const players = Object.values(
        (snapshot.data()?.players ?? {}) as Record<
          string,
          {
            nickname: string;
            lastSeenAt?: { toMillis(): number };
            joinedAt: { toMillis(): number };
          }
        >,
      );
      const guest = players.find((player) => player.nickname === guestNickname);

      millis = (guest?.lastSeenAt ?? guest?.joinedAt)?.toMillis() ?? 0;
    });

    return millis;
  } finally {
    await environment.cleanup();
  }
};

test.describe('presence, in a pair lobby', () => {
  test('the guest going offline shows as away on the owner screen, and clears on return', async ({
    browser,
  }) => {
    const owner = await openPerson(browser);
    const guest = await openPerson(browser);

    // The owner's clock is the one moved: the away line is the owner's screen
    // judging the guest's last mark against its own `Date`, re-read every 5 s.
    await owner.page.clock.install();

    const link = await createRoom(owner.page, 'Vik');
    const roomId = new URL(link).pathname.split('/').pop() ?? '';

    await joinRoom(guest.page, link, 'Bob');
    await expect(owner.page.getByRole('listitem').filter({ hasText: 'Bob' })).toBeVisible();

    const bobRow = owner.page.getByRole('listitem').filter({ hasText: 'Bob' });

    // Give the guest's first mark a moment to land, then cut the guest off.
    await guest.page.waitForTimeout(1500);
    await guest.context.setOffline(true);

    const lastMark = await lastMarkOf(roomId, 'Bob');

    // 40 s after the last mark is still short of `AWAY_AFTER_MS`: not away yet.
    await owner.page.clock.fastForward(Math.max(1000, lastMark + 40_000 - Date.now()));
    await owner.page.waitForTimeout(500);
    await expect(bobRow.getByText(/away for/)).toBeHidden();

    // The owner's clock moves on to 47 s after the guest's last mark.
    await owner.page.clock.fastForward(SILENCE_WHEN_AWAY_MS - 40_000);
    await expect(bobRow.getByText(/away for/)).toBeVisible();

    // The guest comes back, and the owner's clock is set back to the real time,
    // so the guest's fresh mark is judged against the moment it was written.
    await guest.context.setOffline(false);
    await owner.page.clock.setSystemTime(Date.now());
    await expect(bobRow.getByText(/away for/)).toBeHidden({ timeout: 30_000 });
  });
});
