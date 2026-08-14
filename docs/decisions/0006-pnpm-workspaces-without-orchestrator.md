# 0006. pnpm workspaces без Turborepo/Nx

Status: Accepted

## Context

Монорепо потребує способу зв'язати `apps/web` і `packages/shared`. Розглядались Turborepo, Nx, і чисті pnpm workspaces без додаткового build-оркестратора.

## Decision

pnpm workspaces без Turborepo/Nx.

## Consequences

- Для MVP-масштабу (2 пакети: `apps/web`, `packages/shared`) оркестратор — зайва конфігурація
- Простіший поріг входу для будь-якої нової агент-сесії, що приєднається до роботи над кодом
- Якщо build-часи чи кількість пакетів зростуть настільки, що це стане проблемою — додати Turborepo можна буде інкрементально, без переписування структури репозиторію
