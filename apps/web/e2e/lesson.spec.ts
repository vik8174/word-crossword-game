import { expect, test } from '@playwright/test';

import { answerWord, createRoom, endGame, explainedWords, joinRoom, openPerson } from './support';

test.describe('a lesson', () => {
  test('is run by a teacher for two students, and ends with a summary', async ({ browser }) => {
    const teacher = await openPerson(browser);
    const olena = await openPerson(browser);
    const taras = await openPerson(browser);
    const third = await openPerson(browser);

    const link = await createRoom(teacher.page, 'Carmen', 'lesson');

    await joinRoom(olena.page, link, 'Olena', /^join the lesson/i);
    await joinRoom(taras.page, link, 'Taras', /^join the lesson/i);

    // The third is turned away at the door.
    await third.page.goto(link);
    await expect(third.page.getByText('This lesson is full')).toBeVisible();

    await teacher.page.getByRole('button', { name: 'Deal the words' }).click();
    await expect(olena.page.getByRole('heading', { name: 'Game room' })).toBeVisible();
    await expect(taras.page.getByRole('heading', { name: 'Game room' })).toBeVisible();

    // One word answered: Taras solves the first of Olena's.
    const [first] = await explainedWords(olena.page);

    await answerWord(taras.page, first!);
    await expect(
      olena.page.getByRole('button', { name: new RegExp(`^${first!.number} .*answered`) }),
    ).toBeVisible();

    await endGame(teacher.page, 'End the lesson');

    await expect(teacher.page.getByRole('region', { name: 'Lesson summary' })).toBeVisible();
    await expect(teacher.page.getByRole('heading', { name: 'Olena explained' })).toBeVisible();
    await expect(teacher.page.getByRole('heading', { name: 'Taras explained' })).toBeVisible();
    await expect(olena.page.getByText('Carmen ended the lesson')).toBeVisible();
    await expect(taras.page.getByText('Carmen ended the lesson')).toBeVisible();
  });
});
