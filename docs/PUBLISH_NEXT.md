# Publish next

**STATUS: SEVEN RELEASES PENDING ON `main` — application release 198, from `2ee1bb5`; 199, from `a3b8158`; 200, from `24752d3`; 201, from `c96635a`; 202, from `759f591`; 203, from `076f7ae`; and 204, from `be6ddd4`. NOT PUBLISHED.** Each sits on top of the one before; **publish `be6ddd4` (release 204), which carries all seven.** 204 patches exactly the two failures Codex found on `076f7ae` and nothing else. Curtis, 2026-11-22: *"Patch exactly these two cases … stop when these two pass so Dots can finish and publish it live. No other changes beyond these two."* Curtis approved merging PRs 51, 52, 53, 54 and 55 on 2026-11-20 ("Yes, merge all five"); they are merged into `main`. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 194 / application release 197, deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Rollback for 198: Sites 194 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.

7 releases are pending. PR39 MCP remains separately held and unmerged, excluded from this release. The 197 queue as published: `docs/archive/PUBLISH_RELEASE_197.md`.

| Release | What it is | State |
| --- | --- | --- |
| 204 | Exactly the two failures on `076f7ae`: a second matching card placed first cannot take the original repair; "Did JD move this bus?" is a question | On `main`, pending publication — **publish this; it includes 198 to 203** |
| 203 | A repeat save updates the same repair (no duplicate, no doubled hours); a question about a past move is not an order | On `main`, pending publication; two failures in Codex's check, fixed in 204 |
| 202 | The two checks 201 failed: the right mechanic is credited AFTER the save, and "When do these buses move?" prepares no move | On `main`, pending publication; failed Codex's repeat-save check, fixed in 203 |
| 201 | The two things Codex held 200 back for: "Who moves this bus?" no longer brings up a move, and ADD TO THAT ENTRY will not carry a FINISHED repair into an entry signed off by somebody else | On `main`, pending publication; failed two of Codex's checks, fixed in 202 |
| 200 | ADD TO THAT ENTRY keeps the repairs already typed into a new entry | On `main`, pending publication |
| 199 | The AI Operator moves buses when told "Moves buses … to CNG West" or "Buses … to CNG West", instead of asking which status to apply | On `main`, pending publication |
| 198 | Reopening the last page at real phone speeds; the log-a-defect pickers without the keyboard; one BUS box; the symptom list opening itself; the Down Sheet ticks moved up; leaving a bus out of a shared Defects Logged list; ADD TO THAT ENTRY fixed; a Shop Cloud pull that did not finish is asked for again | On `main`, pending publication |

## 204 — the two failures on 076f7ae, and nothing else

### Source

Release source: `be6ddd4`. Previous: `b957ceb`, the commit that queued 203. Run at `be6ddd4`:

```
$ git log --oneline b957ceb..be6ddd4
be6ddd4 Release 204: the two failures on 076f7ae, and nothing else
```

```
$ git diff --name-only b957ceb..be6ddd4 -- app src tests
src/lib/down-sheet/down-sheet-sync.ts
src/lib/operator/operator-engine.ts
tests/down-sheet.test.mjs
tests/operator.test.mjs
```

```
$ git diff --shortstat b957ceb..be6ddd4
 4 files changed, 51 insertions(+), 4 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only b957ceb..be6ddd4 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None.

### What was wrong, and what changed

1. **A second matching card placed first took over the original repair.**
   - **What happened:** a card had taken over a Defect Log record. A second card for the same repair was then put ahead of it on the entry, and the next save handed the record to the new card. The record changed owner and was credited to whoever signed the new card.
   - **Change** (`down-sheet-sync.ts`, `defectTargets`): a record a card on the entry has taken over is set aside before any card is matched, so no other card can adopt it. Its owner finds it by its stamp. The second card becomes its own repair.
   - Once the owning card is no longer on the entry, the record is matched as it always was. That includes an entry from before repair cards, whose card id is made afresh on every read; the first draft of this fix duplicated those, and the existing test caught it.
2. **"Did JD move this bus?" prepared a move for confirmation.**
   - **What happened:** the run-on reading took "JD move this" for an order after a remark.
   - **Change** (`asksAboutMove`): "did" (or "didn't"), then who did it, then the move word, is always a question. It is checked before the run-on reading. "Did it get fixed move 17563 to CNG West" and "Did you check it, move 17563 …" are still orders.

### Verified

- `npm test` on Windows — **481 pass, 0 fail**. `npm run lint` — no error. Type-check 238, as 203.
- **Two new tests, each failing on `076f7ae` and passing on `be6ddd4`:**
  - `tests/down-sheet.test.mjs`, "a second matching card placed first does not take over the original repair or its credit". The original card finishes the logged repair under JD with 3 hours. A second matching card is put first, finished, and the entry is signed MK. The original record keeps its owner, JD and 3 hours; the second card is its own repair with 2 hours. With the original still open, the second card's FINISHED neither closes it nor credits MK.
  - `tests/operator.test.mjs`: "Did JD move this bus?", "Did JD move this bus to CNG West?", "Did JD move 17563 to CNG West?" and "Did the porter move 17563 to CNG West?" prepare nothing, each with no context, a remembered bus and a remembered group.
- Every reviewer case file was re-run against release 200's engine, and the result is unchanged from 203. Every order that moved on 200 still moves, except "Do I / How do I move …", which are meant as questions. No question prepares a move 200 did not.
- **Not done:** no cold read of 204 and no phone. Curtis asked to stop when these two pass.

### What to check once it is live

1. The two checks above, in the app. Then the checks for 203 and earlier below.

### Rollback

Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`, while nothing after 197 is live.

## 203 — a repeat save updates the same repair, and a past move is not an order

### Source

Release source: `076f7ae`. Previous: `a853111`, the commit that queued 202. Run at `076f7ae`:

```
$ git log --oneline a853111..076f7ae
076f7ae Release 203: a repeat save updates the same repair; a past move is not an order
```

