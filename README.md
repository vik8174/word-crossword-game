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

## Configuration

`apps/web` reads its Firebase/Sentry config from environment variables at build time. Copy the template and fill in real values:

```bash
cp apps/web/.env.example apps/web/.env
```

- `VITE_FIREBASE_*` — from Firebase Console > Project settings > General > Your apps > SDK setup
- `VITE_SENTRY_DSN` — from Sentry > Project Settings > Client Keys (DSN)

`apps/web/.env` is git-ignored — never commit real values.

## Scripts

Run from the repo root (fans out to both workspaces via pnpm):

| Command              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Start the `apps/web` dev server                              |
| `pnpm build`         | Build all workspaces                                         |
| `pnpm lint`          | ESLint + Prettier check across the repo                      |
| `pnpm test`          | Run unit tests (Vitest) for both workspaces                  |
| `pnpm test:coverage` | Run tests with coverage (80% threshold, hard-fails below it) |

## Project Structure

```
word-crossword-game/
├── apps/web/            # React SPA
├── packages/shared/     # Shared types + pure game logic
├── docs/decisions/      # ADRs — architecture decisions
├── CONTRIBUTING.md      # Development process
└── CLAUDE.md            # Context for AI agents working in this repo
```

## Documentation

- Product specification: [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1)
- Architecture decisions: [`docs/decisions/`](docs/decisions/)
- Development process, tests, linting, CI: [`CONTRIBUTING.md`](CONTRIBUTING.md)
