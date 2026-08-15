# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Development process setup: ADRs, CONTRIBUTING, CI plan
- Repository scaffolding: pnpm workspace (`apps/web`, `packages/shared`), Vite + React + React Router + MUI, Firebase SDK (env config), ESLint + Prettier, Vitest with an 80% coverage threshold, GitHub Actions CI (lint/test/coverage) ([issue #2](https://github.com/vik8174/word-crossword-game/issues/2))
- CI `Build` job (`pnpm build` for both packages), and the workflow now also runs on `push` to `main`, not only on pull requests ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- `apps/web/src/firebase/config.ts` fails immediately, listing every missing required `VITE_FIREBASE_*` variable, instead of passing `undefined` into `initializeApp` ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- `crossword-generator` module in `packages/shared`: `generateCrossword(words)` builds an intersecting crossword grid and returns the words that did not fit as `unplacedWords` instead of losing them ([issue #3](https://github.com/vik8174/word-crossword-game/issues/3), [ADR 0008](docs/decisions/0008-crossword-layout-library-and-contract.md))
- `word-list-validator` module in `packages/shared`: turns the raw text of the word-list field into the words a game is built from, plus every reason the list cannot start one — count, length, alphabet and duplicates ([issue #4](https://github.com/vik8174/word-crossword-game/issues/4))
- Room creation, end to end: the owner enters a nickname and a word list, the crossword is generated in the browser, the room is written to Firestore with the owner already in it as its first player, and the owner gets a link to share ([issue #4](https://github.com/vik8174/word-crossword-game/issues/4), [ADR 0009](docs/decisions/0009-room-document-schema.md))
- Words that did not fit into the grid are shown to the owner for approval before the room is created; a word list that yields no grid at all is refused with an explanation instead of becoming an unplayable room ([issue #4](https://github.com/vik8174/word-crossword-game/issues/4))
- Joining a room by its link, end to end: the visitor is signed in anonymously the moment the page opens — before the room is read, as the security rules require — then picks a nickname and is written into the room's `players` map under their own auth id. The screen follows the room live from then on, so the player list fills in as the others arrive ([issue #5](https://github.com/vik8174/word-crossword-game/issues/5), [ADR 0009](docs/decisions/0009-room-document-schema.md))
- The room screen draws the crossword as bare squares, with no letters: the room document holds every word in plain text, and nothing may be shown until words are assigned to players ([issue #5](https://github.com/vik8174/word-crossword-game/issues/5), [ADR 0004](docs/decisions/0004-ui-only-word-visibility.md))
- A link that leads nowhere is explained rather than left blank: an unknown address, a room that was never there or has already been collected, a room past its 24 hours, and a room that already holds four players each say what happened and offer a way on ([issue #5](https://github.com/vik8174/word-crossword-game/issues/5))
- `word-assignment` module in `packages/shared`: `assignWords({ wordCount, playerIds })` deals a crossword's words out among 2-4 players, hiding each word from exactly one of them and spreading them evenly — including who carries the spare when the words do not divide evenly ([issue #6](https://github.com/vik8174/word-crossword-game/issues/6))
- Starting a game, end to end: the owner deals the words out from two players up, the assignment is written into `words.<id>.hiddenFromPlayerId` in one update, and every screen picks the same deal up from its live subscription ([issue #6](https://github.com/vik8174/word-crossword-game/issues/6), [ADR 0010](docs/decisions/0010-letterless-grid-and-private-word-list.md))
- Each player sees the words they have to explain, and only a count of the words hidden from them; the grid stays letterless until a word is guessed, so no word gives away a letter of anyone's own words at an intersection ([issue #6](https://github.com/vik8174/word-crossword-game/issues/6), [ADR 0010](docs/decisions/0010-letterless-grid-and-private-word-list.md))
- `firestore.rules` accept a room moving from `lobby` to `playing` only from its owner and only with at least two players in it, so "the owner starts the game" is no longer the screen's word alone ([issue #6](https://github.com/vik8174/word-crossword-game/issues/6))
- `firestore.rules` and `firebase.json`: anonymous players may create and read rooms but cannot list, delete, or rewrite the crossword of one; `pnpm test:rules` checks the rules against the Firestore emulator ([issue #4](https://github.com/vik8174/word-crossword-game/issues/4))
- CI `Rules` job: `pnpm test:rules` runs the Firestore security-rules tests against the emulator on every pull request, so the rules can no longer be broken by a green build. `firebase-tools` moved into the repo's dev dependencies, so the command needs no global install ([issue #22](https://github.com/vik8174/word-crossword-game/issues/22))
- `apps/web` imports `packages/shared` as a workspace dependency (`shared: workspace:*`), proven working end to end: module resolution, TypeScript types across the package boundary, build and tests — not merely two independent packages sitting side by side

### Changed

- All repository documentation and code comments are written in English