```
$ git diff --name-only a853111..076f7ae -- app src tests
src/lib/defects/repair-catalog.ts
src/lib/down-sheet/down-sheet-sync.ts
src/lib/operator/operator-engine.ts
tests/down-sheet.test.mjs
tests/operator.test.mjs
```

```
$ git diff --shortstat a853111..076f7ae
 5 files changed, 131 insertions(+), 10 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only a853111..076f7ae -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently. A defect record gains an optional field, `sheetCard`, written only when a Down Sheet card takes over a record the Defect Log already had. It rides the Shop Cloud in the defect's existing `detail` column, the way every field outside the named columns already does, so there is no schema change. Records already duplicated on a device by the old behaviour are not cleaned up by this release.

### What was wrong

Both found by Codex's check of 202, which kept 202 off the live site.

1. **Reopening and saving a Down Sheet repair linked to the Defect Log duplicated it, and 3 hours read as 6.**
   - A card that matches a fault already open in the Defect Log takes that record over on its first save. That is deliberate, so the bus does not carry the same fault twice.
   - But it only takes over an **open** record. Once the card had finished the repair, the record was closed, so the next save no longer recognised it as the card's own and made a second record under the card's id, with the same hours.
   - Measured on 202's code: finished with 3 hours on the first save, saved again, and the bus carried two completed "Engine / Overheating" records of 3 hours each.
   - This is older than 198; it was not introduced by ADD TO THAT ENTRY, though carrying finished repairs across makes it easier to hit.
2. **Questions about past moves read as orders.** "put" is spelled the same in the past, so "Was 17563 put in CNG West?", "17563 got put in CNG West?", "When we put 17563 in CNG West did it go out of service?" and "Yesterday who put 17563 in CNG West?" each prepared a move.

### What changed

1. **A repeat save writes to the same record** (`down-sheet-sync.ts`).
   - When a card takes over a Defect Log record, the save stamps the record with that card (`sheetCard`). Every later save, from any screen, finds the record by that stamp and writes back to it.
   - The hours are therefore replaced, never added: a figure corrected from 3 to 3.5 reads 3.5.
   - **The Defect Log still owns a record the sheet took over.** The record keeps its own name and details: renamed in the Defect Log, the next sheet save does not put the old name back. Once it is fixed in the Defect Log, a sheet save with that card still unticked leaves it fixed, by whoever fixed it, with their hours. A cold read found that the first version of this fix re-opened it.
   - A record one card holds is never taken by another card on the same entry. A new card put ahead of it becomes its own repair, so the 3 hours are not counted twice that way either.
   - Mechanic credit is unchanged from 202, and only the repair being saved is touched. A repair finished in a save is credited to what FIXED BY showed. A repair finished earlier keeps its name. Other repairs on the bus are not written at all.
   - The narrow ADD TO THAT ENTRY safeguard from 201 is kept as it was.
2. **A move that has already happened is asked about, never ordered** (`asksAboutMove`). Only the shapes that cannot be an order count:
   - "put" straight after was / were / got / been, or after one of them and the bus: "Was 17563 put …", "17563 got put …", "Were these buses put …".
   - "we" or "they" straight before "put", after when / after / since / who / why or after "the buses": "When we put 17563 in CNG West did it go out of service?", "The buses we put in CNG West, are they out of service?".
   - "already put", or a bus, "put", and "already" at the end: "17563 put in CNG West already?".
   - "Somebody put 17563 in CNG West?", with a question mark on that clause.
   - "who" / "why" straight before the move word: "Can you tell me who put 17563 …".
   - **Orders still move.** A cold read found the first version of these rules refusing real orders, and they are all in the test now: "Move 17563 to CNG West, it came in last night", "Just put 17563 in CNG West already", "17563 is fixed so just put it in CNG West", "When you put 17563 in CNG West mark it out of service", "Someone put 17563 in CNG West".
   - **Left:** "Put 17563 in CNG West yesterday?" still prepares a move, because it reads as an order. It needs APPLY CHANGE like any proposal.

### Verified

- `npm test` on Windows — **480 pass, 0 fail**. `npm run lint` — no error. Type-check 238, as 202.
- **Repeat saves, run in the test suite** (new test).
  - A card linked to an open Defect Log record, finished with 3 hours, saved three times, leaves **one** record of **3** hours credited to JD. On 202's code the same test finds two records.
  - Open on the first save, finished on the second, corrected to 3.5 on the third: one record, 3.5 hours.
  - Two cards on one entry stay two records, 4 hours between them.
  - Fixed in the Defect Log by MK with 2 hours, then the sheet saved: it stays fixed, MK, 2 hours.
  - Renamed in the Defect Log: the name stays.
  - A new card put ahead of the linked one: two records, 3 hours, not 6.
- **Repeat saves, run through the real screen** on the dev server, before the last two refinements above (which leave a finished card's path unchanged). Bus 17507 carried an open Defect Log record "Engine / Overheating". Its Down Sheet entry had that repair finished with 3 hours, assigned to JD. The entry was opened from its row and SAVE UPDATE pressed, three times. After each save the stored board held one record, completed, 3 hours, JD.
- **Questions about past moves:** 27 more phrasings are in the test, each run with no context, a remembered bus and a remembered group, and none prepares a move. Twenty-five orders using "put" or naming a time are in the test, and all move.
  - Every reviewer's case file from 201 and 202 was re-run against release 200's engine: 534 commands, 570 questions.
  - Every command that moved on 200 still moves, except "Do I move …" and "How do I move …", which are meant as questions.
  - No question prepares a move that 200 did not.
- A cold read of the first version of 203 found the Defect Log and past-tense problems above. Each is fixed and in the test. No fresh reviewer read the final version.
- **Not verified:** on a phone.

### What to check once it is live

1. Pick a bus with an open defect in the Defect Log and put it on the Down Sheet with the same repair. Tick it FINISHED, put 3 in its hours, and save. Open the entry again and save it again. The Defect Log and Fixed Repairs should show that repair **once**, with 3 hours.
2. In the AI Operator, ask "Was 17563 put in CNG West?" (any bus number). It should not propose a move. "Put 17563 in CNG West" should; do not apply it unless the bus belongs there.
3. The checks for 202 and earlier below.

### Rollback

Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`, while nothing after 197 is live.

