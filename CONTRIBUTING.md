# Contributing

## Branch → PR → Merge

- Гілки за конвенцією `type/short-description` (`feat/`, `fix/`, `chore/`, `refactor/`, `test/`, `docs/`)
- **Ніколи не комітити напряму в `main`** — виняток лише для першого bootstrap-коміту порожнього репозиторію
- Кожна зміна йде через Pull Request у `main`
- `main` захищений branch protection: прямі пуші заборонені, потрібен PR

## Перед відкриттям PR

1. Самоогляд: `git diff`
2. Код-рев'ю: запустити агента `code-reviewer` (zero-context рев'ю з `~/.claude/rules/code-review.md`), усунути Critical/Important знахідки
3. Локально мають проходити: лінтер, тести, перевірка покриття

## CI (GitHub Actions)

При відкритті/оновленні PR у `main` автоматично запускаються:

- **Lint** — ESLint + Prettier
- **Test** — юніт-тести (Vitest)
- **Coverage** — поріг **80%**, PR не мерджиться нижче порогу

Усі три перевірки — обов'язкові status checks у branch protection. PR не можна змерджити, доки вони не позелені.

> CI-workflow і скрипти (`lint`, `test`, `test:coverage`, `build`) додаються разом зі скаффолдингом проєкту — [issue #2](https://github.com/vik8174/word-crossword-game/issues/2).

## Архітектурні рішення (ADR)

Кожне архітектурно значиме або важко зворотне рішення — окремий файл у [`docs/decisions/`](docs/decisions/) за шаблоном `0000-template.md`. Дивись [ADR 0001](docs/decisions/0001-record-architecture-decisions.md).

Додавай новий ADR у тому ж PR, що вносить архітектурну зміну — не окремим наступним PR.

## Changelog

Кожен user-facing PR додає рядок у `[Unreleased]` секцію [`CHANGELOG.md`](CHANGELOG.md) за форматом [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Робочий процес: координатор + агент-сесії

Проєкт ведеться моделлю координатор + воркери (детальніше — [`CLAUDE.md`](CLAUDE.md)):

- Координаторська сесія не імплементує тікети сама — готує точний контекст і делегує кожен GitHub issue окремій агент-сесії з чистим контекстом
- Агент-сесія виконує issue, і повертає координатору стислий звіт (що зроблено, рішення, стан PR)
- Координатор звіряє звіт, оновлює стан (issue-коментарі, ADR за потреби) і передає наступний issue

Проміжні handoff-документи між сесіями лежать у `handoffs/` (в `.gitignore`, не частина історії проєкту) — довговічна пам'ять проєкту це git-історія, issues/PR і `docs/decisions/`.
