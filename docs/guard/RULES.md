# Guard to Sub: scoring rules

The IBJJF scoring model the game uses, **signed off by Joshua on 2026-10-05** except choice 10. The code is
`src/games/guard/rules.ts`; every point value lives there and nowhere else. Quotes below are verbatim
from the rule book (its dashes and typos included), and `rules.test.ts` checks each one against the
book's text on its stated page.

**Source.** IBJJF Rule Book, file `2024JUN_IBJJF_Rules_EN.pdf`, 52 pages, from
<https://ibjjf.com/books-videos>, retrieved 2026-10-05, sha256 `95f559ba…ccb8e0` (full hash in
`rules.ts`). The site labels it "Rule Book (v6.0)" but every page footer says "VERSION 6.1 2024", so we
record 6.1. Printed page numbers match PDF pages. The same page's "Rules Update Guide 2024" changes
nothing in Articles 2 to 5 (its changes are 1.1.4, 6.2.1, 7.1, 8.2.3 and registration rules), so it
isn't cited. The PDF stays out of the repo (`.sources/`, IBJJF's copyright).

## Points

| Event | Points | Clause | Page | When it applies (our summary) |
|---|---|---|---|---|
| Takedown | 2 | 4.1.1 | 18 | starts standing, ends on top; not against an opponent on their knees (4.1.6) |
| Sweep | 2 | 4.6.1 | 23 | from bottom in guard or half guard to top (also 4.6.2, 4.6.3) |
| Guard pass | 3 | 4.2 | 19 | from top in guard or half guard to side control or north-south |
| Knee on belly | 2 | 4.3 | 20 | only once past the guard |
| Mount | 4 | 4.4.1 | 21 | clear of the half guard, facing the head |
| Back mount | 4 | 4.4.1 | 21 | sitting on the back of an opponent lying face down (photo "BACK MOUNT", p.21) |
| Back control | 4 | 4.5 | 22 | hooks in, feet not crossed |

The 2.5.2 table (p.16) lists the same seven: mount, back mount and back control at 4, guard pass at 3,
takedown, sweep and knee on belly at 2. Each event's heading in Article 4 states its points too, and
the tests check those headings.

### The rule book's words

> **4.1.1 Takedown (2 points), p.18.** "When one of the athletes, starting the movement with 2 feet on
> the ground, causes the opponent to land on his/her back, sideways or seated, establishing top
> position for 3 (three) seconds."

> **4.6.1 Sweep (2 points), p.23.** "When the athlete on bottom with the opponent in his/her guard or
> half-guard inverts the position, forcing the opponent who was on top to be on bottom – and maintains
> him/her in this position for 3 (three) seconds."

> **4.2 Guard Pass (3 points), p.19.** "When the athlete in top position manages to surmount the legs
> of the opponent in bottom position (pass guard or half-guard) and maintain side-control or
> north-south position over him/her for 3 (three) seconds."

> **4.3 Knee on Belly (2 points), p.20.** "When the athlete on top and free of the opponent’s guard,
> places the knee or shin(closest to the opponent’s hip) on the opponent’s belly, chest or ribs,
> without the opposite knee touching the ground, maintaining the position stable for 3 seconds, while
> the opponent is lying on his/her back or side."

> **4.4.1 Mount and Back Mount (4 points), p.21.** "When the athlete is on top, clear of the
> half-guard, sitting on the opponent’s torso and with two knees or one foot and one knee on the
> ground, facing the opponent’s head and with up to one arm trapped under his/her leg – and thus
> remains for 3 (three) seconds."
>
> And for back mount: "In the case of the mount, when there is a transition straight from back mount
> to mount or vice-versa —for being distinct positions— athletes shall be awarded four points for the
> first mount and another four points for the subsequent mount, so long as the three-second
> stabilization period was achieved in each position."

> **4.5 Back Control (4 points), p.22.** "When the athlete takes control of the opponent’s back,
> placing his/her heels between the opponent’s thighs without crossing his/her legs and in a position
> to trap up to one of the opponent’s arms without trapping the arm above the shoulder line – and
> thus remains for 3 (three) seconds."

## How events combine in a line

> **3.1, p.17.** "Points shall be awarded by the central referee of a match whenever an athlete
> stabilizes a position for 3 (three) seconds."