## 202 — the two checks 201 failed: credit after the save, and "When do these buses move?"

### Source

Release source: `759f591`. Previous: `afd596d`, the commit that queued 201. Run at `759f591`:

```
$ git log --oneline afd596d..759f591
759f591 Release 202: credit after the save, and "When do these buses move?"
```

```
$ git diff --name-only afd596d..759f591 -- app src tests
src/lib/down-sheet/down-sheet-sync.ts
src/lib/operator/operator-engine.ts
tests/down-sheet.test.mjs
tests/operator.test.mjs
```

```
$ git diff --shortstat afd596d..759f591
 4 files changed, 225 insertions(+), 9 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only afd596d..759f591 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently. Nothing already saved is rewritten: the change decides the name written when a repair is finished from now on.

### What was wrong

Both found by Codex's release check of 201, which kept 201 off the live site.

1. **A finished repair linked to a defect still credited the wrong mechanic.** When a save finished a repair, `applyDownEntryToFleet` credited the entry's FIXED BY first, then **the name already on the linked record**, and only then the entry's assigned mechanic. A Down Sheet card that adopts an OPEN record from the Defect Log (an exact repeat of a fault already logged) inherits whatever name that record held. So a repair finished on JD's entry, with FIXED BY showing JD, was saved as fixed by MK. 201's ADD TO THAT ENTRY check compared JD with JD and let it through; the wrong name came from the save, not from the transfer.
2. **"When do these buses move?" still prepared a move.** 201 deliberately left when / where / how out of its question rule, because they open clauses in dictated commands ("When you get a chance move 17563 to CNG West"). With a group of buses remembered from the last answer, "When do these buses move to CNG West?" became a move of both. "Will these buses move …" and "Can 17563 move …" did the same.

### What changed

1. **The name a finished repair is saved under is the name FIXED BY showed** (`down-sheet-sync.ts`).
   - A repair finished in this save is credited to the entry's FIXED BY, else its assigned mechanic, which is exactly what the form's FIXED BY box shows.
   - When the form showed nobody (a vendor job), nobody is credited. A name on an OPEN record is not a completion.
   - A repair **already completed** before this save keeps the name it was completed under, ahead of the entry's FIXED BY. That includes no name: a vendor repair stays unnamed. Before, MARK FIXED on the row stamped a FIXED BY on the entry, and that re-credited every repair finished earlier to whoever closed the entry. The cold read measured it.
   - **One trade, written down.** Correcting a typo in an entry's FIXED BY no longer rewrites repairs already finished. Correct a finished repair's name on that repair, in Fixed Repairs.
2. **How the clause opens decides it, not how the bus is named** (`asksAboutMove`). Six cold reads kept finding a bus or a person named some way a list of phrasings missed. So the rule reads the clause that holds the move word, ended by a full stop, question mark, semicolon, colon or comma (not the comma between two bus numbers). It looks at how that clause opens, and what sits between the opening and the move word:
   - **who / what / which / why / do / does / did** — a question.
   - **when / where / how + a helping verb** (do, can, will, should …), and **how soon / long / many / much** — a question: "When do these buses move", "When do the buses on the road move …", "How soon will 17563 move".
   - **when / where / whether / if + a bus, anywhere before the move word** — a question: "Any idea when these buses move …", "Can you tell me when these buses move …", "If 17563 moves to CNG West will it be out of service". "When you get a chance move 17563 …" names a person and "When the shift starts move 17563 …" names no bus, so both stay commands.
   - **"they" with nothing after the move word means the buses**: "Will they move to CNG West tonight?" is a question. "Can they move 17563 …" asks people and moves.
   - **can / could / will / should + a BUS** (a number, "bus", "these", "this one", "it") — a question: "Can this bus move", "Can buses 17563 and 17534 move". **Anybody else asked** — "you", "they", "JD", "the porter", "the night shift", or no subject at all — is a request, and it moves, as it always has.
   - **is / are / was / were** — a question only in "supposed / going / gonna / ready / set / cleared / allowed / due to move" or "is there room / are there any … to move". Otherwise the move word is a command run on without punctuation: "Is 17563 done move it to CNG West", "Where is 17563 move it …".
   - **Always a command:**
     - a remark, a comma, then the command: "Do it, move 17563 to CNG West", "Who's on it, move 17563 …";
     - "and move" / "then move";
     - a move word with its bus right after it, following a word that could not be asking it: "Does 17563 have parts move it to CNG West", "Who cares move 17563 …", "What a day, move 17563 …";
     - "Do move …", "Do me a favor move …", "Why not move …", "Never mind, move …", "Don't forget to move …";
     - "Don't move …" and "Never move …" are refused instead.
   - A question about one bus is now told *"That reads as a question, so nothing was prepared. To move Bus 17563, say it as an instruction …"*, as several buses already were.
   - **Judgement calls, written down:**
     - "Can 17563 move to CNG West?", "Do I move 17563 to CNG West?" and "How do I move 17563 …" read as questions. "Can you move 17563 …" moves.
     - Questions that ask permission or advice still prepare a proposal, which needs APPLY CHANGE, as they did in 200: "Should I move …", "Is it ok / safe / time to move …", "Is there a reason to move …".

### Verified

- `npm test` on Windows — **479 pass, 0 fail**. `npm run lint` — no error. Type-check 238, as 201.
- **Credit after the save, run end to end** (new test, `tests/down-sheet.test.mjs`). It takes the bus with an open Defect Log record "Engine / Overheating" holding MK, and JD's entry on the sheet. It runs the ADD TO THAT ENTRY rule (JD with JD: allowed), the page's merge, then `applyDownEntryToFleet`, and reads the name off the saved record:
  - The record is completed and credited to **JD**. On 201's code the same test reads **MK**, so it reproduces what Codex found.
  - A FIXED BY typed on the entry (PB) outranks both. A vendor job credits nobody. Handing the entry to PB and saving again leaves JD's finished repair as JD's. So does MARK FIXED closing the entry under PB, while the brake repair finished at that moment is PB's. A vendor repair finished with no name stays unnamed when the entry is later closed under PB. The other direction (finished under MK, into JD's entry) is refused before any save.
- **Questions:** 103 question phrasings propose no change, each run with no context, with a remembered bus, and with a remembered group, and 81 commands still move. Most of both lists came from six cold reads.
  - Every reviewer's case file was run against release 200's engine and this one: 534 commands and 570 questions.
  - Every command that prepared a move on 200 still does, except "Do I move …" and "How do I move …", which are meant to be questions now.
  - No question prepares a move that did not on 200, and no question about when, where or whether buses move prepares one in any context. The 33 that still prepare a proposal are permission and advice questions ("Should I …", "Is it ok / safe / time to …"), each needing APPLY CHANGE as in 200.
  - The sixth cold read's findings were answered by re-running its own case files, which are among those above. No fresh reviewer read this final version.
  - On 201's engine, with a group remembered, "When do these buses move to CNG West?" and "Will these buses move to CNG West?" each gave a bulkMove of both buses, and "Can 17563 move to CNG West?" a move. Now none does.
  - The 41-case comparison against 200's engine from 201's review, re-run: every difference is a question or a "don't move", and every command behaves as in 200.
- **Not verified:** on a phone, and not re-run in the browser. Both changes are below the screen: the save's choice of name, and the operator's reading of a sentence. No screen changes in 202.

### What to check once it is live

1. On the Down Sheet, pick a bus with an open defect in the Defect Log, and put it on the sheet assigned to a mechanic. Add a card for that same defect, tick it FINISHED and save. On Fixed Repairs, the repair should show the entry's mechanic (or its FIXED BY), not anybody else.
2. In the AI Operator, ask something that lists buses, then "When do these buses move to CNG West?" It should not propose a move. "Move these buses to CNG West" should; do not apply it unless they belong there.
3. The checks for 201 and earlier below.

### Rollback

Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`, while nothing after 197 is live.

