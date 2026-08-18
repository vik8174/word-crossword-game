# 0007. A stage environment only for the MVP, production later

Status: Accepted, amended by [0020](0020-two-environments-and-a-deploy-that-runs-itself.md)

[0020](0020-two-environments-and-a-deploy-that-runs-itself.md) is the separate decision this one deferred, and it overturns the consequences below: production exists, the deploy matrix is a workflow of its own, and the two sets of build variables are told apart by the GitHub environment they come from rather than by an `_STAGE`/`_PROD` suffix. What stands is the reason stage is called stage, and that it remains a place where things may be broken.

## Context

The project is at MVP stage, with no real users beyond a circle of acquaintances testing it. The Firebase and Sentry projects had not been created yet (issue #2). The question was whether to create them as production resources straight away, or to mark the environment explicitly as temporary.

## Decision

All external services (the Firebase project, the Sentry project) are created now as a **stage** environment, marked explicitly in the name (for example, Firebase project ID `word-crossword-game-stage`, Sentry project `word-crossword-game-stage`). Production is a separate project, to be created as its own decision once a real need appears (public launch, real users beyond the test circle).

## Consequences

- Multi-environment CI/CD is not needed now (production deploys, separate production secrets) — that is deferred until production genuinely exists
- `.env.example` and `.env` in `apps/web` currently describe the stage config only, with no explicit `_STAGE`/`_PROD` suffix in variable names (having exactly one environment makes the suffix redundant today)
- When production arrives it will need: a new Firebase project, a separate Sentry project or environment tag, a deploy matrix added to `.github/workflows/ci.yml`, and a new ADR describing the environment split
