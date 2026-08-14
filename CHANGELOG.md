# Changelog

Формат за [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), версіювання за [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Налаштування процесу розробки: ADR, CONTRIBUTING, CI-план (PR #TBD)
- Скаффолдинг репозиторію: pnpm workspace (`apps/web`, `packages/shared`), Vite + React + React Router + MUI, Firebase SDK (env-конфіг), ESLint + Prettier, Vitest з 80% порогом покриття, GitHub Actions CI (lint/test/coverage) ([issue #2](https://github.com/vik8174/word-crossword-game/issues/2))
- CI-джоб `Build` (`pnpm build` для обох пакетів) і запуск workflow на `push` у `main`, не лише на PR ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- `apps/web/src/firebase/config.ts` падає одразу з переліком відсутніх обов'язкових `VITE_FIREBASE_*` змінних замість того, щоб передавати `undefined` у `initializeApp` ([issue #17](https://github.com/vik8174/word-crossword-game/issues/17))
- Модуль `crossword-generator` у `packages/shared`: `generateCrossword(words)` будує сітку кросворду з перетинами й повертає слова, які не влізли, окремим списком `unplacedWords` замість того, щоб їх втрачати ([issue #3](https://github.com/vik8174/word-crossword-game/issues/3), [ADR 0008](docs/decisions/0008-crossword-layout-library-and-contract.md))
- `apps/web` імпортує `packages/shared` як workspace-залежність (`shared: workspace:*`), доведено робочим наскрізно: резолвинг модуля, типи TypeScript через межу пакетів, білд і тести — не просто два незалежні пакети поруч
