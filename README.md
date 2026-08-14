# Word Crossword Game

Кооперативна веб-гра для 2-4 гравців: кросворд, де кожен гравець пояснює приховані від інших слова (як в Alias/Taboo), а решта вгадують і вписують відповідь у спільну сітку. MVP націлений на розширення словникового запасу та розмовну практику англійської.

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
- pnpm workspaces (монорепо, без Turborepo/Nx)

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
├── packages/shared/     # Спільні типи + чиста ігрова логіка
├── docs/decisions/      # ADR — архітектурні рішення
├── CONTRIBUTING.md      # Процес розробки
└── CLAUDE.md            # Контекст для AI-агентів, що працюють у репо
```

## Documentation

- Продуктова специфікація: [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1)
- Архітектурні рішення: [`docs/decisions/`](docs/decisions/)
- Процес розробки, тести, лінтер, CI: [`CONTRIBUTING.md`](CONTRIBUTING.md)
