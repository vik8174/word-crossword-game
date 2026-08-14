# 0005. Vite + React Router instead of Next.js

Status: Accepted

## Context

The project is an invite-link game with no public content. Next.js (SSR and routing out of the box) and Vite + React Router (a plain SPA) were both considered.

## Decision

Vite + React Router.

## Consequences

- SEO and SSR add no value to a private invite-only game — Next.js would have added configuration complexity without a payoff
- Simpler and faster development and builds for a pure real-time SPA
- If a public marketing page with SEO needs shows up later, that is a separate app and decision, not a reason to revisit this ADR for the game itself
