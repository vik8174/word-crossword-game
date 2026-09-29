# 0036. A screen is finished on the release issue, not in its parts

Status: Accepted

## Context

On 2026-09-29 `/create` was found standing half drawn on stage, and every part of
the flow had behaved exactly as written.

Viktor's hand review of 1.3.0 (#139) split `/create` across four pieces of work:
the button (#184), the message (#185), the field (#193) and the create panel
(item 9 of the review). Three of them merged. **The fourth was never written as an
issue.** The Architect session that was writing them stopped after one of six and
left no handoff, and the list of what was still to write lived in a comment on
#139 rather than as issues on the board.

Nothing refuted anything, because nothing was wrong at the level where the loop
looks:

- The Inspector on #193 saw the difference and wrote it down: "The app's `create`
  shows two help lines; the template shows one" and "Where the fields stand and
  the panel around them are other issues'". Its own issue put the panel outside its
  boundaries, so it was right not to call it a finding. An Inspector compares what
  its issue names, and that is the behaviour worth keeping.
- The Foreman told Viktor the queue was empty, as `.claude/skills/foreman/SKILL.md`
  tells it to. A notification is a moment. Nothing on the board said the loop had
  stopped, or why, so **fifteen days passed** (last merge `65de8d5` on 2026-09-14,
  noticed 2026-09-29) with `main` deploying a half-drawn screen to stage.

Measured on `main` at `65de8d5`, 1440 x 900: the fields matched #193's criteria to
the pixel (45.5 and 102 tall, text box inset 36 x 12 and 36 x 14), while the band
was 448, 0, 544 x 900 where the template's panel is 490, 274.8, 460 x 350.4; "New
game" was a heading in the window's corner rather than inside the panel; the rules
and the count were two help lines where the template draws one.

**Nothing escaped review.** Two things were invisible: that a screen was half
built, and that the loop had stopped. Each issue owns a part, each Inspector is
right to compare only its part, and so a screen can pass every verdict and still
look half drawn. Completeness of a screen belongs to no issue, so it has to be
recorded somewhere that is not an issue's own body.

Alternatives considered:

- **Widen each Inspector to compare the whole screen.** Rejected. It turns a
  finding about someone else's issue into this issue's defect, which is the
  deadlock the boundaries between issues exist to prevent.
- **Have the Architect write every closing issue up front and trust that they
  exist.** This is what failed: the list lived in one session's context and a
  comment.
- **Read completeness off the release issue's table.** Chosen.

## Decision

**A screen is finished when every issue in its row of the release issue's
"Screens, and what each still needs" table has merged.** That table, on the release
issue for the version being built (#139 for 1.3.0), is the only place that says
when a screen is done. Its rows are screens, and its columns say what has merged into each, what
is still needed, and what the screen looks like today.

**The release is not tagged while any row names an issue that does not exist.**
"Still needed" is a link to a real issue, or it is "nothing". A row that says a
piece is needed and links nothing is exactly the state that lasted fifteen days.

Three rules keep the table true, and they are recorded in the role files:

1. **An issue that leaves its screen mid-build says so.** Where an issue's
   boundaries leave a screen visibly different from its template, its body carries
   a section of its own, **What stays wrong until**, naming the issue that closes
   it. That issue exists on the board before this one starts, even if it is not
   ready to be taken. (`.claude/skills/architect/SKILL.md`)
2. **The Foreman carries that line onto the release issue on merge**, as a comment
   of its own, the way it carries a HITL list. It does not edit issues, so the
   table itself is updated by the Architect, who reads the comment. A closer that
   does not exist is then visible on the release issue the day the first half
   merges. (`.claude/skills/foreman/SKILL.md`, "Merging")
3. **An empty queue is written on the board, not only notified.** Whenever the
   queue empties, the Foreman comments one line on the release issue: what merged
   last, that nothing is takeable, and which seat the board is waiting on. The push
   notification stays, for the phone. (`.claude/skills/foreman/SKILL.md`, "When the
   queue is empty")

`CLAUDE.md` carries rules 1 and 2 as one sentence each in the Architect's and the
Foreman's bullets, and rule 3 with them, so that a rule in a skill file is not a
rule half the sessions never see.

The Inspector is unchanged.

## Consequences

Every issue that leaves a screen mid-build now costs the Architect one more issue
written before it can start, which is the same cost as the drawing 0035 asks for
before a visual issue, and paid in the same place. In exchange a closer that does
not exist is visible on the release issue on the day the first half merges, rather
than fifteen days later, and a stopped queue names the seat it is waiting on.

The board can now say something no verdict says: that a screen is not finished.
That is deliberate. A screen passing every verdict and still standing half drawn is
a fact about the screen, and this decision gives it a place to be read.

The role files change, but `docs/decisions/` before this one does not: earlier
records stay as they are.

**Two halves with different lifetimes.** The role files this repository runs on
(`.claude/skills/architect/SKILL.md`, `.claude/skills/foreman/SKILL.md`, and the
roles material in `CLAUDE.md`) are replaced by the global `arl*` skills and agents
when the project migrates onto them after `v1.3.0` is tagged (#203). Both rules
already exist there. What outlives that migration is this record and the release
issue's table as the place a screen's completeness is read, and this is why the
decision is recorded here and not only in the role files.

A session that is already running does not re-read its skill file. The rules take
effect for sessions started after the merge, and a running Foreman is told them in
one line.
