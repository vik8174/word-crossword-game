import { expect, test } from '@playwright/test';

import { answerWord, endGame, explainedWords, openPerson, startPairGame } from './support';

test.describe('a pair game', () => {
  test('is played from the first word to the last, and finishes on both screens', async ({
    browser,
  }) => {
    const owner = await openPerson(browser);
    const guest = await openPerson(browser);

    await startPairGame(owner, guest);

    const ownerWords = await explainedWords(owner.page);
    const guestWords = await explainedWords(guest.page);

    // One word answered on each side: the guest solves one of the owner's, and
    // the owner one of the guest's.
    const [firstOfOwner, ...restOfOwner] = ownerWords;
    const [firstOfGuest, ...restOfGuest] = guestWords;

    await answerWord(guest.page, firstOfOwner!);
    await expect(
      owner.page.getByRole('button', { name: new RegExp(`^${firstOfOwner!.number} .*answered`) }),
    ).toBeVisible();
    await answerWord(owner.page, firstOfGuest!);

    for (const entry of restOfOwner) {
      await answerWord(guest.page, entry);
    }

    for (const entry of restOfGuest) {
      await answerWord(owner.page, entry);
    }

    await expect(owner.page.getByRole('heading', { name: 'You did it!' })).toBeVisible();
    await expect(guest.page.getByRole('heading', { name: 'You did it!' })).toBeVisible();
  });

  test('ended early by the host, ends on both screens', async ({ browser }) => {
    const owner = await openPerson(browser);
    const guest = await openPerson(browser);

    await startPairGame(owner, guest);
    await endGame(owner.page);

    await expect(owner.page.getByText('This game was ended early')).toBeVisible();
    await expect(guest.page.getByText('This game was ended early')).toBeVisible();
  });

  test('ended early by the guest, ends on both screens', async ({ browser }) => {
    const owner = await openPerson(browser);
    const guest = await openPerson(browser);

    await startPairGame(owner, guest);
    await endGame(guest.page);

    await expect(guest.page.getByText('This game was ended early')).toBeVisible();
    await expect(owner.page.getByText('This game was ended early')).toBeVisible();
  });
});
