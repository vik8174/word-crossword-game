import { expect, test } from '@playwright/test';

import { openPerson, startPairGame } from './support';

test.describe('the doors of a room', () => {
  test('an address nobody made says there is no game at it', async ({ browser }) => {
    const visitor = await openPerson(browser);
    const logged: string[] = [];

    visitor.page.on('console', (message) => logged.push(message.text()));
    await visitor.page.goto('/room/no-such-room-at-all');

    await expect(visitor.page.getByText('There is no game at this link')).toBeVisible();
    // The emulator hook announced itself: this build is the e2e one.
    expect(logged).toContain(
      'Firebase: Auth and Firestore are on the local emulators (e2e build).',
    );
  });

  test('a room that has begun refuses a newcomer', async ({ browser }) => {
    const owner = await openPerson(browser);
    const guest = await openPerson(browser);
    const newcomer = await openPerson(browser);

    const { link } = await startPairGame(owner, guest);

    await newcomer.page.goto(link);

    await expect(newcomer.page.getByText('This game has already begun')).toBeVisible();
  });
});
