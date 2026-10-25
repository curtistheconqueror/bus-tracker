---
name: fresh-context-review
description: Use this before pushing a change you wrote yourself, before writing a handoff or release note that asserts facts about a diff, and whenever you are about to say "this is done" or "verified". It is a review of your own work from a clean context, reading the diff as if somebody else wrote it. Trigger it especially when the change touched an invariant you designed in the same session, when a claim rests on a count you worked out earlier rather than just re-ran, or when a handler you added calls something whose return value you did not check. The author is the worst reviewer of their own work and the best reviewer of everybody else's, and the difference is context.
---

# Reviewing your own work from a fresh context

## The rule

**You cannot see the assumption you are still holding.** The reason a
second pair of eyes works is not that the second person is smarter — it is
that they do not already believe the thing that made the bug invisible.

So the review has to be done in the posture of someone who was not there:
read the diff, not the intention. Ask what the code does, not what it was
for. Where a fact is asserted, go re-derive it rather than recall it.

## The three shapes this catches

Every self-review miss found in this repository so far has been one of these.

### 1. An invariant you designed and then broke in the same change

You state a rule, build it, and stop testing it because you *know* it holds —
you wrote it.

**Real case.** The DEFERRED work established that a bus cannot be on the Down
Sheet and held back off it at once, and the toggles enforced it. But the Down
Sheet has a `Deferred` workflow of its own writing the same underlying state,
so opening such a repair showed **DEFERRED and DOWN SHEET both ticked** — the
one combination the form refuses to let anybody create. Found by driving the
editor in a browser, not by reading the code that had just been written to
prevent it.

**The question that catches it:** *what else in this codebase writes this same
field?* Not "does my new writer respect the rule" — the other writers are the
ones you forgot.

### 2. A number you worked out once and then quoted

**Real case.** The Version 132 handoff asserted six commits in a range that
held seven. It was caught only by re-running `git log --oneline A..B` and
counting the lines — which is also how the leftover file in the diff finally
had an explanation. A draft that had *reasoned* about the range instead of
re-running it would have shipped the wrong count into a document another tool
publishes from.

**The question that catches it:** *did I run this command just now, or am I
remembering its output?* Re-run it. It costs seconds.

### 3. A call whose result you did not read

**Real case.** `mergeDuplicates` called `persist(...)`, then showed a success
alert and wrote cloud tombstones — unconditionally. `persist` returned early
on a refused write. The result: **42 defects before, 42 after, and a message
saying 21 were merged**, plus 21 tombstones telling the Shop Cloud to drop
records the device still held. Every line of that handler is individually
reasonable. The bug is only visible if you ask what the function it calls
returns.

**The question that catches it:** *what does this return, and what happens if
it fails?* For every call in a handler you just wrote.

## How to run it

Do this after the change works and before you call it done.

**1. Re-read the diff cold.** `git diff` — the whole thing, not the parts you
remember editing. Read it as a stranger's pull request.

**2. For each new call, name the failure branch.** What does it return? Where
does the code go if it fails? If the answer is "it doesn't fail," check.

**3. Re-derive every asserted fact.** Counts, file lists, test totals, "no
other caller does this." Run the command; do not quote yourself. If it is
going into a commit message or a handoff, this is not optional — those are
read by people and tools that cannot check.

**4. Search for the other writers.** For every field or key the change
touches, grep for everything else that writes it. New code respecting a rule
tells you nothing about old code that does not know it exists.

**5. Ask what a reviewer would object to.** Then answer it in a comment, or
fix it. If the honest answer is "they'd ask why this is safe," the comment is
the deliverable.

## The cold read before every code push

**One subagent on the diff, before any push that carries a code change.** Not
when the change looks risky — every time. It is the standing replacement for
the review bot this project used until its trial expired, and it has to hold
that line on its own.

**Hand it the diff and the question. Never your reasoning.** A reviewer given
your conclusion hands it back agreed with, which is the whole failure the
posture exists to avoid.

**Review the whole change against `main`, not `HEAD~1`.** Two of the defects
below are invisible in a single-commit diff: the Shop Talk refused-write bug
was a mismatch between two files written in the SAME commit and only fixed two
commits later, and the false MASTER EXPORT claim was a string in one file
contradicted by another the change never touched. A per-commit diff meets the
letter of the rule and misses that class entirely.

**Every finding gets answered, on the record** — fixed in a named commit, or
declined with the reason written where the next person finds it. A review pass
nobody has to answer satisfies the rule exactly as written and is not a gate.
Declining is a real outcome, not a failure: see below.

**It is additional.** The three gates and the five steps above stay with the
session. `docs/NEXT_SESSION.md` says never let a subagent be the sole witness
to anything going into a commit message or a handoff, and that still holds —
this reviewer is a second reader, never the only one.

Keep it to one. `CLAUDE.md` caps subagents at ten for a reason; a review that
fans out eighty agents costs millions of tokens to learn what one careful pass
finds.

### What deserves more than a diff read

These four were the old triggers for spending a subagent at all. Under an
every-push rule they are no longer about *whether* to review — they mark the
changes where the reviewer should be given the surrounding files too, not just
the diff:

- it touches stored records, or anything a migration would have to undo,
- it crosses more than two files,
- it adds an invariant, or
- it is about to be described in a handoff.

### Why this is a gate, in numbers

Across **two** pull requests the review bot raised **nine** findings on Claude's
own work. **Seven were real defects**, none caught by a green suite:

- Shop Talk cleared the textarea over a REFUSED write, so a blocked
  `localStorage` showed "NOT SAVED" having already destroyed the hazard
  somebody had just typed. The incident form beside it did it correctly, with
  a comment explaining why, written in the same commit.
- That same screen claimed MASTER EXPORT carried its notes. `fleet-backup.ts`
  names its keys explicitly and does not include it.
- The No Heat filter read free text, so a mechanic writing *"Floor heat switch
  checked and working"* put that bus on the winter list. The first fix closed
  only the group match; the five named branches had the same hole.
- The shift tests asserted UTC literals against a function reading local hours:
  green in CI, failing under `TZ=America/Chicago`, this garage's own timezone.
- DAILY STATS fell under AA on hover and focus, three lines below a comment
  naming that exact ratio as too low.
- A loosened test regex accepted the two values it existed to forbid.
- **`CLAUDE.md` asserted a nav badge that did not exist** — a requirement
  written by the same change that added the surface and did not build it. That
  one is the closest precedent to anything you are about to write into these
  files, which is why it is listed rather than left out.

**The other two were declined, and that is the point of writing nine.** One
asked to anonymise Curtis's name in a comment about his own fall; one demanded
a nav badge the documentation had wrongly promised. The reviewer withdrew both
once answered. A reviewer that is right seven times in nine is worth a gate and
is still not an authority — *verify, then fix or decline with the reason on the
record*, which is what those two threads show.

## What this is not

It is not re-running the tests. Tests confirm what you thought to check, and
every case on this page — the three shapes and the seven findings alike —
passed a green suite. It is not reading the code again
with the same assumptions loaded — that is how the assumption survives. The
whole value is in the change of posture, so if you cannot actually drop the
context, at least run the five mechanical steps, which do not depend on it.
