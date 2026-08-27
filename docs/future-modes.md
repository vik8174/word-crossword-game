# Modes and directions that are not in this release

What the game is meant to become, kept where the next session will actually read it.

This is a file rather than a set of GitHub issues on purpose. The durable memory of this project is three things — the git history, the issues and pull requests, and [`decisions/`](decisions/) — and of those three a file in the repository is the only one an agent opens without going to the network. Nothing here is a commitment or a schedule. Each item says what the idea is and what stands between it and being built, so that whoever picks one up starts from the obstacle rather than from the enthusiasm.

Nothing here is a bug, and none of it is a gap somebody should quietly close on the way past.

## Solo mode

The words are generated rather than typed, and one person plays: they read a clue, they type the answer, the crossword fills in. An ordinary crossword for one.

It is the smallest of the four in ambition and the largest in what it needs that does not exist. Every word in a room today is hidden from a player and explained by another one — that is what `assign-words` decides, what `word-visibility` enforces, and what the security rules are shaped around. A single player has nobody on the other side of that split, so a solo game is not this game with one seat empty: it needs a source of clues, which this project has never had, and it needs the visibility rules to mean something else when there is only one person to hide anything from.

## The fully asymmetric game

One player sees none of the words and the other sees all of them and explains, instead of each holding half.

The room already carries everything for it. The split is `WordAssignment`, an array saying which player each word is hidden from, and every word hidden from the same player is a legal value of it. What has to be decided is not the data but the game: an explainer with nothing to guess sits in front of a full crossword for twenty minutes with nothing to type, which is either the point of the mode or the reason it is no fun, and that question is answered by playing it rather than by reasoning about it. The lobby would also have to let the owner choose, and the choice would have to be part of the room document before the deal.

## A rematch

The two people who just played start another game without going back for the link.

The obstacle is not the button. **A finished room is terminal**, and that is enforced in `firestore.rules` rather than merely respected by the client: a room that has ended stays in the status it ended with, and every write moving it out is refused. `RoomFinished` takes no callbacks at all, and its own comment says why — "It takes no callbacks because there is nothing left to call." A rematch therefore cannot be a room reopening. It has to be a second room, and the first one has to be able to point at it: either a `nextRoomId` field, or a new transition the rules allow, and either way it is a change to the protocol two clients agree on.

There is a second question underneath, and it is the one that will take the time. Two people press a rematch at different moments. Whoever presses first is looking at a room that has ended, waiting for somebody who may never come back — so what do they see, how long do they see it for, and what happens to the room that was created for a game that was never joined? That is a state machine, not a control, and it deserves an ADR and a release of its own.

## Languages other than English

The game is described as a tool for practising a spoken language, and it accepts one alphabet. `word-list-validator` refuses anything that is not Latin, by name, with `word-not-latin`.

Lifting it is more than the validator. The crossword is built on letters as single characters, which the alphabets worth adding next do not all agree with; the font is loaded with a Latin subset because a face carrying Cyrillic as well costs many times the bytes ([0028](decisions/0028-a-design-system-inside-the-mui-theme.md)); and a language that is written right to left is a layout question rather than a validation one. The positioning of the project is already wider than English. The code is not, and this is where that gap is written down instead of being implied.
