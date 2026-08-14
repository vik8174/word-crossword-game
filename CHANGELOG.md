# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Development process setup: ADRs, CONTRIBUTING, CI plan
- Repository scaffolding: pnpm workspace (`apps/web`, `packages/shared`), Vite + React + React Router + MUI, Firebase SDK (env config), ESLint + Prettier, Vitest with an 80% coverage threshold, GitHub Actions CI (lint/test/coverage) ([issue #2](https://github.com/vik8174/word-crossword-game/issues/2))
- CI `Build` job (`pnpm build` for both packages), and the workflow now also runs on `push` to `main`, not only on pull requests ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- `apps/web/src/firebase/config.ts` fails immediately, listing every missing required `VITE_FIREBASE_*` variable, instead of passing `undefined` into `initializeApp` ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- `crossword-generator` module in `packages/shared`: `generateCrossword(words)` builds an intersecting crossword grid and returns the words that did not fit as `unplacedWords` instead of losing them ([issue #3](https://github.com/vik8174/word-crossword-game/issues/3), [ADR 0008](docs/decisions/0008-crossword-layout-library-and-contract.md))
- `apps/web` imports `packages/shared` as a workspace dependency (`shared: workspace:*`), proven working end to end: module resolution, TypeScript types across the package boundary, build and tests — not merely two independent packages sitting side by side

### Changed

- All repository documentation and code comments are written in English
