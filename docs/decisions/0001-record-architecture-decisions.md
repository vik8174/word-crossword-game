# 0001. Record architecture decisions as ADRs

Status: Accepted

## Context

The project moves forward through successive issues and pull requests, often carried out by separate agent sessions starting from a clean context (see [CLAUDE.md](../../CLAUDE.md)). Without an explicit record of decisions, every new session has to guess "why it was done this way" from scratch, or decisions get lost and are re-made inconsistently.

## Decision

Every architecturally significant or hard-to-reverse decision is recorded as its own file in `docs/decisions/`, following the Nygard format (`docs/decisions/0000-template.md`). Files are numbered sequentially and never deleted — a decision that no longer holds is marked `Superseded by [NNNN]` rather than erased.

## Consequences

Any pull request that makes an architectural change must add or update the corresponding ADR. This slows the process slightly, but makes decisions recoverable for any future agent session or person without additional context.
