import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { ALLOWED_VIOLATIONS } from './axe-allowlist';
import {
  createRoom,
  endGame,
  finishPairGame,
  joinRoom,
  openPerson,
  startPairGame,
} from './support';

/**
 * Runs axe on the screen as it stands and fails on any `serious` or `critical`
 * violation that is not on the allowlist. Every violation found, listed or not,
 * is printed, so a run shows what the allowlist is holding back.
 */
const expectNoNewViolations = async (page: Page, name: string): Promise<void> => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');

  for (const violation of serious) {
    console.log(
      `AXE ${name} ${violation.id} ${violation.impact} x${violation.nodes.length}: ${violation.help} | ${violation.nodes.map((node) => node.target.join(' ')).join(' ; ')} | ${violation.nodes[0]?.any[0]?.message ?? ''}`,
    );
  }

  const unlisted = serious.filter(
    ({ id }) =>
      !ALLOWED_VIOLATIONS.some(({ rule, page: listed }) => rule === id && listed === name),
  );

  expect
    .soft(
      unlisted.map(({ id, help }) => `${name}: ${id} (${help})`),
      `serious or critical violations on ${name} that are not on the allowlist`,
    )
    .toEqual([]);
};

/**
 * Screens fade in, and a contrast measured mid-fade is the blend of ink and
 * ground, not the screen. Reduced motion puts every screen at rest straight away.
 */
const REST = { reducedMotion: 'reduce' } as const;

test.describe('accessibility, with axe', () => {
  test('Home, Create, the pair lobby, the pair game and Ended early', async ({ browser }) => {
    const owner = await openPerson(browser, REST);
    const guest = await openPerson(browser, REST);

    await owner.page.goto('/');
    await expect(owner.page.getByRole('link', { name: 'Create a game' })).toBeVisible();
    await expectNoNewViolations(owner.page, 'home');

    await owner.page.goto('/create');
    await expect(owner.page.getByLabel(/nickname/i)).toBeVisible();
    await expectNoNewViolations(owner.page, 'create');

    const link = await createRoom(owner.page, 'Vik');

    await joinRoom(guest.page, link, 'Bob');
    await expect(owner.page.getByRole('button', { name: 'Start the game' })).toBeVisible();
    await expectNoNewViolations(owner.page, 'lobby');

    await owner.page.getByRole('button', { name: 'Start the game' }).click();
    await expect(owner.page.getByRole('heading', { name: 'Game room' })).toBeVisible();
    await expectNoNewViolations(owner.page, 'game');

    await endGame(owner.page);
    await expect(owner.page.getByText('This game was ended early')).toBeVisible();
    await expectNoNewViolations(owner.page, 'ended-early');
  });

  test('Finished', async ({ browser }) => {
    const owner = await openPerson(browser, REST);
    const guest = await openPerson(browser, REST);

    await startPairGame(owner, guest);
    await finishPairGame(owner, guest);

    await expect(owner.page.getByRole('heading', { name: 'You did it!' })).toBeVisible();
    await expectNoNewViolations(owner.page, 'finished');
  });
});
