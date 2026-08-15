# Word Crossword Game

A cooperative web game for 2-4 players: a crossword where each player explains the words hidden from the others (as in Alias/Taboo), while the rest guess and fill the answers into a shared grid. The MVP targets vocabulary growth and spoken English practice.

## Quick Start

```bash
git clone https://github.com/vik8174/word-crossword-game.git
cd word-crossword-game
pnpm install
cp apps/web/.env.example apps/web/.env  # fill in Firebase/Sentry values, see Configuration below
pnpm dev
```

`pnpm dev` starts `apps/web` (Vite dev server) at http://localhost:5173.

## Tech Stack

- React (Vite + React Router), MUI
- Firebase: Firestore, Anonymous Auth, Analytics, Hosting
- Sentry
- pnpm workspaces (monorepo, no Turborepo/Nx)

## Prerequisites

- Node.js >= 22
- pnpm 10.x (`corepack enable` picks up the version pinned in `package.json`)
- A JDK 21 or newer, only for `pnpm test:rules` — the Firestore emulator runs on the JVM

## Configuration

`apps/web` reads its Firebase/Sentry config from environment variables at build time. Copy the template and fill in real values:

```bash
cp apps/web/.env.example apps/web/.env
```

- `VITE_FIREBASE_*` — from Firebase Console > Project settings > General > Your apps > SDK setup
- `VITE_SENTRY_DSN` — from Sentry > Project Settings > Client Keys (DSN)

`apps/web/.env` is git-ignored — never commit real values.

## Firestore

There is no backend in this project — browsers write to Firestore directly — so `firestore.rules` is the only access control there is.

```bash
pnpm test:rules                                     # check the rules against the emulator
pnpm exec firebase deploy --only firestore:rules    # deploy them (project alias lives in .firebaserc)
```

`firebase-tools` is a dev dependency of the repo, so both commands work after `pnpm install` — no global install needed.

Deleting stale rooms relies on a Firestore **TTL policy** on the `expiresAt` field of the `rooms` collection. The app writes the field; the policy itself is enabled once in the Firebase console (Firestore > TTL policies) and is not part of this repository.

## Hosting

The built app is served from Firebase Hosting, from the same project the database lives in:

```bash
pnpm build                                    # apps/web/dist is what gets uploaded
pnpm exec firebase deploy --only hosting
```

An invite link points straight at `/room/<id>`, a route that exists only in the browser, so `firebase.json` rewrites every path to `index.html`. Without that rewrite an invite opened in a fresh tab is a 404 rather than a room.

Stage is <https://word-crossword-game-stage.web.app>. There is no production project yet — see [ADR 0007](docs/decisions/0007-stage-only-environment.md).

## Scripts

Run from the repo root (fans out to both workspaces via pnpm):

| Command              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Start the `apps/web` dev server                              |
| `pnpm build`         | Build all workspaces                                         |
| `pnpm lint`          | ESLint + Prettier check across the repo                      |
| `pnpm test`          | Run unit tests (Vitest) for both workspaces                  |
| `pnpm test:coverage` | Run tests with coverage (80% threshold, hard-fails below it) |
| `pnpm test:rules`    | Check `firestore.rules` against the Firestore emulator       |

## Project Structure

```
word-crossword-game/
├── apps/web/            # React SPA
├── packages/shared/     # Shared types + pure game logic
├── firestore.rules      # Firestore security rules (the only access control)
├── firestore/           # Emulator checks for those rules
├── docs/decisions/      # ADRs — architecture decisions
├── CONTRIBUTING.md      # Development process
└── CLAUDE.md            # Context for AI agents working in this repo
```

## Documentation

- Product specification: [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1)
- Architecture decisions: [`docs/decisions/`](docs/decisions/)
- Development process, tests, linting, CI: [`CONTRIBUTING.md`](CONTRIBUTING.md)
