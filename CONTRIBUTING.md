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

## Робочий процес: координатор + воркери

Проєкт ведеться моделлю координатор + воркери (детальніше, включно з правилом визначення власної ролі — [`CLAUDE.md`](CLAUDE.md)):

- **Воркер** — сесія, якій передали конкретний issue. Виконує рівно цей issue до відкритого PR, нічого не планує понад нього, свій PR не мерджить, наприкінці віддає стислий звіт. Модель: Sonnet 5
- **Координатор** — одна окрема сесія, яку Віктор веде сам. Не імплементує тікети, а готує handoff-и, звіряє звіти й вирішує що далі. Модель: Opus 5

Якщо сесії передали issue чи handoff — вона воркер, не координатор.

Проміжні handoff-документи між сесіями лежать у `handoffs/` (в `.gitignore`, не частина історії проєкту) — довговічна пам'ять проєкту це git-історія, issues/PR і `docs/decisions/`.
