/**
 * Entry point for `packages/shared` — the pure game-logic modules, free of any
 * React or Firebase dependency.
 *
 * The remaining modules (`word-assignment`, `word-list-validator`,
 * `guess-checker`) are added by later issues (see PRD — GitHub issue #1).
 */
export * from './crossword-generator';

/** Kept as the smoke-test import that proves `apps/web` resolves this package. */
export const packageName = 'shared';