## 201 — the two holds on 200: a question is not a move, and one FIXED BY per entry

### Source

Release source: `c96635a`. Previous: `1c7e539`, the commit that queued 200. Run at `c96635a`:

```
$ git log --oneline 1c7e539..c96635a
c96635a Release 201: a question is not a move, and one FIXED BY per entry
```

```
$ git diff --name-only 1c7e539..c96635a -- app src tests
app/down-sheet/_components/down-sheet-editor.tsx
app/down-sheet/down-sheet.css
src/lib/down-sheet/down-sheet-repair-items.ts
src/lib/operator/operator-engine.ts
tests/down-sheet.test.mjs
tests/operator.test.mjs
```

```
$ git diff --shortstat 1c7e539..c96635a
 6 files changed, 170 insertions(+), 6 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 1c7e539..c96635a -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently. `completedBy` was already written on every Down Sheet entry that has a FIXED BY; the editor's type now says so.

### What was wrong

Both found by Codex while verifying 200, which it held off the live site.

1. **"Who moves this bus?" brought up a move proposal.** 199 taught the AI Operator that dictation writes "Move" as "Moves", so "Moves buses 17563 and 17564 to CNG West" is a command. It read every "moves" that way, questions included.
2. **A FINISHED repair could be credited to the wrong mechanic.** A Down Sheet entry has one FIXED BY (or, when that is empty, its assigned mechanic), and saving credits every finished repair on the entry to that name. Since 200, ADD TO THAT ENTRY carries the repairs typed into a new entry across. A repair ticked FINISHED under MK, carried into an entry signed off by JD, would be saved as fixed by JD.

### What changed

1. **A move word in a question is not a move, in any form** (`asksAboutMove`). The engine reads the sentence that holds the move word.
   - That sentence asks when it opens on who, what, which or why, or on did / does / didn't / doesn't. It still asks when a filler like "so", "ok", "quick question" or "tell me" comes first.
   - A move told not to happen ("Don't move …", "Do not move …") is not a move either.
   - Such a sentence proposes nothing: no move, no "add", no status, and no batch of moves across ";" or ",".
   - **What still moves:**
     - Requests: "Can you move bus 17563 to CNG West?", "Is it possible to move …", "Do me a favor and move …".
     - Commands with a clause opened by when / where / how: "When you get a chance move 17563 to CNG West".
     - A command after a question in its own sentence: "Where is 17563? Move it to CNG West".
     - The question mark alone decides nothing, because dictation adds one to "Moves buses … to CNG West?", which is a command.
   - **How the rule was narrowed.** Two cold reads shaped it. The first version caught too little ("So who moves …", "Who can move …", "Did anyone move …"). The second, broader version caught any question word before the verb and refused ordinary dictated commands like the ones above. A refused command costs more than a question turned into a proposal, which can still be declined, so the rule is narrow.
   - A question that names several buses is now told *"That reads as a question, so nothing was prepared. To move 17563, 18507, say it as an instruction …"*, naming the place it asked about. Before, it was asked for a status.
2. **ADD TO THAT ENTRY refuses only the conflicting case** (`finishedSignoffConflict`). It refuses when a repair carried across is FINISHED and the two entries' sign-offs differ. The new entry stays exactly as typed, and a line under the orange notice says why. It offers two ways out that credit the right person: untick FINISHED to add the repair to that entry, or finish every repair here and save it as its own entry. A fully finished entry saves as Completed, which the one-active-entry-per-bus check allows. The line goes as soon as the conflict does and does not come back without a press. Unfinished repairs carry as before.
   - **This is a new on-screen message, so it is a UI change.** Codex proposed it; Curtis was told before it was built.
   - The second cold read noted the save also falls back to the device's default initials, which the check does not. So an unsigned new entry can be refused against an entry signed with those same initials. That errs toward refusing, never toward the wrong name; left.
   - A different mechanic on each repair would be a larger change and is not attempted. The cold read noted one case this does not touch: changing an existing entry's FIXED BY still re-credits every repair already finished on it. That is the one-sign-off design as it was before this release.

### Verified

- `npm test` on Windows — **478 pass, 0 fail**, including new cases:
  - Twenty-seven question phrasings propose no change, each run with and without a bus remembered from the last turn, while fifteen commands still move. Most of both lists came from the two cold reads.
  - The second reviewer's 41-case comparison against 200's engine, re-run on the final rule: every command behaves as in 200. Every difference is a question or a "don't move" that used to produce a proposal and now does not.
  - Run against the engine as it stood in 200, "Who moves it to CNG West?" with a remembered bus gives a move plan, so the test reproduces what Codex saw.
  - The sign-off rule (`finishedSignoffConflict`) is **run** across eleven cases, not matched as text. `npm run lint` — no error. Type-check 238, two fewer than 200: the two it no longer reports were the editor's FIXED BY box reading a field the type did not declare.
- Dev server, one entry seeded: 17507, Brakes, assigned to mechanic JD. ADD DOWN BUS, Engine / Overheating ticked FINISHED, FIXED BY MK, bus 17507, ADD TO THAT ENTRY:
  - The press was refused with the line *"A repair here is marked FINISHED by MK, and Bus 17507's entry is signed off by JD …"*, and the form was unchanged.
  - Unticking FINISHED and pressing again carried it across as Defect 2.
  - On a second run, changing FIXED BY to JD cleared the line, and the press carried it with FIXED BY JD.
- **Not verified:** on a phone. Also not re-run in the browser: the message's final wording and its staying gone after FINISHED is ticked again. Both came after the browser run and are held by tests.

### What to check once it is live

1. In the AI Operator, "Locate bus <n>", then "Who moves it to CNG West?" It should not propose a move. Then "Moves bus <n> to CNG West" should still propose one; do not apply it unless the bus belongs there.
2. On the Down Sheet, ADD DOWN BUS. Type a repair, tick it FINISHED, and put your initials in FIXED BY. Pick a bus already on the sheet that is assigned to somebody else. Tap ADD TO THAT ENTRY: it should refuse, saying why, and leave your entry as it was. Untick FINISHED and tap again: it should carry across.
3. The checks for 200 and 199 below.

### Rollback

Release 200 at `1c7e539`, if 200 is live. Otherwise release 199 at `be290af`, if live. Otherwise Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.

## 200 — ADD TO THAT ENTRY keeps the repairs already typed

### Source

Release source: `24752d3`. Previous: `be290af`, the commit that queued 199. Run at `24752d3`:

```
$ git log --oneline be290af..24752d3
24752d3 Down Sheet: repairs typed before ADD TO THAT ENTRY are kept
```

```
$ git diff --name-only be290af..24752d3 -- app src tests
app/down-sheet/_components/down-sheet-editor.tsx
app/down-sheet/page.tsx
tests/down-sheet.test.mjs
```

```
$ git diff --shortstat be290af..24752d3
 3 files changed, 26 insertions(+), 14 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only be290af..24752d3 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently.

