import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, updateDoc } from 'firebase/firestore';
import { expect, test } from '@playwright/test';

import { createRoom, joinRoom, openPerson } from './support';

const PROJECT_ID = 'demo-across-the-street';

/**
 * Writes `guessedByPlayerId` on one word of a room, with the security rules
 * switched off for this one write.
 *
 * This is how a student's write is simulated rather than made: the rules do not
 * stop a student writing in a lobby today, but #287 will make them, and this
 * scenario must keep working after that. The teacher's deal is what is under
 * test, and it is still refused by `keepsTheWordsFromTheTeacher`.
 */
const markWordGuessed = async (roomId: string): Promise<void> => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: Number(process.env.E2E_FIRESTORE_PORT ?? 8080) },
  });

  try {
    await environment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'rooms', roomId), {
        'words.w0.guessedByPlayerId': 'a-student',
      });
    });
  } finally {
    await environment.cleanup();
  }
};

test.describe('a refused deal (#282)', () => {
  test('is reported on the teacher screen, which never shows the game', async ({ browser }) => {
    const teacher = await openPerson(browser);
    const olena = await openPerson(browser);
    const taras = await openPerson(browser);

    const link = await createRoom(teacher.page, 'Carmen', 'lesson');

    await joinRoom(olena.page, link, 'Olena', /^join the lesson/i);
    await joinRoom(taras.page, link, 'Taras', /^join the lesson/i);
    await expect(teacher.page.getByRole('button', { name: 'Deal the words' })).toBeVisible();

    await markWordGuessed(new URL(link).pathname.split('/').pop() ?? '');

    await teacher.page.getByRole('button', { name: 'Deal the words' }).click();

    await expect(teacher.page.getByText('Could not start the game')).toBeVisible();
    // Nothing was ever shown of the game: the deal was rolled back, not played.
    await expect(teacher.page.getByRole('heading', { name: 'Game room' })).toBeHidden();
    await expect(teacher.page.getByRole('heading', { name: 'Lobby' })).toBeVisible();
  });
});