> **3.2, p.17.** "Matches should unfold as a progression of positions of technical control that
> ultimately result in a submission hold. Therefore athletes who voluntarily relinquish a position, in
> order to again score points using the same position for which points have already been awarded,
> shall not be awarded points upon achieving the position again."

> **3.4, p.17.** "Athletes shall be awarded cumulative points when they progress through a number of
> point-scoring positions, as long as the three-second positional control from the final
> point-scoring position is a continuation of the positional control from the point-scoring positions
> from earlier in the sequence. In this case, the referee shall count only 3 (three) seconds of
> control at the end of the sequence before signaling the points be scored. Ex: Guard pass followed by
> mount shall add up 7 points (3+4)."

In code: events add up across a line (3.4), and several events in one technique add up too. An event
scores the first time it's reached. After that, only mount, back mount and back control score again,
and only when a technique goes straight from one of them to another (choice 1). Anything else that
returns to a scored position gets 0.

## Modelling choices (1 to 9 signed off 2026-10-05)

1. **Re-scoring the same position.** In a real match it depends on the opponent: if they escape and
   you re-take the position, it scores again; if you step off it yourself to score it again, 3.2
   refuses the points ("voluntarily relinquish a position, in order to again score points"). This game
   has no opponent moves, so every exit is the player's own and a plain return scores 0 (S3, S9). The
   exception is the mount and back family: going straight between mount, back mount and back control
   scores 4 every time, because they're "distinct positions" (4.4.1, explicit for mount and back
   mount). Joshua confirmed it for back control too. *Our reading of 3.2 and 4.4.1, signed off.*
   (S4, S5, S11)
2. **Pass straight to mount (3 + 4?).** Yes, 7, by 3.4's own example: "Guard pass followed by mount
   shall add up 7 points (3+4)." The book doesn't say whether a pass that never reaches side control
   (half guard straight to mount) still earns the 3, since 4.2 asks for side control or north-south.
   *Rule book silent on that case, our choice: 3 + 4.* (S2)
3. **Mount to back (4 again?).** To back mount, yes, explicitly: "four points for the first mount and
   another four points for the subsequent mount" (4.4.1). To back control, also yes, and back again to
   mount scores another 4 (mount, back control, mount is 12). Back mount to back control follows from
   the same reading. *Back control: our reading, confirmed by Joshua.* (S4, S5, S12)
4. **Knee on belly after a pass.** 3 + 2, by 3.4. Knee on belly needs the top player "free of the
   opponent’s guard" (4.3), so it never scores from inside the guard. (S3)
5. **Sweep conditions.** From bottom in guard or half guard to top, held 3 s (4.6.1), or to the back
   of an opponent on all fours (4.6.2), or coming up and putting them down (4.6.3). A sweep that lands
   past the legs, say straight to side control, earns the sweep and no pass, because a pass means the
   top player managed "to surmount the legs of the opponent in bottom position" (4.2), and nobody did.
   The same goes for a takedown landing in side control. A sweep or takedown landing in mount adds the
   mount by 3.4. *Our reading of 4.2 and 3.4.*
6. **Submissions.** Submission is the first way a match is decided: "Match decisions shall be issued
   in the following forms: » Submission" (Article 2, p.15). In the puzzle a submission is a terminal
   move, so the line stops there. It adds no points (the book has no points for one, it simply ends the
   match); for the "reach the named submission" objective (step 5) it's the goal itself. *Points for a
   submission: our choice, 0.*
7. **Advantages and penalties.** Out of scope. Both only break a draw in points: "Advantages: When
   there is a draw in the number of points, the athlete with the most advantage points shall be
   declared the winner. 2.5.4 Penalties: When there is a draw in the number of points and advantage
   points, ..." (2.5.3, p.16). The puzzle's score is points, and an advantage needs a near miss
   (Article 5, p.24), which a line never has.
8. **Stabilisation.** Every technique in a line is assumed to complete and hold for 3 s (3.1), and in
   a chain only the last position needs the hold (3.4). No failed attempts. *Our choice.*
9. **Positions reached while caught in a hold (3.3, p.17).** Out of scope, because the opponent
   doesn't attack in this game, so it never applies.