### What was wrong

Found by Codex while verifying 199. On the Down Sheet's ADD DOWN BUS, a repair typed into the new entry before pressing **ADD TO THAT ENTRY** was dropped. The existing entry opened with a blank card instead.

### What changed

The repairs typed into the new entry come across, added after the existing entry's own. The blank card appears only when nothing was typed. This applies only to a **new** entry: an existing entry whose bus is changed to one already on the sheet carries nothing, as before. A cold read found that otherwise its repairs would be copied onto the other bus.

### Verified

- `npm test` on Windows — **478 pass, 0 fail**. `npm run lint` — no error. Type-check 240, the same as 199.
- Dev server, one entry seeded (17507, Brakes / Brake chamber leak). ADD DOWN BUS, then Engine / Overheating on the card, then bus 17507, then ADD TO THAT ENTRY. The form showed both repairs. SAVE UPDATE stored one entry for 17507 holding both, with no alert. With nothing typed, it showed the entry's repairs and one blank card, as before.
- **Not verified:** on a phone.

### What to check once it is live

1. On the Down Sheet, tap ADD DOWN BUS. Pick a category and repair on the card, then pick a bus that is already on the sheet.
2. Tap **ADD TO THAT ENTRY**. The bus's existing repairs and the one you typed should all show. Save. The entry should hold all of them.
3. The AI Operator check from 199 below.

### Rollback

Release 199 at `be290af`, if 199 is live; otherwise Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.

## 199 — the AI Operator moves buses however the move is said

### Source

Release source: `a3b8158`. Previous: `eaf1c32`, the commit that queued 198. Run at `a3b8158`:

```
$ git log --oneline eaf1c32..a3b8158
a3b8158 AI Operator: "Moves buses ... to CNG West" moves them, without asking for a status
```

```
$ git diff --name-only eaf1c32..a3b8158 -- app src tests
src/lib/operator/operator-engine.ts
tests/operator.test.mjs
```

