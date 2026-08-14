# Word Crossword Game

Кооперативна веб-гра для 2-4 гравців: асиметричний кросворд у стилі Alias/Taboo для практики розмовної англійської. Повна специфікація — [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1).

## Архітектура (коротко)

- React SPA (Vite + React Router, MUI) + Firebase (Firestore, Anonymous Auth, Analytics) + Sentry
- Без власного бекенда — клієнти пишуть напряму в Firestore
- pnpm workspaces: `apps/web`, `packages/shared` (чиста ігрова логіка: `crossword-generator`, `word-assignment`, `word-list-validator`, `guess-checker`)

Чому саме так — див. [`docs/decisions/`](docs/decisions/), особливо [0002](docs/decisions/0002-no-dedicated-backend.md)-[0006](docs/decisions/0006-pnpm-workspaces-without-orchestrator.md).

## Як тут працювати: координатор + агент-сесії

Ця сесія (чи будь-яка сесія, відкрита в корені репо без конкретного issue) — **координатор**:

- Не імплементує тікети напряму. Задача координатора — тримати загальний стан проєкту, обирати наступний issue, готувати контекст, звіряти результати
- Кожен GitHub issue (tracer bullet зі списку в PRD) виконується **окремою агент-сесією з чистим контекстом**
- Після завершення issue агент-сесія повертає координатору стислий звіт: що зроблено, які рішення прийняті (і чи потрібен новий ADR), стан PR
- Координатор приймає звіт, оновлює стан, передає наступний issue

Проміжні handoff-документи — у `handoffs/` (git-ignored). Довговічна памʼять проєкту — git-історія, GitHub issues/PR і `docs/decisions/`; окрема памʼять між сесіями не потрібна.

## Процес розробки

Гілки, код-рев'ю, CI, ADR, changelog — див. [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Тестування

Юніт-тести обов'язкові для чистих модулів `packages/shared` (`crossword-generator`, `word-assignment`, `word-list-validator`, `guess-checker`). Тест перевіряє зовнішню поведінку (вхід → вихід), не деталі реалізації.
