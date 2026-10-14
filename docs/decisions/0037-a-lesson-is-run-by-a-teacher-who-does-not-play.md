# 0037. A lesson is run by a teacher who does not play

Status: Accepted

## Context

The game exists for spoken English practice, and the person most often in the
room with two learners is their teacher. Viktor asked for a second mode, "two
players plus a spectator", and the grill of 2026-10-14 (design v2, #219) settled
what that third person is.

[ADR 0024](0024-two-players-are-the-product-not-the-algorithm.md) already met a
third person and named them correctly: not a third player but an audience, since
every word is either theirs to read or not theirs at all. It set them aside as "a
different game". This record is that game, and it does not reverse 0024: the
product is still played by exactly two. What changes is that the room may hold a
person who is not a player.

The alternatives considered on the grill:

- **A spectator who arrives third**, by the same link or by a separate watch link.
  Rejected: the person who wants to watch is the teacher, and the teacher arrives
  first, because they choose the words
- **A student creates the room and the teacher joins.** Rejected: the teacher
  chooses the vocabulary of the lesson and is the one who knows both students have
  arrived, which is exactly what the deal needs
- **The mode decided in the lobby**, or inferred from whoever arrives third.
  Rejected: the mode decides who the seats are for, and switching it with a
  student already seated is a new race over a seat
- **One lesson for a whole class**, a teacher watching several pairs on one
  screen. Rejected for now: it is a new entity above the room. A class is run as
  one lesson per pair, one tab each
- **Live typing, manual crediting of a word, hints, a score, a saved history.**
  Each changes the rules or needs data the room does not hold; none is needed for
  a first lesson

## Decision

**A room has a mode, chosen on `/create` and never changed: `pair` or `lesson`.**
`/create` offers it as "Play with a friend" or "Run a lesson".

**In a lesson the owner is the teacher, and the teacher is not a player.**

- The teacher types a nickname and the word list, sends the invite link to two
  students, and deals. Both seats are for the students; the same link serves both,
  and a third arrival finds the room full
- The teacher is kept **outside `players`**, with a nickname and a presence mark of
  their own. So `players` still holds exactly the two who play, and everything
  read from it is unchanged: the seat count, the deal (`assignWords`, random, as
  in a pair game), the freeze after the deal, and the win
- The students see the teacher's nickname, and **Away** beside it when the mark is
  old, in the lobby and in the game. In a lesson only the teacher can deal, so a
  lobby whose teacher left is waiting for nobody, and the mark is how the students
  learn it
- **The teacher sees every word**, with who explains it and who guesses it, and
  which are answered. Not the letters being typed: those are never written to the
  room
- **The teacher's only action in a game is to end it** (`closed`). In a lesson
  the students cannot end it; the lesson ends when the teacher says so. If the
  teacher leaves, the game goes on and the room expires with its lifetime
- **When it ends, the teacher sees a lesson summary**: per student, the words they
  explained and which of those were answered, with no score. It is accurate where
  a per-guesser count is not, because the explainer of a word is
  `hiddenFromPlayerId`'s other player, written once at the deal. The students see
  the ordinary end screens
- Nothing outlives the room. No history, no copy of the summary, no remembered
  word list

## Consequences

- **The owner is no longer always a player.** The glossary's "owner" says so, and
  every place that reads "the owner" as "one of the players" has to be found:
  `keepsTheOwnerIn` in `firestore.rules` holds the owner inside `players`, which a
  lesson must not do, and `isValidStart` lets the owner deal, which stays true
- **The room document gains fields**: the mode, and the teacher's nickname and
  presence mark. [ADR 0009](0009-room-document-schema.md) fixed the shape, so the
  rules' `roomFields()` grows, and a room written before this has no mode and is
  read as `pair`
- **Who may write `closed` depends on the mode.** In a pair game any player
  ([0027](0027-a-game-a-player-can-end.md)); in a lesson the teacher alone. The
  teacher may not write to `words` at all
- **The cheating trade of [ADR 0004](0004-ui-only-word-visibility.md) is
  unchanged.** A student can still read the whole room in DevTools. A lesson is
  played among people who know each other, which is the condition 0004 rests on
- **Telemetry carries the mode** on `room_created`, `game_completed` and
  `game_closed`, so the numbers can say whether anybody runs lessons
- **Every screen of a room now has a teacher's version**: the lobby, the game and
  both endings, plus the choice on `/create`. They are drawn in the design v2
  template before any of them is built, and the lesson is built after the design
  v2 screens, so no screen is built twice
- A class of five pairs costs the teacher five rooms and five copies of the word
  list. That is accepted until lessons are seen being run; a class view is the
  next decision if they are