```
$ git diff --shortstat eaf1c32..a3b8158
 2 files changed, 98 insertions(+), 4 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only eaf1c32..a3b8158 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently.

### What was wrong

Curtis told the AI Operator *"Moves buses 17563, 34, 18507,17514, 18508, 17558, 44, 15514, 17560, 17540, and 18505 to CNG West"* and it answered *"Tell me which status to apply to those buses."* — twice. It only recognised the word "move", not "moves", so it did not see a move at all and fell through to asking for a status.

### What changed

- "Moves", "sends", "puts", "places" and the like count as move words, as "move" always did.
- A command that is only bus numbers, "to" or "into", and a place — *"Buses 17563 34 18507 to CNG West"* — is a move.
- "out if service" reads as Out of Service, which is how dictation hears it.
- **No status question on a move.** A bus put in CNG West or East is marked Out of Service by the app's own rule, exactly as when it is dragged on the map. That rule was already there; the operator simply never reached it.
- Questions and defect notes that mention a place stay what they are. A cold read of the first version found several turning into moves, and each case is now a test.

### Verified

- `npm test` on Windows — **478 pass, 0 fail**. `npm run lint` — no error. Type-check 240, the same as 198.
- Curtis's two messages, word for word, plus four other phrasings, each produce a move to CNG West. Applied, all 11 buses land in CNG West as Out of Service.
- Old against new on 85 commands, including the reviewer's: 68 answer exactly as before; the 17 that differ are all intended moves.
- **Not verified:** through the operator screen on a phone. The parser and the move were run directly.

### What to check once it is live

1. Open the AI Operator and type or dictate *"Moves buses …"* with two or three bus numbers *"… to CNG West"*. It should show a change to apply, not ask about status.
2. Apply it. The buses should be in CNG West, marked Out of Service.
3. Try *"Buses … to CNG West"* with no verb. Same result.

### Rollback

Release 198 at `eaf1c32`, if 198 is live; otherwise Sites 194 / release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.

## 198 — five merged PRs

### Source

Release source: `2ee1bb5`, the head of `main` below the commit that updates this file. Previous: `19f0e90`, which recorded the 197 release.

The four blocks below were run at `2ee1bb5`.

```
$ git log --oneline 19f0e90..2ee1bb5
2ee1bb5 Merge claude/down-sheet-add-to-entry (PR 55) on Curtis's go
4cb3173 Merge claude/log-defect-flow (PR 54) on Curtis's go
f2afe36 Merge claude/log-defect-pickers (PR 53) on Curtis's go
15dcbb1 Merge claude/logged-share-leave-out (PR 52) on Curtis's go
fce33e3 Merge claude/resume-ready-on-mount (PR 51) on Curtis's go
d8f0115 Leave out: the count badge holds still at three-digit totals too
d235554 Down Sheet: the new card is scrolled into view after ADD TO THAT ENTRY
4acf963 Pickers: answers to the SDET re-gate of PR 54 and CodeRabbit
79adfbc Leave out: a share answers for the list it was started on, whatever changed it
f589c5c Down Sheet: focus goes to the new card's fields, on every device
5b9e4d6 Shop Cloud: a pull asked for mid-pull runs next; a refused apply is not retried every sweep
32e10de Bus box: an Enter out of habit after a typed number saves nothing
f1e4d65 Down Sheet: the keyboard lands on the new card after ADD TO THAT ENTRY
32df6bd Resume: answers to the CodeRabbit and SDET reviews of PR 51
ac3f412 Leave out: answers to the SDET and CodeRabbit reviews of PR 52
2de3fd2 Bus box: answers to the SDET and CodeRabbit reviews of PR 54
21e5a07 Merge branch 'claude/log-defect-pickers' into claude/log-defect-flow
188b6d8 Pickers: answers to the SDET review of PR 53
70aa56d Down Sheet: initials typed before ADD TO THAT ENTRY come across with it
0f8be6a Down Sheet: ADD TO THAT ENTRY opens the entry instead of a dead end
635101d B and C: answers to the cold read of both
475cf7b B: one BUS box, picked like the category, typed on the number pad
8d98c36 E: RECOMMEND FOR DOWN SHEET and DOWN SHEET move up under the defect
5956d56 C: pick a category and the symptom list opens by itself
b6f2e53 Pickers: one click types on the shop computer; the Down Sheet follows
94e1c5e Defect Log pickers: the list opens without the keyboard, typing is asked for
e81e25d Leave a bus out of a shared Defects Logged list, with PUT BACK
a445487 Propose 198 in the handoff: the fix for reopening in 197
520fa20 BT197-F2: the map says it is ready when it is drawn, not two seconds later
```

```
$ git diff --name-only 19f0e90..2ee1bb5 -- app src tests
app/_components/last-page-live.tsx
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/_components/down-sheet-editor.tsx
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
src/components/shared/bus-selector.css
src/components/shared/bus-selector.tsx
src/components/shared/combo-field.css
src/components/shared/combo-field.tsx
src/components/shared/shop-cloud-live.tsx
src/lib/defects/form-coach.ts
src/lib/defects/quick-filter-share.ts
src/lib/fleet/bus-search.ts
src/lib/settings/last-page.ts
tests/app-shell.test.mjs
tests/defects.test.mjs
tests/down-sheet.test.mjs
tests/fixtures/resume-navigation-server.mjs
tests/settings.test.mjs
tests/shared.test.mjs
```

```
$ git diff --shortstat 19f0e90..2ee1bb5
 24 files changed, 1985 insertions(+), 428 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 19f0e90..2ee1bb5 -- supabase package.json package-lock.json .github public worker
