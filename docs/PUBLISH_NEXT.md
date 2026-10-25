# Publish next

**STATUS: 193 PENDING.** The ADVANCED ACTIONS drawer now opens in the colour of
the button that opens it, on the Defect Log and the Down Sheet. Queued by
Claude Code; not published, not tagged, not deployed.

Application release 192 is live as Sites version 188 from
`2ddc026c139c45acec7c24128633841d96e7dee3`, deployed 2026-10-23 at
02:26:48.844011 UTC to the existing public
[Fleet Step site](https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site).

| | |
| --- | --- |
| Pending | **193** — ADVANCED ACTIONS drawers take their button's colour; both openers larger |
| Source | `a009c08` (merge of PR #41) |
| Live now | 192 / Sites 188 from `2ddc026` |
| Rollback | application 192 / Sites 188, source `2ddc026c139c45acec7c24128633841d96e7dee3` |

---

## 193 — ADVANCED ACTIONS opens in the colour of the button that opens it

### Source

Release source: **`a009c08`**

```
$ git log --oneline 2ddc026..a009c08
a009c08 Merge pull request #41 from curtistheconqueror/claude/defect-log-panel-colours
f2b9138 The Down Sheet drawer wears its button's purple too
edef752 Both review findings, and both were mine
ac87db4 ADVANCED ACTIONS opens in the colour of the button that opens it
79866aa Record application release 192 live as Sites version 188
```

`79866aa` is Codex's own 192 bookkeeping and carries no application change.

```
$ git diff --name-only 2ddc026..a009c08 -- app tests
app/defect-log/defect-log.css
app/down-sheet/down-sheet.css
tests/defects.test.mjs
tests/down-sheet.test.mjs

$ git diff --shortstat 2ddc026..a009c08
 9 files changed, 245 insertions(+), 59 deletions(-)
```

The other five of those nine are Codex's 192 records — `PROJECT_HANDOFF.md`,
`README.md`, `docs/RELEASES.md`, `docs/archive/PUBLISH_RELEASE_192.md` and this
file. **This release changes two stylesheets and their two tests. No `.tsx`,
no `.ts`, no markup.**

```
$ git diff --name-only 2ddc026..a009c08 -- supabase package.json package-lock.json .github public worker
(nothing)
```

**The no-infra-change check comes back empty.** In particular `public/sw.js` is
untouched, so unlike 192 there is **no service-worker cache bump and no app
shell re-download** — phones pick this up as an ordinary asset change.

### Migrations

**None.** No schema change, no policy change, nothing executed against the live
project. **No new LocalStorage keys, and no key renamed** — nothing in this
release reads or writes storage at all.

### What was wrong

Curtis, about both pages: *"that button for advanced features, it brings down
the menu that doesn't look like it belongs with the color of that button."*

Each ADVANCED ACTIONS button sits on a coloured header, and each drawer opened
**white** on the light page below it. So the button and the thing it opened read
as two unrelated objects, and the drawer looked like it belonged to whatever sat
underneath rather than to the control above. DAILY STATS never had the problem,
only because both of its halves live on the page — which is exactly why it
looked right beside one that did not.

### What changed

Each drawer now takes the colour of the button that opens it:

| | its button | drawer was | drawer now |
| --- | --- | --- | --- |
| Defect Log | navy, on the header | white | the header's own colour |
| Down Sheet | purple | white | that same purple |

**Navy on one and purple on the other is deliberate, not drift.** Both page
headers are navy, and the two ADVANCED ACTIONS buttons are kept visually unalike
on purpose so the Down Sheet and the Defect Log cannot be mistaken for one
another. A test has held the buttons apart since the Down Sheet got its own
drawer; it now holds the drawers apart too.

**Both openers are also easier to find.** On the Defect Log they became one
control in two places — name, what is inside, an OPEN/CLOSE chip — so the shape
is learned once, and DAILY STATS gained an accent edge. The controls grew from
38px and 44px to 52px, and 56px on a phone.

### Verified

Gates re-run on `a009c08`, this release's source:

- `npm test` — **388 pass, 0 fail**, under `TZ=UTC` **and** `TZ=America/Chicago`
- `npm run lint` — clean, no output
- `npm run build` — Build complete
- Working tree clean, nothing stashed

**Measured in Chromium rather than read off the stylesheet**, across all four
Defect Log themes at 360, 390 and 430, and the Down Sheet additionally at 820
and 1180. Lowest text contrast anywhere is **4.63:1**; no clipping, no
horizontal page scroll at any width; tap targets 54–57px.

Two measurements changed the design rather than confirming it:

- Tinting DAILY STATS toward the accent took it to **4.12:1 on the tactical
  theme**, under AA for 14px 900-weight. The tint is gone and the hover/focus
  state no longer carries it either — focus is a state somebody sits in and
  reads from. A focus ring that had been suppressed with `outline:none` and
  never replaced is now visible.
- The Down Sheet's toggle column is capped at 210px, leaving 118px for text.
  The Defect Log's 14px label wrapped to two lines there and grew the control
  to 96px, so above 760px that label stays 10px — the size the original chose,
  for this reason — and takes the full 14px only on phones, where the cap lifts.

**Not verified:** fresh browser interaction on a real phone, Safari and Home
Screen, and how the two drawers look on the three dark Defect Log themes on an
actual device rather than in a measured browser.

### What to check once it is live

1. **DEFECT LOG → ADVANCED ACTIONS.** Open it. The panel that drops down should
   be the same dark navy as the header above it, and should read as hanging off
   that button rather than floating on the page.
2. The controls inside it — ALL, UNDO LAST, CLEAN UP, SCAN SWEEP, AI OPERATOR —
   should all still be readable on their white cards.
3. **DAILY STATS**, just below it, should now be a taller bar with a blue edge
   down its left side and an OPEN chip on the right, matching the shape of the
   ADVANCED ACTIONS bar above.
4. **DOWN SHEET → ADVANCED ACTIONS.** Same check: the drawer should be the same
   purple as its button. SCAN SHEET and CLEAR DOWNSHEET inside it unchanged.
5. On the **shop computer or an iPad**, check the Down Sheet's ADVANCED ACTIONS
   button reads on one line and the page does not scroll sideways.
6. If you use a dark theme on the Defect Log (Settings → appearance), open
   ADVANCED ACTIONS on it and check the panel still reads.

Nothing else on either page should have moved, and no record is touched by any
of this.
