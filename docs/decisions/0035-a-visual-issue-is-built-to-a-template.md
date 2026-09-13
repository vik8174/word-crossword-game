# 0035. A visual issue is built and inspected against a template

Status: Accepted

This reverses the rule recorded in PRD #145: _"Артборд не є критерієм
приймання … Жоден Worker не приймається по «як на макеті»"_ — an artboard is
not an acceptance criterion, and no Worker is accepted against "as on the
mock-up." That rule stays true for what it was written for — the redesign
round, where nothing was accepted except what became a measured number over a
real render — but it left a gap the paragraph below explains, and this ADR
closes it going forward.

## Context

Viktor reviewed release 1.3.0 by hand against the state tree
(https://claude.ai/code/artifact/183ea589-175c-43a9-b8e0-00de519f3a05, source
`handoffs/scenes/tree.template.html`) and found the result far from it. Traced
through the board and the records, the template never reached the pairs that
built and inspected the work, for four separate reasons:

1. **PRD #145 took it out of acceptance on purpose.** Only what became a
   number was required, and what the template showed without a number fell
   out of what a Worker or an Inspector had to match.
2. **The issues did not link it.** Of the visual issues that followed the
   redesign round, only one names the state tree, and only as an illustration
   of a transition rather than as something to build or inspect against.
   Issues were written as a delta from the running code ("Verified on `main`
   …"), not as a distance to the template.
3. **The pairs could not have opened it even if an issue had asked them to.**
   `handoffs/` is git-ignored, so no Worker's or Inspector's worktree ever had
   the file. The artifact is private on claude.ai, and the Inspector has no
   tool that reads it.
4. **Nothing in the roles mentioned a reference at all.** Neither role's file,
   nor the Foreman's packets to either of them, said anything about a
   template, and no Foreman brief and no verdict under `handoffs/verdicts/`
   named one.

So a Worker's and an Inspector's "could not refute it" was true and still
wrong: the Inspector refutes the issue's own criteria, and a criterion that
never said "as the template shows" could not be failed for not looking like
it.

## Decision

**What counts.** An issue is visual when what a player sees changes: layout,
size, colour, type, surface, a state of a control, a screen. A bug that
restores what a template already shows links that template rather than
drawing a new one.

**The template comes first.** The Architect draws it and publishes it as an
artifact, and Viktor approves it. It then lands on `main` in a pull request of
its own, `design/<name>`, which the Architect opens and Viktor merges: a
template is a drawing, not an implementation, and his approval is its review.
Only after that merge is the issue ready. A visual issue with no template on
`main` is not started by the Foreman.

**Where it lives.** Source in `design/templates/<name>.html`, committed. The
artifact is published from the same file, so the two cannot be different
drawings. It covers every width and every state the issue touches.

**The issue links both**, in a section of its own, **Template**: the path on
`main`, the artifact URL, and which states and widths of it this issue builds.

**Building.** The Worker opens the template before writing code and builds to
it. Where the code cannot match it, or the Worker believes the template is
wrong, the Worker stops and says so in the report. That is a disagreement and
goes up, and the template is corrected first. A Worker never ships a quiet
difference.

**Inspecting.** The Inspector serves the template and the branch side by side
and captures both at every width and state the issue names, saved under
`handoffs/verdicts/<issue>/`. A visible difference the issue does not
explicitly allow is a finding. Numbers stay in the issue for what HTML cannot
reproduce: contrast over the picture, translucent surfaces, motion,
`prefers-reduced-motion` (see `.claude/skills/architect/SKILL.md`, "Close
forks before the work, not after," for why). Template and numbers are both
criteria, and neither replaces the other.

**When the two disagree about a fact.** PRD #145's decision comment of
2026-09-10 21:57 records a case where the prototype was wrong and the app was
right (the greeting's seam). This rule does not change that lesson: a template
found wrong is corrected, with Viktor's approval, before the code follows it.

## Consequences

Every visual issue now carries a build cost the redesign round did not: a
template drawn and merged before the Foreman can start it, which is one more
pull request and one more of Viktor's approvals per visual feature rather than
per redesign round. In exchange, a Worker and an Inspector both have a single
committed drawing to build and measure against instead of reconstructing
"what was decided" from issue prose and chat history, and a difference from
that drawing is a finding rather than something neither role had the standing
to raise.

`design/` sits outside `apps/web/`, so no template ships to production; it is
excluded from `prettier --check .` (`.prettierignore`) because reformatting a
drawing would drift it from the artifact built off the same file, and a
drawing is not code to be reformatted.

This does not reopen closed visual issues or rewrite the record: PRD #145 and
the ADRs before this one stay as they are, and issues already merged are not
relinked to a template after the fact.
