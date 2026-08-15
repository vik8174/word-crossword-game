/**
 * Entry point for `packages/shared` — the pure game-logic modules, free of any
 * React or Firebase dependency.
 *
 * The remaining module (`guess-checker`) is added by a later issue (see PRD —
 * GitHub issue #1).
 */
export * from './crossword-generator';
export * from './word-assignment';
export * from './word-list-validator';