10. **Stepping down from mount to knee on belly.** *Open, the one choice not yet confirmed.* For now
    knee on belly scores 2 the first time however you get there, because 3.2 only refuses re-taking
    "the same position", and coming back up to mount is a plain return, 0 (S10: 4 + 2 + 0). Against
    that, Gymdesk says "Only moving up the ladder does" score again (about side control and
    north-south), and a jits.gg summary we couldn't open says mount then knee on belly gets 0.

## Game rule, not IBJJF

The mount and back family re-scores without limit, so a line could reach mount and then go back and
forth for 4 points a move (S11). That's correct BJJ but a dead puzzle, since the best line would
always be "get to mount, then spin", and taking the most points now finds it. Step 5's engine adds a
game rule: **each technique can be used once per line.** Mount, back control, mount still scores 12
with two different techniques, but the loop ends when the techniques between those positions run out.
Whether that's enough is what step 5's greedy-gap check measures.

## What the consensus says (checked 2026-10-05)

Reddit was out of reach: its API answers 403 to scripts and the browser extension blocks the site. The
rule book's wording is unchanged since v4 (2019), where the same rules are 3.2, 3.8 and 3.9. What we
could read agrees with the model:

- [Gymdesk](https://gymdesk.com/blog/jiu-jitsu-point-system), citing v6.1: shuffling between side
  control and north-south doesn't score again, and mount to back mount scores 4 for each.
- [Digitsu](https://digitsu.com/v/ibjjf-rules-explanations-transitional-scoring-kristina-barlaan),
  transitional scoring: back mount to mount, each held 3 s, adds another 4.
- jits.gg (blocked to us, seen only through search summaries, so not relied on): knee on belly scores
  again if the opponent escapes and you re-establish it, switching knees doesn't, and mount, back,
  mount, back keeps scoring 4 each time.

## Hand-worked sequences

`rules.test.ts` runs exactly these. One row per technique; "back to side control" and "stand up"
score nothing.

| # | Line | Points | Total | Why |
|---|---|---|---|---|
| S1 | takedown, guard pass, mount | 2 + 3 + 4 | 9 | 3.4 |
| S2 | guard pass straight to mount, one technique | 3 + 4 | 7 | 3.4's example |
| S3 | guard pass, knee on belly, back to side control, knee on belly | 3 + 2 + 0 + 0 | 5 | 3.2 |
| S4 | mount, back mount, mount | 4 + 4 + 4 | 12 | 4.4.1 |
| S5 | mount, back control, mount | 4 + 4 + 4 | 12 | choice 3 |
| S6 | sweep, guard pass, mount, back control | 2 + 3 + 4 + 4 | 13 | 3.4 |
| S7 | sweep, stand up, takedown, guard pass, knee on belly, mount, back mount, back control, guard pass again | 2 + 0 + 2 + 3 + 2 + 4 + 4 + 4 + 0 | 21 | every event once, then a plain repeat |
| S8 | two techniques that score nothing | 0 + 0 | 0 | |
| S9 | mount, step down to side control, mount | 4 + 0 + 0 | 4 | 3.2 |
| S10 | mount, step down to knee on belly, mount | 4 + 2 + 0 | 6 | choice 10, open |
| S11 | mount, back control, mount, back control, mount | 4 + 4 + 4 + 4 + 4 | 20 | the loop the game rule caps |
| S12 | back mount, back control, back mount | 4 + 4 + 4 | 12 | choice 3 |

## What step 4's graph needs from this

- A technique can trigger two events (pass straight to mount), so an edge carries a list of event
  ids, or the graph splits such a move into two edges.
- Takedown edges start standing (4.1.1, and 4.1.6 rules out an opponent on their knees). Sweep edges
  start on bottom in guard or half guard; pass edges start on top in guard or half guard. Knee on belly
  only past the guard; mount only clear of the half guard.
- A takedown or sweep that lands past the legs carries no pass event (choice 5).
- Back mount and back control are separate events, so they're separate nodes if the graph has both.
- Submissions are terminal edges with no event (choice 6).
- An edge into a position that scores as mount, back mount or back control lists that event even when
  it comes from a variant of the same position (technical mount to mount scores 0 but still lists
  `mount`), because scoring knows where you are only through events, and a technique with no event
  counts as stepping off.
- Scoring state for the solver: which events have scored (7 bits) and the event the last technique
  ended on (8 values), 1,024 states.
- Each technique once per line is step 5's engine rule, so technique ids must be unique per edge.
