# Publish next

**STATUS: ONE RELEASE PENDING — application release 197, a door on the Doors group.** Not published. Application release 196 is live as Sites Version 191, deployed 2026-11-17 at 07:12:36.997726 UTC, from `a9f610d42123cd6cfaaf32b61d8c78048d585c82`; that is also the rollback for 197. PR39 MCP remains separately held and unmerged, and **is not in this release.**

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

One release is pending. It is one commit, two files, and one glyph on one label.

| Release | What it is | State |
| --- | --- | --- |
| 197 | The Doors group under Bus Accessories is drawn as "🚪 Doors" | Queued, not published |

The record of 196 and everything before it is in `docs/RELEASES.md`; the former queue is in `docs/archive/PUBLISH_RELEASE_194_195.md`.

## 197 — a door on the Doors group

### Source

Release source: `0dc91ce`, on `main`. Previous: `4086c98`, the commit that recorded 196's live verification.

The three blocks below were run at `0dc91ce`, the commit below the one this file is updated in.

```
$ git log --oneline 4086c98..0dc91ce
0dc91ce A door on the Doors group
```

```
$ git diff --name-only 4086c98..0dc91ce -- app src tests
src/lib/defects/repair-catalog.ts
tests/defects.test.mjs
```

```
$ git diff --shortstat 4086c98..0dc91ce
 2 files changed, 24 insertions(+), 4 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 4086c98..0dc91ce -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently. No route, no schema, no service worker change. Nothing stored is rewritten: the group is still saved as "Doors", and a defect saved before this reads the same after it.

### What was asked for

Curtis: *"Please put a door 🚪 emoji on the doors defect."*

Doors is a group inside the Bus Accessories category. It is the first group in that list, directly above Ramp, Lift and Kneeler and Wheelchair Securement, which are both drawn with the ♿ mark. Doors had no mark.

### What changed

The Doors group is drawn as **🚪 Doors** wherever a person picks a group:

- **Defect Log, LOG DEFECT.** With Bus Accessories chosen, the first group row reads 🚪 Doors. When searching with no category chosen — typing "rear door" — the small line under each match reads "🚪 Doors · ♿ Bus Accessories".
- **Facility Map, the bus editor's ADD DEFECT, and the multi-bus tool.** The group list's first choice reads 🚪 Doors.
- **Down Sheet, the editor's defect picker.** It draws the same rows the Defect Log does.

What did **not** change:

- **A logged door defect looks as it did.** The mark is on the group in the picker, where the ♿ is, not on a defect card, the bus quick view, a Down Sheet line, a report or a share. If Curtis meant the logged defect, that is a second, separate change and has not been built.
- **The eleven choices inside Doors are unmarked**, as they were.
- **Nothing stored carries the mark.** A test holds that for every choice and every group in the catalog.

One thing a keyboard user on the shop computer may notice: in the Facility Map's group list, pressing **D** no longer jumps to Doors, because the line now starts with the glyph. The same is already true of R and W for the two ♿ groups.

One fix rode along, in the same function family: a defect whose wording is exactly the word "constructor" was drawn with a line of program text in front of it. No catalog choice has that wording, so it could only be reached by a hand-typed or imported record. It is drawn plain now.

### Verified

- `npm test` on Windows — **469 pass, 0 fail**, re-run after the review's changes.
- `npm run lint` — no error; one warning, in a tool file that is not part of the app.
- In a browser at 390 wide, on the development server:
  - Defect Log, LOG DEFECT, Bus Accessories: the group row reads "🚪 Doors" with its count of 11, and the choices under it are unmarked.
  - Defect Log, searching "rear door" with no category: four matches read "🚪 Doors · ♿ Bus Accessories" on their second line; no row's text overflows its box.
  - Facility Map, bus editor, ADD DEFECT, Bus Accessories: the first group choice's text is "🚪 Doors" and the value it stores is "Doors".
- A cold read of the diff by one subagent that had not seen the reasoning: no defect, five notes. Each is answered in the commit message of the release source — three fixed, two declined with the reason.

**Not verified:**

- **The Down Sheet editor's picker** was read, not driven. It draws from the same search index through the same component as the Defect Log's.
- **The multi-bus tool's group list** on the Facility Map was read, not driven. It is the same line of code as the bus editor's, which was.
- **No physical phone, iPad or shop computer.** How the door glyph is drawn depends on the device's own emoji font; it was seen on Windows Chromium only.
- **The built worker** was not run. The check was on the development server.

### What to check once it is live

1. Defect Log → **+ LOG DEFECT** → choose **Bus Accessories** → tap the arrow on SPECIFIC DEFECT OR SYMPTOM. The first row should read **🚪 Doors**, above the two ♿ rows.
2. Tap **🚪 Doors**. The choices — Front door, Front door will not open, and so on — should have no mark in front of them.
3. Clear the category, then type **rear door** in SPECIFIC DEFECT OR SYMPTOM. Under each door match the small line should read **🚪 Doors · ♿ Bus Accessories**.
4. Facility Map → tap a bus → **+ ADD DEFECT** → category **Bus Accessories**. The group list's first choice should read **🚪 Doors**.
5. Save a door defect on a test bus and look at its card. It should read as a door defect always has, with no glyph added — that is expected.

### Rollback

Sites 191 / application release 196 at `a9f610d42123cd6cfaaf32b61d8c78048d585c82`.
