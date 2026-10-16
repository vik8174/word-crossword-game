import { type Browser, type BrowserContext, expect, type Page } from '@playwright/test';

/** Ten words, the fewest a game takes. */
export const TEN_WORDS =
  'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

/** One person at their own browser: a context of their own, so a sign-in of their own. */
export interface Person {
  readonly context: BrowserContext;
  readonly page: Page;
}

/**
 * Opens a person's browser. Everything that is not the local preview or an
 * emulator is refused: the app's analytics would otherwise reach out to Google
 * with a placeholder key, and a test has no business doing that.
 */
export const openPerson = async (
  browser: Browser,
  options: { readonly reducedMotion?: 'reduce' } = {},
): Promise<Person> => {
  const context = await browser.newContext(options);

  await context.route(
    (url) => url.hostname !== '127.0.0.1',
    (route) => route.abort(),
  );

  return { context, page: await context.newPage() };
};

/** The words one person explains, as the screen lists them: number, direction and the word. */
export interface ExplainedWord {
  readonly number: string;
  readonly direction: string;
  readonly word: string;
}

/**
 * Opens `/create`, picks the kind of room if asked, and creates it.
 *
 * @returns The address of the room, which is what the other people are sent
 */
export const createRoom = async (
  page: Page,
  nickname: string,
  kind: 'pair' | 'lesson' = 'pair',
): Promise<string> => {
  await page.goto('/create');

  if (kind === 'lesson') {
    await page.getByRole('radio', { name: /a lesson/i }).click();
  }

  await page.getByLabel(/nickname/i).fill(nickname);
  await page.getByLabel(/words/i).fill(TEN_WORDS);
  await page.getByRole('button', { name: /create/i }).click();
  await page.waitForURL(/\/room\//);

  return page.url();
};

/** Opens a room link and joins it under a nickname. */
export const joinRoom = async (
  page: Page,
  link: string,
  nickname: string,
  button: RegExp = /^join/i,
): Promise<void> => {
  await page.goto(link);
  await page.getByLabel(/nickname/i).fill(nickname);
  await page.getByRole('button', { name: button }).click();
};

/** The words listed under "You explain", read off the screen. */
export const explainedWords = async (page: Page): Promise<ExplainedWord[]> => {
  const buttons = page.getByRole('list', { name: 'You explain' }).getByRole('button');

  await expect(buttons.first()).toBeVisible();

  const labels = await buttons.evaluateAll((all) =>
    all.map((button) => button.getAttribute('aria-label') ?? ''),
  );

  return labels.map((label) => {
    const match = /^(\d+) (across|down), (.+)$/.exec(label);

    if (match === null) {
      throw new Error(`Not a word button: ${label}`);
    }

    return { number: match[1] ?? '', direction: match[2] ?? '', word: match[3] ?? '' };
  });
};

/**
 * Types one word into the grid of the person who guesses it.
 *
 * The cursor is picked by the word's button in "You guess". A square of the word
 * that is already a letter (it crosses a word the guesser explains, or one they
 * have answered) is not an input, and the cursor steps over it, so only the
 * letters of the squares that are inputs are typed. Which those are is read off
 * the grid: the word starts at the square numbered for it and runs along its
 * direction.
 */
export const answerWord = async (guesser: Page, entry: ExplainedWord): Promise<void> => {
  const slot = new RegExp(`^${entry.number} ${entry.direction}, \\d+ letters, still to answer`);
  const start = await guesser
    .locator(`[aria-label^="Number ${entry.number}, Row"]`)
    .first()
    .getAttribute('aria-label');
  const place = /Row (\d+), column (\d+)/.exec(start ?? '');

  if (place === null) {
    throw new Error(`No square is numbered ${entry.number}`);
  }

  const row = Number(place[1]);
  const column = Number(place[2]);
  const letters: string[] = [];

  for (const [index, letter] of [...entry.word].entries()) {
    const at =
      entry.direction === 'down' ? { row: row + index, column } : { row, column: column + index };
    const isInput = await guesser
      .locator(`input[aria-label*="Row ${at.row}, column ${at.column} "]`)
      .count();

    if (isInput > 0) {
      letters.push(letter);
    }
  }

  await guesser
    .getByRole('list', { name: 'You guess' })
    .getByRole('button', { name: slot })
    .click();
  await expect(guesser.locator('input:focus')).toBeVisible();
  // The click moves the cursor twice (the square taking focus, then the word's
  // first empty one), and a letter typed in between is lost. The cursor is React
  // state with no attribute to wait on, so the focus is given a moment to settle.
  await guesser.waitForTimeout(500);
  await guesser.keyboard.type(letters.join(''), { delay: 120 });
  // The last word of a game ends it, and the list this button is in goes with the
  // screen: so the ending is as good an answer as the button.
  await expect(
    guesser
      .getByRole('list', { name: 'You guess' })
      .getByRole('button', { name: new RegExp(`^${entry.number} ${entry.direction}, .*answered`) })
      .or(guesser.getByRole('heading', { name: 'You did it!' })),
  ).toBeVisible();
};

/** Starts a pair game: the owner creates, the guest joins, the owner deals. */
export const startPairGame = async (
  owner: Person,
  guest: Person,
): Promise<{ readonly link: string }> => {
  const link = await createRoom(owner.page, 'Vik');

  await joinRoom(guest.page, link, 'Bob');
  await owner.page.getByRole('button', { name: 'Start the game' }).click();
  await expect(owner.page.getByRole('heading', { name: 'Game room' })).toBeVisible();
  await expect(guest.page.getByRole('heading', { name: 'Game room' })).toBeVisible();

  return { link };
};

/** Ends a game from the screen of whoever is asked: the header button, then its confirmation. */
export const endGame = async (page: Page, control = 'End the game'): Promise<void> => {
  await page.getByRole('button', { name: control }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End it' }).click();
};

/** Answers every word of a started pair game, on both screens, until it finishes. */
export const finishPairGame = async (owner: Person, guest: Person): Promise<void> => {
  const ownerWords = await explainedWords(owner.page);
  const guestWords = await explainedWords(guest.page);

  for (const entry of ownerWords) {
    await answerWord(guest.page, entry);
  }

  for (const entry of guestWords) {
    await answerWord(owner.page, entry);
  }
};
