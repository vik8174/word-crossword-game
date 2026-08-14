# 0006. pnpm workspaces without Turborepo/Nx

Status: Accepted

## Context

The monorepo needs a way to link `apps/web` and `packages/shared`. Turborepo, Nx, and plain pnpm workspaces with no additional build orchestrator were considered.

## Decision

pnpm workspaces without Turborepo/Nx.

## Consequences

- At MVP scale (two packages: `apps/web` and `packages/shared`) an orchestrator is configuration without a payoff
- A lower barrier to entry for any new agent session joining work on the code
- If build times or package count grow enough to become a problem, Turborepo can be added incrementally without restructuring the repository
