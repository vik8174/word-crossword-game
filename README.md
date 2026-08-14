# Word Crossword Game

Кооперативна веб-гра для 2-4 гравців: кросворд, де кожен гравець пояснює приховані від інших слова (як в Alias/Taboo), а решта вгадують і вписують відповідь у спільну сітку. MVP націлений на розширення словникового запасу та розмовну практику англійської.

## Quick Start

> Проєкт у стадії скаффолдингу — команди нижче стануть робочими після [issue #2](https://github.com/vik8174/word-crossword-game/issues/2).

```bash
git clone https://github.com/vik8174/word-crossword-game.git
cd word-crossword-game
pnpm install
pnpm dev
```

## Tech Stack

- React (Vite + React Router), MUI
- Firebase: Firestore, Anonymous Auth, Analytics, Hosting
- Sentry
- pnpm workspaces (монорепо, без Turborepo/Nx)

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