```

The one merge conflict was at PR 53 (`f2afe36`): PR 52 and PR 53 each appended to the end of `app/defect-log/defect-log.css` and `tests/defects.test.mjs`. Both sides are kept, PR 52's first.

### Migrations

None. **No storage key is added, renamed or read differently** — the added lines of `app` and `src` name no `pace-…-v…` key. Everything new here is page state held in memory. `public/sw.js` and the manifest are untouched. The inline script at the top of every page is the one 197 serves.

## Part 1 (PR 51) — the map says it is ready when it is drawn

### What was wrong

When the app starts fresh on the map and has a page to reopen, a script at the top of the page waits up to **2.5 seconds** for three things: the network to answer, the map's document to finish loading, and the map to say it is ready. Then it moves. If any of the three is late, it shows the map and stays for that run.

In 197 the map said it was ready from a **two-second timer** that started once the map had been drawn. That timer belongs to something else — it is how long a *reopened* page has to stay up before it counts as working. Used here as well, it left half a second for the map's code to arrive and draw.

Measured on the production build, in the real app, through a proxy that holds each script file back by a set time. Time is from the top of the page to the ready signal.

| each script file held back | 197 as live: ready at | 197 result | 198: ready at | 198 result |
| --- | --- | --- | --- | --- |
| 0 ms | 2104 ms | reopened | 91 ms | reopened |
| 100 ms | 2620 ms | **map** | 620 ms | reopened |
| 200 ms | 3120 ms | **map** | 1085 ms | reopened |
| 400 ms | not run | | 2110 ms | reopened |
| 550 ms | 4870 ms | **map** | 2868 ms | map, page still remembered |
| 800 ms | 6105 ms | **map** | not run | |

The review that found this measured it a different way — processor slowed eight times, and scripts 550 or 800 ms late in total — and got 0 of 4 on 197 each time.

### What changed

**The map says it is ready when it is drawn.** Nothing else about when the app reopens a page is different.

What a person will see:

- **A fresh start that reopens a page is about two seconds quicker.** The wait behind the blank screen was mostly that timer.
- **It reopens on a slow phone and on the first launch after an update**, where 197 opened on the map.
- **A phone slow enough that the map still is not drawn 2.5 seconds in** opens on the map for that run, as before. The page it was left on is still remembered, so the next start tries again — unless somebody uses the map, which makes the map the page they were on.

**Corrections to what the 197 handoff said**, which this replaces:

- It said a fresh start that reopens a page is *"a little slower"*. In 197 it was about two seconds slower than it needed to be, every time.
- It gave the wait as 2.5 seconds without saying two of them were spent before the map could say anything. **The limit is 2.5 seconds in both releases; in 198 all of it is available.**
- Its list of when a fresh start lands on the map left out the commonest one in 197: **the map was not ready in time.** With 198 the whole list is:
  - the map is where it was left;
  - the first time the app is ever opened, or after a reset that clears the site's data;
  - the page it was reopening did not stay up, the time before;
  - the network did not answer, the map's document had not finished loading, or the map had not been drawn, within 2.5 seconds — for that run only;
  - a page glanced at and pocketed inside two seconds, on a phone that then closes the app; and the start after one where the move was begun and stopped. Each of those forgets the page once.

Three other things in this commit, none of which a person will see:

- **The page's remembering code moved** out of the component and into `src/lib/settings/last-page.ts`, so that tests can run it. In 197 the ready signal was checked only by a test that read the file's text, and the review switched the signal off without a test failing.
- **The manual test fixture** (`tests/fixtures/resume-navigation-server.mjs`) now runs the app's own code where it had a hand-written copy. Its copy sent the signal at once, so it reported a reopening the app did not make.
- **`CLAUDE.md`** describes the three conditions and when the signal is sent.

### One thing this trades, written down

The two-second timer had also been covering something by accident: whatever the map starts in its own first moments. A move can now begin while the map's first pull from the Shop Cloud is in flight, and a move that stalls is stopped about 2.5 seconds after the map was drawn, where it was 4.5. Stopping ends that pull with the move. The board is drawn from the device's own records and is not affected, and since Part 2 a pull that was cut off is owed and made by the next sync. **This was read in the code, not measured.**

### Part 1 measurements

- **The table above**: production build, served locally, Chromium at 390 wide, the real inline script in the real app, through a proxy that held each script file back. One run per row; the proxy forbade caching after two early runs were found to be served from the browser's cache.
- **49 bugs planted** one at a time in the module and the component; the tests caught all 49.
- A planted fixture fault (the ready signal raised on arrival) fails `tests/settings.test.mjs`, which now runs what `/map.js` sends rather than only parsing it.

## Part 2 (PR 51) — a Shop Cloud pull that did not finish is asked for again

**What was wrong.** While the live connection to the Shop Cloud is up, the 45-second sweep only sends; it does not fetch. So a fetch that did not finish was never asked for again: the first fetch of a page that reopening cut short, one that failed on dead wifi, or one requested while another sync was running, which was simply dropped. The board sat on what it had until the next change notification or a trip away from the app.

**What changed.** A fetch is owed until one comes back, and the next sync makes it. A request that arrives mid-sync is counted, and a fetch runs again as soon as that sync ends. A fetch that came back but could not be saved (a phone too full, say) is not retried every 45 seconds: the error shows as before. A fetch still never runs unless sending succeeded first. Separately, the page now removes the listeners it added when it unloads.

**Not measured:** this needs a live Shop Cloud connection to drive, and the development machine has none. It was read and reviewed.

## Part 3 (PRs 53 and 54) — logging a defect on a phone

**What was wrong**, on Curtis's iPhone:
- The keyboard came up when LOG DEFECT opened and again on every pick, covering the list it had just opened.
- Picking a bus left a grey card repeating the number.
- Engine opened on one "Engine 23" row that had to be tapped first.
- The symptom box's text was cut off.
- The bus took three controls and a third of the screen.
- RECOMMEND FOR DOWN SHEET sat about two and a half screens down.

**What changed** — on the Defect Log's LOG DEFECT form, and the Down Sheet's editor where it says so:
- **No keyboard when the form opens.**
- **Tapping a list box opens its list with no keyboard.** Tapping the box again, or the **TYPE** button at its right end, starts typing; while typing the button reads **LIST** and brings the whole list back. The ▾ arrow opens and closes the list. On the shop computer, one mouse click types as it always did. (Both forms.)
- **One BUS box** in place of the generation chips, the bus list and TYPE BUS #. Tap it: 15s, 17s, 18s, 20s with counts, then the buses. TYPE brings up the number pad, and a full fleet number picks the bus by itself. Picked, it reads "Bus 17507 · Main Garage". No grey card. Letters typed there find no bus. Typing over a chosen bus lets it go; backing out gives it back. (Both forms.)
- **Pick a category and the symptom list opens by itself**, with no keyboard. (Both forms.)
- **A category with one group opens straight into its choices** — Engine shows its 23 defects. (Both forms.)
- **The text in the boxes fits.** "Optional. You can save the category alone." sits under the symptom box. The Down Sheet uses shorter wording because its boxes sit inside repair cards.
- **RECOMMEND FOR DOWN SHEET and DOWN SHEET moved up**, right under the symptom and before ADDITIONAL DETAILS. DEFERRED and NOT DUPLICATED stay at the bottom. (Defect Log.)
- **Taps on a label or hint line no longer jump into the field.**
- **Backspace with nothing typed empties an answer**; the × does too.
- **An Enter pressed within two seconds of a typed bus number does nothing**, so it cannot save an empty Down Sheet entry.

## Part 4 (PR 52) — leave a bus out of a shared Defects Logged list

**What was wrong.** On the Defects Logged quick filter, there was no way to drop a bus from the list before COPY LIST, SHARE or SHARE PAGE.

**What changed.** Each bus row has **LEAVE OUT**. The bus stays in its place as a dashed LEFT OUT row with **PUT BACK**, the same height it had, so nothing below moves. The count reads "5 OF 6" in a badge that holds one width. Leave everything out and the three share buttons go dead. Nothing about a bus or a defect is written; the next list opened starts whole. Defects Logged only — offering it on other lists is Curtis's call.

## Part 5 (PR 55) — ADD TO THAT ENTRY on the Down Sheet

**What was wrong**, measured on 197. ADD DOWN BUS, type a bus already on the sheet, press **ADD TO THAT ENTRY**: the heading changed to that bus, the form stayed blank, and SAVE was refused — *"That bus already has an active down-sheet entry."* The only way out lost what was typed.

**What changed.** It opens the bus's existing entry with its repairs and a blank card for the new one, scrolled into view; saving adds to that entry. Initials typed before pressing it come across with it.

## Verified

- `npm test` on Windows at `2ee1bb5` — **477 pass, 0 fail**.
- `npm run lint` — no error; one warning, in a tool file that is not part of the app.
- Type-check — 240 errors, against 239 on `main`. The one more is `src/lib/fleet/bus-search.ts` importing with a `.ts` ending, the convention every `src/lib` module follows so the Node test runner can load it.
- **Every PR** passed an SD-QG gate and a CodeRabbit review, and each finding was fixed in a named commit or declined with the reason in its commit message. Each PR was also read cold by a subagent before it was pushed, and the review fixes were read cold again. The merge resolution only kept both sides of two appended blocks.
- **Measured in Chromium** on the dev server, with real clicks and keys at 1180 and touch-pointer events at 360 and 390, on pages no service worker served. The numbers are in each commit message. Examples: picking a category at 360 moves the fields below by 0 px; leaving out a bus with its detail open moves the rows below by 0 px; the count badge moves 0 px from "105" to "104 OF 105"; on the shop computer the review's wrong-bus path (17507, Tab, "brakes", Enter) keeps Bus 17507 and picks Brakes.
- **Part 1's measurements** are in its own section above.

**Not verified:**
- **A real iPhone or iPad, or WebKit.** Keyboard down on the first tap and up on the second, the number pad on TYPE, the grey card being gone, and the reopening of an installed copy are all reasoned from how iOS behaves, not measured.
- **The Shop Cloud change (Part 2)** against a live connection.
- **Rotating a phone, or opening another bus's detail, between LEAVE OUT and PUT BACK** can still move rows on PUT BACK (SDET BT52-LS-F3, CodeRabbit). Left on purpose.
- **Four test-only suggestions** from the reviews ask for tests that render screens; this repository has no tool for that. Behaviour was measured in the browser instead.

## What to check once it is live

On a phone with the app on its home screen. Open the app once after the update so it has the new version.

**Reopening**
1. Tap **Defects**, wait a few seconds, swipe the app away, tap the icon. It should open on the Defect Log without the map first. Do it three times.
2. Tap **Map**, close the app from there, open it. It should open on the map.
3. Go to the Defect Log and leave the phone until it has closed the app itself — an hour or overnight. It should open on the Defect Log.

**Logging a defect**
4. Tap **+ LOG DEFECT**. No keyboard should come up.
5. Tap **BUS**. The generations should show with no keyboard. Tap 17s, then a bus. No grey card should appear.
6. Tap BUS again, then **TYPE**. The number pad should come up. Type a full bus number: it should be picked and the keyboard should go down.
7. Tap **DEFECT CATEGORY**: the list, no keyboard. Tap the box again: the keyboard. Tap **LIST**: the keyboard goes, the list stays.
8. Pick **Engine**. The symptom list should open by itself straight on its choices, with no "Engine 23" row.
9. RECOMMEND FOR DOWN SHEET and DOWN SHEET should be right under the symptom.
10. On the Down Sheet's ADD DOWN BUS, do steps 5 to 8 there.

**Sharing**
11. Open **Defects Logged**, press **LEAVE OUT** on a bus, then COPY LIST. That bus should not be in what is pasted. PUT BACK should bring it back.

**ADD TO THAT ENTRY**
12. On the Down Sheet, ADD DOWN BUS, type a bus already on the sheet, press **ADD TO THAT ENTRY**. Its repairs should show with a blank card; add one and save.

If step 1 opens on the map, say whether the map appeared at once or after a couple of seconds of blank screen, and how good the signal was.

## Open questions for Curtis

- **Does a device restart reopen the last page, or go to the map?** As built it reopens the page.
- **The 2.5-second reopening limit** has never been tuned on a real phone.
- **LEAVE OUT on every shared list**, not only Defects Logged: asked for, held for his answer because the other lists carry buttons that change real records.
- **Down Sheet referrals:** should the shared referral list hold only buses not yet on the sheet, and does a direct DOWN SHEET tick count as a referral?
- **Not yet built, approved in the mockups:** the light-blue symptom box, dimming the form until the bus and category are picked, removing the duplicate save buttons mid-form, and the SAVE strip above the keyboard.

## Rollback

Sites 194 / application release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.
