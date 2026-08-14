# Changelog

Формат за [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), версіювання за [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Налаштування процесу розробки: ADR, CONTRIBUTING, CI-план (PR #TBD)
- Скаффолдинг репозиторію: pnpm workspace (`apps/web`, `packages/shared`), Vite + React + React Router + MUI, Firebase SDK (env-конфіг), ESLint + Prettier, Vitest з 80% порогом покриття, GitHub Actions CI (lint/test/coverage) ([issue #2](https://github.com/vik8174/word-crossword-game/issues/2))
- `apps/web` імпортує `packages/shared` як workspace-залежність (`shared: workspace:*`), доведено робочим наскрізно: резолвинг модуля, типи TypeScript через межу пакетів, білд і тести — не просто два незалежні пакети поруч
