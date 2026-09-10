# Publish next

**STATUS: 171 IS PENDING — publish from `3b8e476`.**

## ⚠️ BEFORE ANYTHING ELSE: CONFIRM WHAT IS ACTUALLY DEPLOYED

Curtis has now reported three times that tapping the FLEETSTEP title does not
take him to the home screen. **It is not a code bug** — the fix has simply never
reached his phone. What the title is, per release:

| Release | Sites | The title is | Tapping it does |
| --- | --- | --- | --- |
| 169 | 165 | `<b>` — plain bold text | **nothing at all; it is not a control** |
| 170 | 166 | `<a href="/">` | goes to the Facility Map, not the home screen |
| **171** | pending | `<button>` → the home screen | **what he asked for** |

**There may be a discrepancy between the record and the deployment.** This file
and `docs/RELEASES.md` both say release 170 / Sites 166 is live from `bdca898`.
Curtis says Codex told him the release is **169**. If the site really is serving
169, then 170 never went out either — and 170 existed only because the SCAN
SHEET fixes missed 169. That would be three releases in a row where the record
and the deployment disagreed.

**So: check what Sites is actually serving before publishing 171, and tell
Curtis the number you find.** If 170 is genuinely not live, 171 carries it
forward anyway — `3b8e476` contains every line of 170 — so publishing 171 fixes
both. Nothing needs to be published twice.

Verified in Chromium on `3b8e476`, all six surfaces at 390px and 1180px: the
title renders as a `<button>`, the tap lands on the button itself (nothing
covers it), and the home screen opens full-screen and visible.

---

Release 170 is recorded as live from `bdca898` as Sites Version 166.

**Read the SHA above, not a SHA you remember.** `3b8e476` is the last CODE
commit; above it sit Codex's own 170 release record, this handoff, and the merge
that joined them — docs only, none of it belonging in a build. The 169 handoff
named a SHA that had been the head when it was written, two code commits landed
after it, and 169 shipped without them. That is what 170 was for and it is the
mistake not to repeat here. **If more work lands before you get here, re-check
this SHA first.**

## What 171 is

**Sixteen commits.** No migration, no schema change, no dependency change,
and nothing that rewrites a record. **Two new storage keys, both per-device and
neither renaming anything** (`pace-down-sheet-recommended-collapsed-v1`,
`pace-role-v1`), eighteen new catalog options, one new optional field on a
defect, a third board on the Down Sheet, the Defect Log's two pickers rebuilt
as typing fields, and one bug fixed that was live in 170.

- **The Facility Map's header joins the other five.** It was the one page whose
  nav sat above its own name — Curtis, on a phone: *"the facility map needs to
  get on board with title design. Fleetstep should be at top."* On the page the
  app opens on, FLEETSTEP was the fifth thing down the screen.

  The nav now follows the header, and the header carries the same four lines
  every other page draws: the name, a FLEET MAINTENANCE kicker, an h1 that is
  the page's own name (**Facility Map**, matching what the nav calls it), and a
  subtitle. The long all-caps sentence that had been doing all four jobs at once
  became the subtitle's one job, so no wording is lost.

  The h1 also takes an explicit size. It was `font-size:inherit` from the bare
  `header` rule, and the phone block drops that header to 11px — so the map's
  own title had been rendering *smaller on a phone* than the kicker line on
  every other page. 25px desktop, 22px phone, the two sizes the other five use.

- **The map's phone nav actually sticks.** It has carried
  `position:sticky;top:0` since that rule was written and has never pinned
  anything: `overflow-x:hidden` makes an element a scroll container, so the nav
  was sticking to `.app`, which does not scroll — the document does. Swapping
  those three declarations to `overflow-x:clip` (with `hidden` left in front as
  the fallback for older browsers) gives it the viewport as its container.
  Measured pinned at y0 from scrollY 400 all the way to 4200 on a 5123px page,
  with no horizontal bleed introduced on any of the six pages at 360/390/430/820.

- **Wipers and Washers join the defect catalog**, under Bus Accessories: wiper
  blade and wiper motor each curbside and roadside; washer not spraying, pump,
  reservoir, and a nozzle per side; plus a catch-all. Ten options in one new
  group. Purely additive to what is LIVE — nothing a device holds is renamed or
  moved, no rename map is involved, and the group sits last so nothing above it
  shifted in the picker. Verified in the browser: Bus Accessories offers 50
  options where it offered 40, and the new ones store and display correctly.

- **The Defect Log's CATEGORY and DEFECT pickers are now typing fields.** Tap one
  and the whole list opens as before; type and it narrows. The DEFECT field
  searches **every category at once** and fills the category in for you, so
  nobody has to know a wiper motor lives under Bus Accessories before logging
  one. Ranked rather than substring-matched — word starts beat mid-word hits,
  every typed word must appear, and there is deliberately no fuzzy matching, so
  a typo returns nothing rather than the wrong part. Storage is untouched: the
  search reaches the catalog's own strings and never spells a new one.
  The list reads at the size of the field that opened it — 16px on a phone, the
  same size the old drop-down drew its options at.

- **Six more defects from the floor**: *Ramp will not lock* and *Ramp does not
  fully cycle* under Ramp, Lift and Kneeler; *Marker lights - C/S*, *Marker
  lights - R/S* and *Clearance lights* under Lights, Mirrors and Alarms; and
  *Water in air storage tanks* under Pneumatic System. Purely additive.

- **The welcome screen's second line** now reads *Transit Maintenance Work
  Solutions* instead of *PACE SOUTH · FLEET MAINTENANCE* — what the app calls
  itself rather than what one garage calls itself. Verified alongside it that
  **Lite can always be turned back off from inside Lite**: Settings stays in the
  nav, the switch is on it, and unticking returns the device to Full. Three
  tests now hold that door open.

- **The app name opens the home screen from every page.** It was pointed at `/`
  (the Facility Map) first; it now opens the welcome screen itself, which is what
  Curtis meant. A first run must still answer FULL or LITE — the close only
  exists once the question has been answered, so looking at it changes nothing.
- **The defect picker's sections are back.** Browsing the list is divided by
  faded group headings the way the old `<optgroup>` divided it (FAREBOX, VENTRA,
  CUBIC SCREEN…); a ranked search keeps the group on each row instead, because
  headings stop dividing anything once results interleave.
- **Add coolant (glycol)** and **Add transmission fluid** join *Add engine oil*
  in Preventive Maintenance, and **one stop at the fluid cart is one record.**
  Pick any of the three and an ALSO TOPPED UP row offers the other two, so a bus
  that took oil, glycol and transmission fluid is one repair to read rather than
  three. Curtis: *"The one record listing several probably best and is less
  clutter."*

  The quarts box now appears for all three. It was gated on the one string
  "Add engine oil" while the catalog had already been told all three carry an
  amount, so glycol and transmission fluid had been setting a unit that nothing
  could ever put a number in. The count stays with the fluid the record is filed
  under — the shop counts quarts of oil and does not count glycol — and the
  label names which one once a second fluid is on the record.

  `fluids` is a **new optional field on a defect**, not a new storage key: it
  rides inside `pace-board-v1` beside `symptoms`, and it rides to the Shop Cloud
  inside `detail` the same way. A record that has none does not carry the key at
  all, so **no existing row's cloud fingerprint changes** and nothing re-pushes.

- **A third board on the Down Sheet: RECOMMENDED FOR DOWN SHEET**, directly
  under MYSTERY BUSES and DEFERRED BUSES, reusing their look down to the action
  buttons with the Down Sheet's own blue as its stripe. Curtis: "right under
  both of them, same color and everything, same functionality, with the same
  number count."

  It counts BUSES, not rows, so two recommendations on one bus count once, and
  it drops a bus as soon as the repair is fixed, deleted, or put on the sheet —
  the "in sync" part he asked for. A bus already on the sheet is not listed, the
  same rule DEFERRED applies one board up. Nothing here goes overdue: a
  recommendation waiting a week has not gone wrong.

- **The same list in QUICK FILTERS now says how long each bus has been waiting**
  and carries two actions: MARK FIXED closes the repair out, REMOVE withdraws
  the recommendation and leaves the repair open. They are the Down Sheet's own
  row actions — its tick and its cross — and neither destroys a record. The
  board and the drawer share one counting function so they cannot disagree.

- **DEFERRED no longer claims the bus is on property.** Curtis: "deferred buses
  do not have to be on property... whether they're here or on the road." The
  counting was already right; the subtitle was not, which is the worse half to
  get wrong — a wrong number gets questioned, a wrong label invites the next
  person to change the code until it agrees.

- **A BUG THAT IS LIVE IN 170: unticking RECOMMEND FOR DOWN SHEET never stuck.**
  The setter deletes its key, and the save merged with `{...existing,...incoming}`
  where a missing key cannot override the stored value — so the recommendation
  came back on the next read, in the defect editor too. `workStates` had this
  exact bug, was fixed, and nobody checked whether anything else was deleted the
  same way. Two fields are. A test now derives that list from the catalog so a
  third cannot be forgotten. **Anybody who tried to withdraw a recommendation
  since DS REC shipped will find it still there until this publishes.**

- **The home screen asks what you do.** A collapsible MY ROLE panel under the
  FULL/LITE choices: Transportation (Bus Operator, Dispatch, Superintendent) or
  Maintenance (Servicer, Mechanic / Technician, Foreman, Superintendent).

  **It is cosmetic and must stay that way.** Curtis: "there will be no special
  conditions in the app for any of the working roles. This is all cosmetic. We
  will wire that up later." A test asserts no surface outside the picker reads
  the key. It is per-device and never synced, and a first run still cannot get
  past the gate without answering FULL or LITE.

- **A bus that keeps coming back is now counted.** Curtis: "if a person tries
  to re-submit something in defects, I want a tally of how many times with the
  date stamped... this way I know how many round trips a bus is making without
  the repair." It was not done — the app already refused the repeat and counted
  nothing.

  The ALREADY LOGGED banner offers **+ COUNT THIS RETURN** beside OPEN IT.
  Deliberate rather than automatic: counting when the banner merely appears
  would count a foreman scrolling the picker. A second press inside two minutes
  is treated as a thumb and refused.

  **ADVANCED STATS** is a new section at the bottom of the **FOCUS view only**,
  under however many defects the bus is carrying — "the list can drop further
  down and just scroll to read." It holds the round-trip total for the bus, the
  breakdown per repair, and every return with its date and initials. It is a
  section rather than one number because more is going in it.

  `reportAttempts` is another optional field on a defect, absent when empty, so
  no row fingerprint moves. Nothing ever removes a return — saves and duplicate
  merges both take the union.

- **MY ROLE asks three things**: department, then **union or non-union**, then
  the job — and the second narrows the third, because Curtis gave the split:

  | | Union | Non-Union |
  | --- | --- | --- |
  | Transportation | Bus Operator, Relief Supervisor | Dispatch, Asst Supt, Supt |
  | Maintenance | Servicer, Mechanic Helper, Mechanic, Master Mechanic, Body & Frame, Building Maintenance | Foreman, Asst Supt, Supt |

  Foreman is on the non-union side — the one job a transit shop cannot assume.
  *Bargaining* names the union side, so it can never be the non-union label;
  Union / Non-Union is what the floor says. The status is drawn as a tag beside
  the name rather than a third dot-separated part of it. A combination outside
  that table cannot be chosen and does not read back, so a contract change moves
  a job in `app/roles.ts`.

- **The two Superintendent roles are abbreviated**: *Asst Supt* and *Supt*, in
  both departments. Curtis: "we have asst supt, so that is why I want it
  shortened, so the label can show both like Asst Supt & Supt simultaneously."

  He has also said the roles **will** decide access, on a person's own login,
  with a questionnaire that does not exist yet. Still cosmetic in this release,
  and `roles.ts` and `CLAUDE.md` now record both the intent and why it does not
  start in this key: it is an unauthenticated string a phone's holder can change
  from the screen that set it, so it can be the label a login confirms and never
  the thing that decides.

### What to check once 171 is live

- On the Facility Map, **FLEETSTEP is the first thing on the screen**, with the
  six page buttons below it rather than above. It should read like the Down
  Sheet and Defect Log headers do.
- The title says **Facility Map**; the sentence it replaced is the small line
  under it.
- Nothing below the header should have moved.
- Log a defect under **Bus Accessories** and scroll the option list to the
  bottom: ten **Wipers and Washers** options — blade and motor per side, and the
  washer set.
- **Open + LOG DEFECT and type "wiper motor" without choosing a category.** It
  should find it and set the category itself. Then tap the same field with
  nothing typed: the full list should open the way the old drop-down did.
- **This is the one to check on a real phone**, because it is the one thing that
  cannot be measured in a container: with the keyboard up, are the results
  above the keys and reachable? The field scrolls itself into view on open,
  which should handle it, but a real iPhone is the only thing that proves it.
- **Scroll down the Facility Map on a phone: the six page buttons should stay at
  the top of the screen** instead of scrolling away. This is the one behaviour
  change in 171 — if it is unwanted, say so and it comes out on its own.
- No page should scroll sideways. That is what the `overflow-x` change could
  plausibly break, so it is worth one swipe on the map and the Down Sheet.
- **On the Down Sheet, three boards in a row** — MYSTERY, DEFERRED, RECOMMENDED
  FOR DOWN SHEET — each collapsed until opened. A bus out on the road that
  somebody deferred should be counted in the second one.
- **Tick RECOMMEND FOR DOWN SHEET on a defect, save, reopen it and untick it.**
  It should stay unticked. Before this release it came back.
- **Open QUICK FILTERS → Recommended for Down Sheet.** Each bus should say how
  long it has been waiting and offer MARK FIXED and REMOVE. REMOVE takes it off
  the list and leaves the repair open on the Defect Log.
- **Touch FLEETSTEP, open MY ROLE, pick one.** It should be remembered and
  should change nothing else anywhere in the app. Both departments should offer
  **Asst Supt** and **Supt**. Picking **Union** under Maintenance should list
  Servicer, Mechanic Helper, Mechanic, Master Mechanic, Body & Frame and
  Building Maintenance; **Non-Union** should list Foreman, Asst Supt and Supt.
  Under Transportation, **Dispatch is non-union** and **Relief Supervisor** is
  the union spot beneath it.
- **Log a defect that is already open on the same bus.** The ALREADY LOGGED
  banner should offer **+ COUNT THIS RETURN**; press it, then FOCUS that bus and
  scroll to the bottom — **ADVANCED STATS** should show the round trip with its
  date. Pressing twice quickly should still read 1. And a bus that is on the
  Down Sheet must **stay** on it.
- **Log "Add coolant (glycol)" and tick ENGINE OIL under ALSO TOPPED UP.** One
  record should save, reading *Add coolant (glycol) — also added engine oil*,
  and the QUANTITY box should be there for coolant at all — it never was before.
  Then change the DEFECT to *Add engine oil*: the tick that just became the
  issue should drop out on its own rather than being listed twice.

### Rolling 171 back

Redeploy **170** — commit **`bdca898`**, live as **Sites Version 166**. There is
nothing else to undo. The rollback notes below are kept for the older releases
they describe.

## ⏪ ROLLBACK IS STILL EXPECTED, NOT AN EMERGENCY

Curtis is looking at 169 now and asked that Codex **be ready to put the previous
version back if he does not like what he sees.** That standing instruction
carries forward to 170. Treat a rollback request here as routine rather than as
a failure.

**Roll back 170 to:** repository release **169**, commit **`939fe49`**, live as
**Sites Version 165**. Redeploy that build. There is nothing else to undo — 170
is two UI commits with no migration, no schema change, no dependency change, no
storage key added or renamed, and nothing that writes or rewrites a record.

**If Curtis instead wants to go back past 169 entirely** — the trial he asked
for when Lite Mode went out — the target below is the one he meant, and the two
notes under it still apply.

**Roll back to (pre-Lite):** repository release **168**, commit **`64ec7d2`**,
live as **Sites Version 164**. Redeploy that build.

**Why a rollback is clean.** No migration, no schema change, no dependency
change, no storage key renamed, and nothing in this release writes or rewrites a
record. Lite Mode changes what is DRAWN and never what is stored — measured on a
full → Lite → full round trip that left `pace-board-v1` byte-identical.

Two things to know rather than discover:

- **`pace-app-mode-v1` is a new per-device key** holding FULL or LITE. The 168
  build does not read it, so after a rollback it sits there inert and every
  device is simply full again. Nothing needs clearing.
- **One caveat, and it is small.** This release renames the catalog category
  *Lights and Fixtures* → *Lights, Mirrors and Alarms* as a read-time rename.
  Defects logged under the NEW name during the trial keep every field on a
  rolled-back 168 — verified: category, issue and details all survive and the
  label still reads correctly — but 168 does not list that category in its
  picker, so re-editing one of those defects would show a category the dropdown
  does not offer. It affects only defects logged during the trial in that one
  category, and it corrects itself the moment 169 goes back on.

## What 169 is

Three commits, no migration.

- **Lite Mode.** A device that has never opened the app is asked once, on a
  screen showing the name and two choices, whether it wants FULL or LITE.
  Everybody in the shop already has a board, so nobody mid-shift meets it;
  Settings carries FIRST-TIME WELCOME · SHOW IT so Curtis can see what a new
  person sees on his own phone, and a plain switch to leave Lite.
  Lite stands down: Fleet Campaigns, ADVANCED ACTIONS on both sheets, DEFERRED
  everywhere it appears, the ADVANCED DETAILS half of the defect form, and the
  six opt-in Down Sheet tiles. The eight tiles Curtis ordered — including DOWN
  BUSES and DOWNED BUSES ON ROAD — are identical in both modes.
  The name carries **LITE** beside it on every screen.
- **A search ends when you end it.** Tapping a bus no longer clears a one-bus
  search — that put the whole board back underneath the card being read. A
  banner under the search says what it is hiding and offers SHOW ALL.
- **Lights and Fixtures → Lights, Mirrors and Alarms**, with the catch-all
  following the name. Read-time; nothing on disk moves.
**The SCAN SHEET alignment fixes were listed here and did NOT ship in 169.**
They landed after `939fe49`, which is the SHA 169 was published from. They are
in 170 below, where they belong.

## What 170 is

Two commits, no migration, no new storage key. Both are layout; neither reads or
writes a record.

- **SCAN SHEET alignment.** CANCEL was half off the left edge of a phone — a
  bare `footer` rule in globals.css was positioning every modal's action bar
  against the viewport rather than inside its own dialog. Fixed for every
  dialog, not just this one. The page behind no longer scrolls instead of the
  modal, and three scroll locks that were silently doing nothing now work: the
  helper only ever added the caller's own class, so a call naming a class with
  no CSS rule behind it was a lock that locked nothing.
- **The app name links home.** Curtis: "when I click on that title, it should
  take me to the home page." FLEETSTEP at the top of every page is now an
  `<a href="/">` — a masthead, the way every site has one. `/` is the Facility
  Map; there is no separate landing page yet, and `HOME_HREF` in
  `app/app-name.tsx` is the one line to change when there is.

  It looks identical, measured rather than read on all six pages at 390 and
  1180: same corner, same size, white, no underline, and every header the same
  height it was. The link ends at the last letter instead of running the width
  of the header, so reaching past the name does not navigate; the tap area is
  34px tall on a phone, paid for with a negative margin so nothing moved.

### What to check once 170 is live

- On a phone, open SCAN SHEET from the Down Sheet: **CANCEL is fully on screen**,
  and dragging the modal scrolls the modal rather than the page behind it.
- Tap **FLEETSTEP** at the top of any page: it goes to the Facility Map. Tap the
  empty space to the right of it: nothing happens.
- Nothing else should look different. If a header's title or kicker has moved
  even slightly, that is this release and worth saying.

| Order | Version | Publish from | What it is |
| --- | --- | --- | --- |
| **NEXT** | **171** | **`cca68cb`** | **The Facility Map's header finally drawn like the other five: the name first with the nav below it, a kicker, a title that is the page's own name, and the old all-caps sentence as its subtitle — plus the phone nav's `position:sticky` finally doing something a Wipers and Washers group added to the catalog, and the Defect Log's pickers rebuilt as one typing field each that searches every category. Roll back to 170 / `bdca898` on request.** |
| Published | **170** | **`bdca898`** | **Live as Sites Version 166. SCAN SHEET's CANCEL back on screen — with every modal's action bar fixed alongside it and three dead scroll locks made real — and the app name at the top of every page linking home. Roll back to 169 / `939fe49` on request.** |
| Published | **169** | `939fe49` | **Live as Sites Version 165.** Lite Mode — a first-run choice, and the app drawing less of itself for a new person; a search that ends when you end it; and the Lights and Fixtures category renamed to what is in it. Roll back to 168 / `64ec7d2` on request. |
| Published | **168** | `64ec7d2` | **Live as Sites Version 164.** A DEFERRED board on the Down Sheet under MYSTERY BUSES, with PUT ON DOWN SHEET and RETURN TO SERVICE on each bus; the ORDER dropdown replaced by a SECTION ORDER setting; and a larger app name |
| Published | **167** | `09a69aa` | **Live as Sites Version 163.** FLEETSTEP branding is applied across the app and the Down Sheet scoreboard defaults to one total with details available on request |
| Published | **166** | `1de3d68` | **Live as Sites Version 162.** Defects move instead of copying, removal stays scoped, the ALREADY LOGGED banner can OPEN IT, and Search clears on tap with a CLEAR tag |
| Published | **165** | `ba3fb13` | **Live as Sites Version 161.** Deferred buses can check in once with a switchable prompt; TransitKey naming, Lite Mode groundwork, and Farebox Won't probe & open are included |
| Published | **164** | `945cc29` | **Live as Sites Version 160.** The Down Sheet UPDATED BY cell's divider now extends cleanly across the full row |
| Published | **163** | `5381dd2` | **Live as Sites Version 159.** Realtime falls back to polling if unreachable; Down Sheet actions sit at the row end and MARK FIXED confirms first; and UNDO FIX returns a repair to its originating workflow or is not offered when no open workflow exists |
| Published | **162** | `168f553` | **Live as Sites Version 158.** Road tally filters no longer rewrite the Down Sheet scoreboard; both operational pages use compact Advanced Actions; Deferred updates immediately and can be ended from its drawer; and a Defect Log location opens the Facility Map move workflow |
| Published | **161** | `3b16d45` | **Live as Sites Version 157.** Row-level Down Sheet DELETE, PUT BACK, MARK FIXED and undo actions; independent inspection tallies; Mystery Buses on the Down Sheet; and Defect Log controls behind Advanced Actions |
| Published | **160** | `bbe33f6` | **Live as Sites Version 156.** REFRESH is available on every page for home-screen use, and the Main Garage Ready boundary runs vertically between bays 6 and 7 without moving buses or slots |
| Published | **159** | **`2afa491`** | **Live as Sites Version 155.** A Down Sheet removal travels, so a cleared sheet stays cleared: removals are recorded, pushed as tombstones by `entry_id`, refused on the way back in, and the map's Down Sheet flags follow the sheet the pull settled on |
| Published | **157** | `baffc24` | **Live as Sites Version 153.** The Down Sheet says which of its buses are out on the road, and the sheet's own words outrank what the scan guessed they meant; it includes road tallies, corrected catalog matching, MDT SCREEN normalization, OFF PROPERTY review callouts, typed Fixed Repairs bus entry, and the ON ROAD badge on every Down Sheet row |
| Published | **158** | `a444242` | **Live as Sites Version 154.** Deferred no longer hides its way back: every genuinely held-back Defect Log repair has a visible UNDO DEFERRED action in its expanded card and Focus view; it returns the repair to Open, stamps the return as history, and never changes Down Sheet-owned Deferred work |
| Then | **156** | `103b005` | **A PM line with seven buses on it stops counting as seven down buses** — the scan carried the words "PM'S" on the first bus of the line only and left the other six blank under the UNSCHEDULED heading, inflating the down count by six off one line of paper; every bus on a printed line now takes that line's wording, and a row's own wording outranks the band heading it sat under |
| After | **155** | `6f8518b` | Rows 1–6 of the Main Garage are marked READY ROWS: a thick green line separates ROW 6 from ROW 7 in the grid, and a matching badge sits in the section's own title bar next to its bus count, ahead of a smart tracking system planned for later |
| Then | **154** | `fd3b326` | **A scan sweep can be taken back out of the Defect Log exactly** — sweep batches can be removed and restored safely across devices, both scanners accept contextual notes, and scan recognition and margin rows are corrected |
| Next | **153** | `015e789` | **Shop Cloud now runs on every page and merges shop changes live as they happen** — it includes the Version 152 tombstone/Down Sheet sync repair, improved scan review, catalog additions, and the corrected Deferred badge behavior |
| Published | **152** | `b57dcb5` | **The shop cloud has been failing on every sweep since Aug 31 and this fixes it** — merged-away tombstones are sent safely, Down Sheet rows can sync, scan review flags missed and uncertain rows, SHOP CLOUD moves to the top of MASTER, A-3/A-21/HAZMAT join the catalog, and the DEFERRED badge opens the matching filter |
| Previous live | **151** | `f5939df` | The Down Sheet divides itself into OFF PROPERTY, SCHEDULED, UNSCHEDULED and INSPECTIONS & SCHEDULED MAINTENANCE by default, each divider carrying its own count with the four counts and the total above the sheet, and the photo import reads the same four headings; Settings opens on a MASTER section holding MASTER EXPORT, MASTER IMPORT and RESTORE LAST GOOD COPY — every whole-device control in one place — and one theme for every page; ROAD CALL replaces PARTS ON ORDER in the Defect Log's work boxes: ticking it stamps a dated event on the bus, turns on the map's ROADCALL flag and parks the bus on the road, and the map's own ROADCALL checkbox records the same event; either can be taken back within sixty seconds; the card shows it under LATEST for seven days and a quick filter lists this week's road calls; PARTS ON ORDER moves to Fixed Repairs; unticking your only ticked box now sticks |
| Previous live | **150** | `6d62787` | **IMPORT ALL DATA restores a backup again** — it had thrown since Aug 31; every setting in the app lives on one Settings page, sixth in the nav behind the gear, one collapsible section per page with FACILITY MAP open by default, and the per-page gears are gone; MERGE DUPES moves there with its count on the button; a repair can carry a Technical Service Bulletin, and Low oil and Coolant level sensor are check-engine symptoms; ALL clears the search box; the page nav is drawn from one list |
| Previous live | **149** | `011bb09` | The Defect Log looks back five days for a duplicate report instead of two, and a repair can record that the operator reported it |
| Published | **148** | `60c2a01` | Bus List appears before Type Bus #, and Amerex has both Trouble Mod 1 Roof 2 and Trouble Mod 2 Roof 2 defects |
| Published | **147** | `9d69a9b` | The defect form names its bus boxes for what they do, and the typed bus number becomes the biggest control on the screen |
| Published | **146** | `1d5454b` | The Facility Map has a heading a screen reader can announce, the Down Sheet opens on + ADD DOWN BUS, a repair the bus already has is no longer logged twice, the Defect Log names which defect has the bus down, and Air System becomes Pneumatic System |
| Published | **144** | `9f1f73f` | The four save-screen choices are readable on a phone, and the search is called SEARCH |
| Published | **145** | `5aab35f` | The Defect Log opens on LOG DEFECT instead of a scoreboard, and Fixed Repairs can log a repair that never had a defect |
| Published | **143** | `f94608b` | The collapsed bus card carries no category glyph; each expanded defect row keeps its own |
| Published | **142** | `1ff1224` | Every card line sits at a fixed tab stop, the two purple badges are a matched pair, and the reading text comes up a step on all three feeds |
| Published | **141** | `e99e06a` | Enlarged Down Sheet badge on the Defect Log (Codex) |
| Published | **140** | `f0c7939` | SCAN SWEEP on the Defect Log reads the farebox and Ventra check-off sheets from a photo and files what they found |
| Published | **139** | `a33ffab` | Tech Services is grouped the way the shop's check-off sheets are laid out: Farebox, Ventra, CUBIC Screen, IBS Screen, Signs and Cameras |
| Published | **138** | `0969840` | A/C counts its fans, says Freon, and records the HVAC diag lamp and alarm number |
| Published | **137** | `69deec5` | Fleet Campaigns is pre-cached, so it is not blank on a phone that loses signal |
| Published | **136** | `dccf431` | Bus Controls splits into Operator/Driver Controls and Bus Accessories, and the stop request is named what the floor calls it |
| Published | 135 | `d3c05c3` | MERGE DUPES now completes its authorized cleanup, and repairs can record TEST DRIVEN and BRAKE TEST |

**Version 152 is live from `b57dcb5`.** The 136–152 handoffs are retained as release records; 141 was Codex's own change and has no handoff here.

**No release is pending.** Repository release 162 went out as Sites Version 158 from `168f553`, and release 163 followed as Sites Version 159 from `5381dd2`. Their retained handoffs below are release records only.

Version 152 sits on top of the published 151 — its first commit was cherry-picked onto Codex's release commit `e493516`, never merged over it.

Version 147 sits on top of the published 146 — it was rebased onto Codex's release commit `4c1e502`, never merged over it.

This file always describes the unpublished releases, and it lives at this exact
path on `main` so nobody has to be told where to look. Curtis approves a release
by pointing Codex at this file rather than pasting a summary out of a chat
window.

- **Claude Code** keeps this file current with every push to `main`: the source
  commit, what changed, any migration, and what to check once it is live. Claude
  Code never publishes and never marks a version live.
- **Codex** publishes from here, then in the same follow-up commit updates
  `docs/RELEASES.md` and `PROJECT_HANDOFF.md` and replaces this file with the
  next handoff, or resets it to `STATUS: NONE PENDING`.
- **STATUS: NONE PENDING** means everything on `main` is already live and there
  is nothing to publish. Read the status line before anything else.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` for the lifecycle itself; this file
supplies only what that runbook asks for — the exact source, what changed, and
what to check once it is live.

---

# Version 162 — A road tally stops rewriting the sheet's own scoreboard, and both surfaces get their controls out of the way

**On `main` and publishable now.** `168f553` is the head of `main`; PR #2 merged as a clean linear rebase onto `19ad355`, so this is the SHA to publish.

## Source

Release source: `168f553`

The commit list — `git log --oneline 19ad355..168f553`:

```
168f553 Make the location under a bus number the control that moves it on the map
ea5f4dd Give the Down Sheet its own ADVANCED ACTIONS, and put ADD DOWN BUS next to SEARCH
4b43ab8 Fold SHEET STATS into the tiles the Down Sheet is actually read from
d29f95c End a deferral from the drawer that lists it, and stop the badge going stale
8b70f37 Stop a road tally rewriting the sheet's own scoreboard, and clean up the Defect Log
```

The changed files — `git diff --name-only 19ad355..168f553 -- app tests`:

```
app/defect-log/defect-log-display-settings.ts
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/deferred-watch.tsx
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/storage.ts
tests/rendered-html.test.mjs
```

The size — `git diff --shortstat 19ad355..168f553`:

```
9 files changed, 682 insertions(+), 131 deletions(-)
```

Proof of no infra change — this returns nothing:

```
git diff --name-only 19ad355..168f553 -- supabase package.json package-lock.json .github public worker
```
(empty)

## Migrations

None.

One **new** LocalStorage key, `pace-down-sheet-advanced-open-v1` — whether the
Down Sheet's ADVANCED ACTIONS panel is open. Documented in `CLAUDE.md`.

⚠️ **One key stops being read, and it is not a rename.**
`pace-down-sheet-stats-open-v1` no longer appears in `app/` because the SHEET
STATS panel it opened is gone. The key is still listed in `CLAUDE.md`, marked
`NO LONGER READ`, and values already on devices are left alone. Nothing is
renamed and nothing is rewritten — a diff of the key sets reachable in `app/`
at each end of the range shows exactly one added and that one removed.

## What was wrong

**Pressing a road tally rewrote the whole scoreboard above it.** INSPECTIONS ON
ROAD and DOWNED BUSES ON ROAD narrow the sheet to what they count — but the
tally and the six tiles above shared one grouping, so pressing one recomputed
all of them. Measured on a 30-row sheet: TOTAL ON SHEET fell 30 → 4, DOWN BUSES
19 → 0, UNSCHEDULED 19 → 0. A foreman who pressed it to read the list off the
sheet lost the numbers he had pressed it from. Reported off the live sheet.

**The DEFERRED badge did not move until a refresh.** The browser's `storage`
event fires in OTHER tabs, never in the tab that did the writing, so anything
reading LocalStorage on its own went stale. Measured on the old code: press
UNDO DEFERRED, the record reads "open" in storage, and the badge still reads
2 DEFERRED until a reload turns it into 1.

**A held bus could not be released from the drawer that listed it.** The only
END DEFERRAL was inside an expanded Defect Log card — which means finding the
bus again in the feed you had just filtered away from.

**SHEET STATS was a second scoreboard.** It sat behind its own bar saying most
of what the tiles below already said, in a different shape.

**Both pages opened on their controls rather than their work.** The Down Sheet
put six controls between the button that adds a bus and the search box.

**Three Defect Log buttons had silently lost their styling.** AI OPERATOR,
CLEAN UP and the two scan buttons' disabled states were styled through
`.feed-title` selectors; carried into ADVANCED ACTIONS in release 161, those
selectors matched nothing. Nobody removed the gradient or the border — they
stopped applying, and a green suite had nothing to say about it.

**The location on a Defect Log card was read-only.** It was the one fact on the
card a mechanic reads and then has to go to another page to act on.

## What changed

**The Down Sheet scoreboard is grouped from the whole sheet.** Only the table,
the row count in view, the estimate and the note follow the road filter,
because those describe the view. Pressing a tally again to clear it is
unchanged. Same fixture after: TOTAL 30, DOWN BUSES 19 and UNSCHEDULED 19 all
hold while the table narrows to 4.

**SHEET STATS folded into those tiles and the panel is gone.** PENDING,
ACCIDENT, WAITING PARTS, COMPLETED TODAY, EST. ACTIVE LABOR and SHEET CAPACITY
are tiles in that grid now; COMPLETED TODAY stays a button because it filters.
ACTIVE DOWN did not come with them — it counted the whole ACTIVE sheet while
TOTAL ON SHEET counts the CURRENT VIEW, which is what made them look identical
on ALL with no search. SHEET CAPACITY still prints the whole-sheet count.
EST. CURRENT VIEW now renders only when it differs from EST. ACTIVE LABOR.

**Both surfaces have an ADVANCED ACTIONS panel in the header, under REFRESH.**
The Down Sheet's holds the shift filter and SHOW COMPLETED under VIEW, and SCAN
SHEET with the recovery buttons under TOOLS; ADD DOWN BUS and SEARCH now sit
together. **Its button is purple, `#6b31b6`, on purpose** — both headers are
navy, and the Defect Log's translucent white here would have made the two
pages' headers read as the same header.

**The DEFERRED badge follows a write in the same page.** The two record writers
announce a successful write in this document as well — only inside the try,
because a refused write changed nothing.

**END DEFERRAL is in the drawer, beside MOVE / LOCATION.** It releases every
deferred repair on the bus rather than the one whose timer the row shows: the
drawer is one card per BUS and a deferral is per DEFECT.

**The three Defect Log buttons have their paint back**, and LIVE REPAIR FEED
goes from 12px to 17px. A stored value equal to the *superseded* default is
read as no choice — otherwise raising the default would have reached nobody,
since the whole Settings blob is written whenever anything in it is saved.

**The location under a bus number moves the bus on the Facility Map.** It opens
the move editor this page already opens from the deferred drawer. It is a tap
target rather than a dropdown, and that was measured: a native select cannot
wrap, and bound to the location it truncated 13 of the 17 labels at 390px —
Main Garage needed 49px against 38px of room.

## Verified

Gates re-run on `168f553` itself: `npm test` **237 pass, 0 fail** (it builds
first), `npm run lint` clean, `npm run build` succeeds. CI green on the same
tree.

Measured in Chromium at 360, 390, 430, 844 and 932 landscape, 820 and 1180
iPad, and 1280, reproducing each fault first:

| | before | after |
| --- | --- | --- |
| TOTAL ON SHEET under a road filter | 30 → **4** | 30 → **30** |
| DOWN BUSES under a road filter | 19 → **0** | 19 → **19** |
| DEFERRED badge after ending a deferral | **2**, until a reload | **1**, no reload |
| AI OPERATOR background | `none` | `linear-gradient(120deg,#4a2389,#7138c5)` |
| CLEAN UP border | `0px` | `1px solid` |
| LIVE REPAIR FEED | 12px | 17px |
| Location labels truncated at 390 | 13 of 17 as a select | **0** |
| Down Sheet page overflow at 1180 | **40px** with the column uncapped | **0** |

Failure paths driven on purpose: a refused fleet write leaves the move editor
open, the card showing the old location, and the stored board byte-identical;
a refused save stops a deferral release rather than writing a half-done board.

## What to check once it is live

1. On the Down Sheet press **INSPECTIONS ON ROAD**. The sheet narrows; TOTAL ON
   SHEET, DOWN BUSES and the four bands must not move. Press again to clear.
2. SHEET STATS is gone — PENDING, ACCIDENT, WAITING PARTS, COMPLETED TODAY,
   EST. ACTIVE LABOR and SHEET CAPACITY are tiles in the block below.
3. **ADVANCED ACTIONS** in the Down Sheet header is purple; the Defect Log's is
   not. ADD DOWN BUS and SEARCH sit together underneath.
4. Open the DEFERRED badge, press **END DEFERRAL** on a bus: it leaves the list
   and the badge count drops immediately, with no refresh.
5. On the Defect Log, ADVANCED ACTIONS: **AI OPERATOR** is purple again and
   **CLEAN UP** has a border.
6. Press the location under a bus number — the move editor opens, and the bus
   lands where you put it on the Facility Map with its defects untouched.
7. Turn the phone sideways and check on the iPad: nothing should slide
   sideways on either page.

---

# Version 160 — REFRESH on every page, and the garage split by bay instead of by row

**Publish this after Version 159.** Two things reported in one message, both
about pages that could not be operated the way they are actually used.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`bbe33f6`** |
| Last code-bearing commit | `bbe33f6` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 159, pending from `2afa491` |

**One application commit** on top of 159's `2afa491`:

```
git log --oneline 2afa491..bbe33f6     # docs-only commits omitted
bbe33f6 Put REFRESH on every page, and split the garage by bay instead of by row

git diff --name-only 2afa491 bbe33f6 -- app tests
app/defect-log/page.tsx
app/down-sheet/page.tsx
app/fixed-repairs/page.tsx
app/globals.css
app/lists/page.tsx
app/page.tsx
app/refresh-button.tsx      (new)
app/settings/page.tsx
tests/rendered-html.test.mjs

git diff --shortstat 2afa491 bbe33f6
 10 files changed, 400 insertions(+), 58 deletions(-)
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only 2afa491 bbe33f6 -- supabase package.json package-lock.json .github public worker   # returns nothing
```

Gate: **230 tests passing** (228 at Version 159, one added for REFRESH and one
for the handoff files; the garage test was rewritten in place), ESLint clean,
production build succeeds.

## Migrations

**None, and nothing already stored is rewritten.** No storage key, payload shape
or database change. The garage change is presentation only: no slot id moves, no
bus moves, and `garage-0` through `garage-83` mean exactly what they meant
before.

## What changed

### 1. REFRESH is on all six pages

Saved to a home screen the app runs standalone, with no browser chrome — no
address bar and no reload. A stale version, or a page that had got itself into a
bad state, could only be cleared by closing and reopening the app, and even that
does not force the service worker to look for an update. The Facility Map had a
REFRESH button in its command bar; the other five pages had nothing.

> "The refresh button is for when I make it a bookmark. I noticed I cannot
> simply refresh like the browser version. That is why I want it"

It is the map's own button, made shareable rather than copied, so there is one
definition of what refreshing means: **ask the service worker for a new version
first, then reload.** A bare reload serves the cached shell again and looks like
the button did nothing, which is the whole failure this exists to fix.

The map passes its own class and keeps the command-bar look it already had; the
other five take the header shape, beside the page nav. The map's phone menu
offers the same action and now goes through the same function, so the two cannot
drift apart. On a phone the button is full width and 44px tall.

### 2. The Main Garage divider runs down, not across

Version 155 marked bays 1–6 as ready with a thick green line — and drew it the
wrong way, horizontally, under ROW 6.

> "when we referred to a bay it was actually going front to back up. It's going
> front to back not side to side... there's no such thing as rows in the shop.
> It's either bay one through 12."

A bay in this shop runs front to back and is numbered 1 to 12 across the top of
the grid. Each numbered column is one bay, however many rows deep the grid is
drawn. The line across named a thing the floor does not have.

The line now runs **down, between bay 6 and bay 7** — on the column header and
on that column's cell in every row. It is drawn in the frame colour rather than
a green of its own, because `--garage-frame` already draws this grid's borders,
its numbers and its row labels, and a barrier belongs to the structure of the
garage rather than competing with it. The heading badge reads **BAYS 1–6 READY**
and takes the same colour, so recolouring the garage in Settings recolours both.

The row labels stay. The app still needs a way to say *which space in a bay*, but
they are a grid coordinate now rather than a place anybody would name out loud.

## Verified

Measured in a browser against the production build, not read off the CSS:

- The divider class lands on the **bay 07** column header and on column index 6
  in **all seven rows** — one continuous vertical line, 4px, `rgb(6,45,102)`,
  which is `--garage-frame`.
- **No horizontal border remains anywhere in the grid**: the old line under
  ROW 6 is gone, not merely overpainted.
- The heading badge renders `BAYS 1–6 READY` in the same colour.
- REFRESH on the Down Sheet at 390px: 44px tall, full width, not overlapped by
  any fixed element, and the document does not scroll horizontally.

## What to check once it is live

1. **REFRESH appears on all six pages** — Facility Map (command bar), Down
   Sheet, Defect Log, Fixed Repairs, Fleet Campaigns and Settings (beside the
   page nav).
2. **It works from the home screen.** Open the bookmarked app, press REFRESH,
   and it reloads and picks up this version. That is the case it was built for.
3. **The Main Garage line runs top to bottom**, between bay 06 and bay 07, in
   the same dark blue as the grid's numbers and borders — and there is no
   horizontal line across the middle of the grid any more.
4. **The heading badge says BAYS 1–6 READY**, not ROWS.
5. **No bus moved.** The grid is the same grid; only the line and the badge
   changed.

---

# Version 159 — A Down Sheet removal travels, so a cleared sheet stays cleared

**The only pending release.** This is not a feature. It is a live data fault the
shop is looking at on the floor: the Down Sheet inflates itself on every sync, a
cleared sheet refills, and it gets worse the longer it runs — every sheet that is
scanned adds rows the cloud never lets go of.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`2afa491`** |
| Last code-bearing commit | `2afa491` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Repository release 158, live from `a444242` as Sites Version 154 |

**One application commit** on top of Codex's release commit `909f482`:

```
git log --oneline 909f482..2afa491     # docs-only commits omitted
2afa491 Make a Down Sheet removal travel, so a cleared sheet stays cleared

git diff --name-only 909f482 2afa491 -- app tests
app/cloud-client.ts
app/cloud-live.ts
app/cloud-sync-control.tsx
app/cloud-sync.ts
app/down-sheet/page.tsx
app/page.tsx
app/shop-cloud-live.tsx
tests/rendered-html.test.mjs

git diff --shortstat 909f482 2afa491
 8 files changed, 440 insertions(+), 27 deletions(-)
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only 909f482 2afa491 -- supabase package.json package-lock.json .github public worker   # returns nothing
```

Gate: **228 tests passing** (226 before this, two added), ESLint clean,
production build succeeds. Rebased onto `909f482` after Codex published 157 and
158; the gates were re-run on the rebased commit, not only on the original.

## Migrations

**None, and nothing already stored is rewritten.** No schema change: the
`deleted_at` column this uses has been on `down_sheet_entries` since migration
`0002_shared_records.sql`, unused by the Down Sheet until now.

One new LocalStorage key, `pace-cloud-removed-entries-v1`, written on a removal
and read on a sync. No existing key is renamed, reshaped or read differently. A
device that has never removed anything has no such key and behaves as it did.

## What was wrong

Reported from the floor on Sep 7: a Down Sheet photo was scanned, the total came
back correct at **57**, and about fifteen seconds later — one live-sync round
trip — the same sheet read **92**. Clearing the sheet first changed nothing; it
refilled the same way. With nothing on the sheet at all, the page still reported
"26 other buses".

Nothing was wrong with the scan, and the ON ROAD tallies added in 157 had
nothing to do with it. The Down Sheet had no way to say that a row was gone.

A push only ever sends what the sheet still carries. An entry taken off was
therefore simply not sent — it was not removed anywhere. The row stayed live on
the server, the next pull read it back, and `mergeDownSheet` keeps every
incoming entry the receiver lacks, which is correct and deliberate: it is what
lets two devices each add buses without either one erasing the other's. Applied
to a removal, it means the removal loses every time.

Counted in the shop's own table, `down_sheet_entries` holds **93 rows, none of
them tombstoned**, the oldest stamped `2026-08-30 19:24`:

| Day | Rows | Buses |
| --- | --- | --- |
| Aug 30 | 23 | 23 |
| Sep 5 | 4 | 4 |
| Sep 6 | 6 | 6 |
| Sep 7 | 60 | 57 |

Thirty-three of those rows are sheets that were replaced days ago. **57 + 33 =
90**, which is the number the screen was adding up — the two either side are
rows the sheet counts and hides.

The second half of the symptom follows from the first. Once a stale entry is
merged back in, the map marks that bus down again; and a bus left marked down
with no entry behind it is not inert, because `entriesFromFleet` mints a **brand
new** entry for it the next time the Down Sheet page loads — under an id nothing
has ever removed. That is the "26 other buses" on a sheet that was just cleared.

## What changed

The same three parts that already fixed exactly this for merged-away defects in
release 152, applied one table over.

### 1. A removal is written down

A new ledger, `pace-cloud-removed-entries-v1`, records the entry id and when it
came off. It is written wherever a removal actually happens, which is three
places, not one:

* **CLEAR DOWNSHEET** on the Down Sheet.
* **A scan that replaces the sheet** — every bus the new sheet does not name.
  This is the commonest removal in the shop and it was the one that travelled
  least.
* **The AI Operator's own clear**, issued from the Facility Map. Same operation,
  different door, same ledger.

Bounded at 2000 entries, oldest dropped first, because a scan a day forever is
otherwise a key that only grows — and this app shares LocalStorage with a
four-hundred-bus board that must never be the thing that fails to save. The
oldest end is the safe end: a tombstone that has landed is kept by the server
for good, and anything old enough to fall off here landed days ago.

### 2. The removal goes up as a tombstone, as an UPDATE

`down_sheet_entries.fleet_number` is `NOT NULL`, and Postgres checks that on the
INSERT half of an upsert **before** it reaches the conflict on `entry_id`. So a
tombstone — which deliberately carries no fleet number, because writing a
repair's fields back while deleting it would let a stale copy overwrite the
version that survived — can never ride in an upsert; it would take the whole
200-row chunk down with it. That is the precise failure that kept the shop cloud
red for a week on `bus_defects`, and the planner already knew how to route
around it. It now splits `down_sheet_entries` the same way: repairs are
upserted, tombstones are `UPDATE … WHERE entry_id = …`.

An entry the sheet still carries is **never** tombstoned, whatever the ledger
says. That is what keeps UNDO safe in the window before the ledger is cleared,
and it means a stale ledger can never delete a live repair.

### 3. They come back down, and take the local copies with them

A pull now reads the entry tombstones alongside the defect ones and drops the
matching entries from this device — **unless this device has touched one since
the removal.** Work done on a repair after somebody else cleared the sheet is
real work, and it is what wins: the copy stays, its next push puts the row back
for everyone, which is the honest outcome when two people disagreed about
whether a bus was still down.

### 4. The map follows the sheet a pull settled on

`applyCloudPull` now reconciles the board's `down` flags against the sheet it
just wrote. Leaving that to the Down Sheet page is what let this survive a
clear — the page only reconciles when it is the page you are on, and
`entriesFromFleet` re-mints an entry for any bus still flagged down. The rule
enforced here is the schema's own: the Down Sheet says which buses are down and
the map reads it back.

### 5. Putting a sheet back still works

A live entry now sends `deleted_at: null` out loud, the way a live defect
already did, so restoring an entry clears the tombstone the removal sent instead
of leaving it standing. **UNDO CLEAR** and **UNDO IMPORT** both take the entries
back off the ledger and restamp them as touched now — both halves are needed,
because the server compares `updated_at` to decide whether a write beats a
tombstone, and an entry put back carrying its old stamp would lose that
comparison and be deleted again on the next pull, silently. Restoring a sheet is
touching it, so the stamp is honest.

UNDO IMPORT also removes, in the other direction: rows the scan itself created
come off everywhere, not just here.

## Verified

Replayed through the real merge path against real storage, using the shop's own
numbers — a 57-bus sheet on the device, 33 stale rows in the cloud:

| | Sheet total after one pull | Buses marked down on the map |
| --- | --- | --- |
| Without the ledger (what the shop is running now) | **90** | 57 |
| With removals recorded | **57** | 57 |

Two tests were added, covering the tombstone's shape, its routing as an UPDATE
against a fake server that rejects the old shape in the server's own words, the
"never tombstone an entry the sheet still carries" rule, the newer-copy
tie-break, the end-to-end drop through `applyCloudPull` including the map
reconcile, the ledger's cap, and every place a removal or an undo is recorded.

## What to check once it is live

1. **The count holds.** Scan a Down Sheet, note the TOTAL ON SHEET, and leave
   the page open for a minute. It must not move on its own.
2. **Clearing sticks.** CLEAR DOWNSHEET, wait through a sync, and the sheet must
   stay empty — on this device and on any other device signed in.
3. **The stale days are gone.** After the first scan or clear on the fixed
   build, the Aug 30 / Sep 5 / Sep 6 buses do not come back. They are removed by
   the ordinary replacement the scan already performs; nothing has to be done to
   the database by hand.
4. **Undo still works both ways.** UNDO CLEAR and UNDO IMPORT put the sheet back
   and it stays back through a sync, rather than emptying again a few seconds
   later.
5. **The map agrees.** A bus taken off the sheet loses its DS badge on the
   Facility Map, and no bus wears the badge without a row on the sheet.

---

# Version 157 — The sheet says who is on the road, and its words outrank the scan's guess

**Publish this after Version 156.** Three things reported off the same morning's
work: no way to tell from the Down Sheet whether a bus is actually out working,
a scanned row filed as a repair the row never mentions, and the Fixed Repairs
form offering no way to type a bus number.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`baffc24`** |
| Last code-bearing commit | `baffc24` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 156, pending from `103b005` |

**Four application commits** on top of 156's `103b005`:

```
git log --oneline 103b005..baffc24      # docs-only commits omitted
baffc24 Put an ON ROAD badge beside the bus number on every Down Sheet row
17ccbc5 Say on the Down Sheet which of its buses are out on the road
e8cc258 Let Fixed Repairs take a typed bus number instead of only a dropdown
62bb58d Let the words written on a scanned row outrank the catalog repair the scan guessed at

git diff --name-only 103b005 baffc24 -- app tests
app/api/down-sheet-scan/route.ts
app/down-sheet/down-sheet-scan-import.ts
app/down-sheet/down-sheet-view.ts
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/down-sheet/scan-catalog-match.ts     (new)
app/fixed-repairs/fixed-repairs.css
app/fixed-repairs/page.tsx
tests/rendered-html.test.mjs
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only 103b005 baffc24 -- supabase package.json package-lock.json .github public worker   # returns nothing
```

Gate: **226 tests passing** (223 at Version 156, three added; the road test grew to cover the badge), ESLint clean,
production build succeeds.

## Migrations

**None, and nothing already stored is rewritten.** No storage key, payload
shape or database change. The scan half changes what a scan produces, so it
reaches a sheet only when one is scanned. No catalog entry was added, renamed
or retired.

## What changed

### 1. The Down Sheet can say which of its buses are out on the road

The map's down-sheet badges answer "is this bus on the sheet?" while you are
looking at the yard. Standing at the sheet there was no way to ask the inverse —
"is this one actually out working?" — which is the question behind deciding what
can be caught this shift and what has to wait for the bus to come in. The sheet
could not answer it on its own, because where a bus is belongs to the map.

Two tallies join the five, making seven: **INSPECTIONS ON ROAD** and **DOWNED
BUSES ON ROAD**. Both are pressable, and pressing one holds the sheet below down
to exactly the buses it counts, so the number can be read as a list. Pressing it
again gives the whole sheet back, and a line under the tiles says which one is
holding it, with the way out.

**A bus carrying both is counted in both**, which is why these are not simply the
existing bands filtered by location. The sheet folds a bus into the one row it is
allowed, so a bus that came due for a PM and is also missing on cylinder 5 has a
single row reading `PM'S / MISFIRES`. The bands must pick one and they pick the
fault, correctly — a bus with a live misfire is down. But somebody still owes it
a PM, and neither errand disappears because the other exists. So these ask what
the row **mentions** rather than where it was filed. PM DEFECTS stays out of the
inspection tally and in the down one, since those are the faults found while
doing a PM.

The counts are taken **before** the filter is applied, so pressing one tally does
not empty the other out from under the person reading it: both keep saying what
they always said and only the sheet narrows. "On the road" is the same test
`smart-status.ts` uses to decide a bus is in service, written once so the sheet
and the map cannot disagree; a bus the map has never placed is not asserted to be
anywhere.

The five existing tiles are unchanged and remain a scoreboard — only the two new
ones are pressable, and they are shaped like buttons to say so.

And the same fact rides on every row: an **ON ROAD** badge beside the bus
number, so it reads while scrolling without pressing anything. It sits outside
the row's edit button deliberately — where a bus is comes from the map and this
page only reads it, so a badge inside the button would look like a way to change
it. Two things about it were measured in the built page rather than assumed: it
never wraps, and with it hidden by CSS every row height is byte-for-byte what it
was, so it costs no vertical space; and it was clipped by exactly 21px on first
render, because the bus column's 108px fitted the number and its status label
precisely. That column is 148px now and the table's min-width rose by the same
40px, so widening it takes no room from any other column — the table simply gets
40px longer inside the scroller it already lives in.

### 2. A row filed as a repair it never mentioned — and a review screen that could not show it

Line 25 of the 09/6 sheet reads `MISFIRE CYL # 5 / MDT SCREEN` against bus
15508. The scan kept those words — it always does, verbatim — and filed the row
as **Engine / Stabilizer link**. A stabilizer link is a suspension part and
nothing on that row mentions one. The catalog was never the problem: Misfire is
an Engine option, sitting there to be picked.

There was a second failure underneath, and it is the one that let this reach the
sheet. "Stabilizer link" is not in the Engine list at all, so the answer named a
category and a repair that cannot go together — and the review screen's REPAIR
dropdown can only display an option its category actually contains. It fell back
to showing that category's **first** option while the import stored the original.
**The reviewer approved "Check engine light" and the sheet recorded "Stabilizer
link".** What was approved was not what was filed, for any row where the scan
crossed a category, and nothing on screen said so.

The written words now choose the catalog entry. The catalog becomes a set of
phrases to look for; when the shop's wording names a repair, that is the repair —
unless the scan's own pick is also named there, in which case it was reading the
same row and is left alone. The earliest fault written wins, because the crew
writes what matters first and lists the rest after a slash. **The reason itself
is never altered.** Whatever ends up on the row, its category can display it, so
the review screen and the import can no longer disagree.

It is deliberately timid, and every phrase was read off the generated list before
this shipped: nothing under five characters, no "Other …" entries, no names with
brackets, and six generic Bodywork words skipped by name — broken, loose,
missing, damaged, paint, trace — because "LOOSE MIRROR" is not a Bodywork/Loose
row. Four phrases name two catalog entries each; the scan's own category breaks
the tie.

### 3. MDT SCREEN is a word the catalog no longer has

The other half of that row exposed a gap of its own. The shop still writes **MDT
SCREEN**; the catalog renamed it to **IBS Screen** some releases ago. So the
model is handed a list with no "MDT" in it anywhere and cannot match the phrase
however plainly it is written. The translation is now asked of the app's
existing rename table rather than copied into a second one, so `MDT SCREEN`
resolves to `Tech Services / IBS Screen - INOP (general)` — the same answer a
stored record gets when it is read back.

### 4. An OFF PROPERTY filing with nothing behind it

The same row was also filed OFF PROPERTY, which takes a bus out of the yard's
down count entirely — and alone among the four bands, nothing on the row has to
justify it. The sheet says a bus is away by naming where it went in the
MECHANIC/LOCATION column, or by the OFF PROPERTY heading above it.

A row that reaches for that band with **no vendor named and no location or
off-property wording anywhere** is now called out on the review screen. It is
flagged rather than overridden: under a genuine OFF PROPERTY heading the
location column is often blank, and making a foreman re-tick that whole band
would cost more than it saves. **The root cause of this particular
misfiling was not determined** — the scan output that produced it was not
available — so this is a guard that makes it visible before import, not a fix
for a diagnosed bug.

### 5. Fixed Repairs takes a typed bus number

LOG A REPAIR offered only a dropdown of the whole fleet — the one place in the
app where a bus number could not simply be typed, and the slow path for working
through a stack of work orders. **TYPE BUS #** now comes first and is the
biggest control in the box, taking a full fleet number or the last two digits
through the same resolver the map and the Defect Log use. The dropdown stays
underneath.

The box reports on every keystroke — which bus it landed on, that two digits
matched more than one and need the full number, or that nothing matches —
because silently landing on the wrong bus is how a repair gets logged against
somebody else's work order. A number that resolves to nothing leaves the record
on the bus it was already on, so a half-typed number never wipes a selection.

FIX / STEPS TAKEN had `autoFocus` unconditionally and renders later in the DOM,
so it silently won the race and the cursor landed two boxes past where the
typing was headed. It keeps the focus when editing an existing record, where
there is no bus box, and yields it on a new one.

## Validation

- 226 regression tests passing, ESLint clean, production build succeeds
- **The road tallies driven against the PRODUCTION build**, zero console errors:
  eight entries across road, garage and vendor locations give INSPECTIONS ON
  ROAD **3** and DOWNED BUSES ON ROAD **3** with one bus in both; pressing the
  first narrows the sheet to 17510, 17512 and 17516 **while both tallies stay at
  3**; pressing the second shows 17511, 17512 and 17513; pressing it again
  restores all eight rows and clears the note. Seven tiles lay out as five and
  two at 1280px and stack full width at 390px
- **The ON ROAD badges measured on the same run:** they appear on the five buses
  in road slots and on none of the three in the garage or at a vendor, each to
  the right of its number and on the same line, with 20px of headroom left in
  the cell; hiding the badge leaves every row height unchanged, so the taller
  row in that fixture is its longer reason text wrapping and not the badge
- **The counting rules are pinned by their own assertions:** a bus reading
  `PM'S / MISFIRES` is in both tallies while its band stays UNSCHEDULED; PM
  DEFECTS is in the down tally only; a row with nothing written falls back to how
  it was filed; buses in the garage and at a vendor are in neither; and a bus the
  map has never placed counts nowhere
- **The 15508 row driven through the real scanner against the PRODUCTION
  build**, its exact response stubbed, zero console errors: the review screen
  shows **Engine / Misfire**, its dropdown can display that value, the reason
  still reads `MISFIRE CYL # 5 / MDT SCREEN`, and the row carries both notes —
  what the repair was read from, and that the OFF PROPERTY filing has nothing on
  the row behind it
- **Fixed Repairs driven against the PRODUCTION build**, zero console errors:
  the form opens with the cursor in TYPE BUS #; typing `17525` moves the record
  off the bus it opened on; `25` resolves to the same bus; `08` reports matching
  15508 and 17508 and moves nothing; `99` reports no match and leaves the
  previous bus in place
- **The timid rules are pinned by their own assertions:** LOOSE MIRROR, BROKEN
  SEAT and DAMAGED TRIM name no repair; a substring never fires ("no crank" does
  not match "NO CRANKING NOISE"); a pick the words support is left alone; a real
  repair under the wrong category moves to the category that owns it; a repair
  this app does not have at all becomes Miscellaneous rather than an invented
  specific one; and a named vendor or off-property wording silences the
  off-property flag
- **Only one field claims focus**, asserted by count, so the race that caused
  the cursor to land in the wrong box cannot come back

## After it is live

1. **Open the Down Sheet.** There should be seven tiles. Press INSPECTIONS ON
   ROAD and the sheet should hold down to just those buses; press it again for
   the whole sheet. A bus on the sheet for both a PM and a fault should appear
   under both tallies, with its row still sitting in its own band.
2. **Scroll the sheet.** Every bus that is out should carry a green ON ROAD
   badge beside its number, and no row should have grown taller for it.
3. **Cross-check one against the map.** Every bus the road tallies list should
   be sitting in IN SERVICE / ON ROAD on the Facility Map, and none of them in
   the garage or off property. This is the check that the two pages agree.
4. **Rescan the sheet with line 25 on it.** Bus 15508 should read Engine /
   Misfire, with the written words still saying `MISFIRE CYL # 5 / MDT SCREEN`,
   and a note on the row saying where the repair was read from.
5. **Look at the notes on the review screen generally.** Rows whose repair was
   corrected, and rows headed OFF PROPERTY with nothing on them to justify it,
   both say so now. The off-property one is worth a glance at the paper.
6. **Scan a sheet with an MDT SCREEN row.** It should land under Tech Services
   as IBS Screen rather than being guessed at.
7. **Open Fixed Repairs → LOG A REPAIR.** The cursor should already be in TYPE
   BUS #; type a full number or the last two digits and watch the bus underneath
   follow, then fill in the repair as before.
8. **Type two digits that match more than one bus.** It should say which buses
   and wait for the full number rather than picking one.

## The way back

Measured in a throwaway worktree from `baffc24`:

- `git revert baffc24` alone is **clean** and removes the ON ROAD badge and the
  bus column's extra width, leaving the two tallies in place.
- `git revert baffc24 17ccbc5` (newest first) is **clean** and removes the road
  work entirely, leaving the scan work and the typed bus number in place.
- `git revert baffc24 17ccbc5 e8cc258 62bb58d` (newest first) is **clean** and
  takes the whole release out, back to 156.
- Reverting any of the earlier three **on its own** conflicts in
  `tests/rendered-html.test.mjs`, because the later commits appended to the same
  file. Revert from the newest down, as above.
- Nothing in this release writes new stored state, so there is nothing to clean
  up going backwards. Rows imported while it was live keep the repair they were
  imported with.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 157 | Live | <published tip hash> | The Down Sheet can now say which of its buses are actually out on the road — the inverse of the map's down-sheet badges, and a question the sheet could not answer on its own because where a bus is belongs to the map. Two pressable tallies join the five, INSPECTIONS ON ROAD and DOWNED BUSES ON ROAD, and pressing one holds the sheet down to exactly the buses it counts so the number can be read as a list. A bus carrying both a PM and a fault is counted in both, because the sheet folds a bus into one row and the bands must pick one for it: they pick the fault, correctly, but somebody still owes it a PM. The counts are taken before the filter is applied so pressing one does not empty the other, and "on the road" is the same test the map uses to decide a bus is in service. Every row also carries an ON ROAD badge beside its bus number, outside the edit button because where a bus is belongs to the map, sized so it costs no row height and clips nothing. What the sheet says now also outranks what the scan guessed it meant. A row reading MISFIRE CYL # 5 / MDT SCREEN was filed as Engine / Stabilizer link — a suspension part on a row that mentions none — and because that repair does not exist under that category, the review screen's dropdown could not display it and showed the category's first option instead, so the reviewer approved one repair and the sheet stored another. The written words now choose the catalog entry, the earliest fault written winning, with the reason itself never altered and the result always displayable by its own category. The matching is deliberately timid: nothing under five characters, no "Other" entries, and generic condition words like loose and broken skipped by name. MDT SCREEN, which the shop still writes and the catalog renamed to IBS Screen, resolves through the app's own rename table. And a row filed OFF PROPERTY with no vendor or location named anywhere on it is now called out on the review screen, since that band alone takes a bus out of the yard's down count without anything on the row having to justify it. Fixed Repairs also takes a typed bus number — full number or last two digits, through the same resolver as the rest of the app — instead of only a dropdown of the whole fleet |
```


# Version 156 — A PM line with seven buses on it is not seven down buses

**Publish this after Version 155.** It fixes a counting error the foreman
reported off a real sheet: line 53 reads PM'S with seven bus numbers after it,
and six of those seven were landing in UNSCHEDULED instead of INSPECTIONS,
inflating the down count by six off one line of paper. The crew writes the
week's PMs on one line most weeks, so this is not a one-off.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`103b005`** |
| Last code-bearing commit | `103b005` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 155, pending from `6f8518b` |

**One application commit** on top of 155's `6f8518b`:

```
git show --stat 103b005
 app/api/down-sheet-scan/route.ts         |   2 +-
 app/down-sheet/down-sheet-scan-import.ts | 109 +++++++++++++++++++++++++++++--
 app/down-sheet/down-sheet-view.ts        |   8 +++
 tests/rendered-html.test.mjs             |  99 ++++++++++++++++++++++++++++
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only 6f8518b 103b005 -- supabase package.json package-lock.json .github public worker   # returns nothing
```

Gate: **223 tests passing** (222 at Version 155, one added), ESLint clean,
production build succeeds.

## Migrations

**None, and nothing already stored is rewritten.** No storage key, payload
shape or database change. This changes what a SCAN produces, so it reaches a
sheet only when one is scanned — which is exactly how the foreman will use it,
by rescanning. A sheet already imported wrongly is corrected by rescanning it:
the scan is an authoritative replacement of the sheet, as it always has been.

## What changed

### 1. Why six buses on one line became six down buses

The model splits a multi-bus line into one row per bus correctly. What it does
not do reliably is repeat the line's wording on each of them: it carries the
words on the FIRST row and leaves the rest blank, then stamps those blank rows
with whatever band heading they sat under. On line 53 that heading is
UNSCHEDULED, so six buses arrived carrying no reason and a section of Pending.

With nothing written to read, the page falls back to the section, sees Pending,
and files each one as a bus that is down with nobody assigned. **Measured on
the old code against that exact model output: 1 inspection, 6 unscheduled.**
Both counts on the sheet were wrong by six, in opposite directions.

The prompt has said "each with the same reason" since multi-bus rows were first
handled. This is what came back anyway, which is why the fix is not another
sentence in the prompt.

### 2. A printed line is one line

Rows that share a page and a **printed** line number describe the same work —
that is what a line on paper means. A field nobody filled in now takes its
value from the sibling on that line that has one: reason, mechanic, category,
repair.

- **Only blank fields are filled.** Two buses on one line that genuinely came
  back with different wording keep it. This can add what was missing and can
  never overwrite what was read.
- **Margin rows inherit nothing**, and that exclusion is the whole safety of
  it. They carry no line number, so every pencilled row on a page would share
  one key and take its wording from whichever came back first — one bus's brake
  job spreading across unrelated handwritten rows.
- **The review screen says so**, on each row it filled, naming the line: "Read
  from line 53, shared with the other buses on it". The inference is visible
  and checkable against the paper before anything is imported, not silent.

### 3. The row's own wording outranks the band heading

The prompt has always claimed this — "a row's own wording still wins over the
heading it sits under" — and nothing enforced it: `normalizedSection` takes a
valid section name and returns it before the reason is ever consulted, so a PM
written under the UNSCHEDULED heading came back Pending and stayed Pending. A
foreman writes the week's PMs wherever there is room on the page, so the paper
is not wrong to be laid out that way.

Only the three headings that describe **who has the bus** can be overruled —
Pending, Scheduled Repair, Other. Vendor Repair, Accident and Roadcall stand,
which follows the precedence the page already documents: where a bus physically
is outranks what the work is, and what the work is outranks who has it. A bus at
Cummins for a PM is off property; a bus that was towed is a road call whatever
else is written on it.

The question asked is `downSheetScheduledOnly`, the same predicate the bands
themselves use, rather than "does an inspection word appear anywhere". A bus
carrying a misfire **and** a PM is a bus that is down, and testing for the word
would have quietly filed it as maintenance — the one thing this page must never
do.

## Validation

- 223 regression tests passing, ESLint clean, production build succeeds
- **The failure was reproduced before it was fixed**, against the old code and
  the model's exact response shape for line 53: 1 inspection, 6 unscheduled
- **Driven end to end against the PRODUCTION build** with that same response
  stubbed into `/api/down-sheet-scan`, zero console errors: all seven buses
  read `PM'S` on the review screen and each says GOES TO INSPECTIONS &
  SCHEDULED MAINTENANCE **before** anything is imported; the six inherited rows
  carry the note naming line 53 and the row that already had the wording does
  not; the imported sheet counts **UNSCHEDULED 2** — two real faults on other
  lines, untouched — against **INSPECTIONS 7**
- **Every rule that must not bend is pinned by its own assertion:** a fault
  written once over two buses stays a fault on both; PM DEFECTS stays down; a
  bus on the sheet twice for a PM and a misfire is counted down and keeps both
  facts on the row; a PM line at a vendor stays off property for the bus that
  inherited the vendor as well as the one it was written on; two buses on one
  line with different wording keep their own; margin rows and single-bus lines
  inherit nothing; and the same printed number on a different page is a
  different line

## After it is live

1. **Rescan the sheet that has line 53 on it.** On the review screen, before
   importing, every bus on that line should read PM'S and say GOES TO
   INSPECTIONS & SCHEDULED MAINTENANCE, with the later ones noting which line
   the wording came from.
2. **Check the counts bar after importing.** The seven PM buses belong under
   INSPECTIONS & SCHEDULED MAINTENANCE, and the down count should drop by the
   number that used to be stranded in UNSCHEDULED.
3. **Check a line that is not a PM** — a fault written once over two bus
   numbers. Both buses should carry that fault and both should stay in the down
   count. The rule is "share the line's wording", not "share its inspection-ness".
4. **Check a PM DEFECTS line.** Those are faults found while doing a PM and
   the buses are down; they must not have moved into INSPECTIONS.
5. **Check any bus that is on the sheet for both a PM and a fault.** The row
   should still show both, and the bus should still be counted as down.

## The way back

Measured in a throwaway worktree from `103b005`:

- `git revert 103b005` alone is **clean** and restores the previous scan
  behaviour, leaving Version 155 exactly as it was.
- Nothing in this release writes new stored state, so there is nothing to clean
  up going backwards. Sheets imported while it was live keep the wording they
  were imported with, which is the wording the paper carries.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 156 | Live | <published tip hash> | A line reading PM'S with seven bus numbers after it stops counting as seven buses that are down. The scan split the line into seven rows correctly but carried the words on the first row only, leaving six blank under whatever band heading they sat under, so six buses arrived saying nothing and were read as down with nobody assigned — the down count up by six and the inspection count down by six off one line of paper. Every bus on a printed line now takes that line's wording from the sibling that has it, filling only blank fields so wording that was actually read is never overwritten, and the review screen names the line it read each one from. Margin rows, which carry no line number, inherit nothing. A row's own wording now also outranks the band heading it sat under, so a PM written under UNSCHEDULED is filed as an inspection, while Vendor Repair, Accident and Roadcall still stand and a bus carrying both a PM and a fault is still counted as down |
```


# Version 155 — Rows 1–6 of the Main Garage are READY ROWS

**Publish this after Version 154.** It is a single, self-contained visual
change requested directly: "the main garage area is split into 3 parts. The
ready rows, the service rows, and of course the trouble rows. The one thing
missing is defining rows 1-6 as ready rows." Only that one part — the ready
rows — is built here, ahead of the smart tracking system the request named as
the reason for it. Service rows and trouble rows are not part of this change.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`6f8518b`** |
| Last code-bearing commit | `6f8518b` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 154, pending from `fd3b326` |

**One application commit**, rebased onto Codex's Version 152 release commit
`d4a26fb` after it landed mid-session — the code is unchanged from the
original commit, only its parent:

```
git show --stat 6f8518b
 app/globals.css              | 13 +++++++++++++
 app/page.tsx                 |  6 +++---
 tests/rendered-html.test.mjs | 40 ++++++++++++++++++++++++++++++++++++++++

git diff --name-only fd3b326 6f8518b -- app tests
app/globals.css
app/page.tsx
tests/rendered-html.test.mjs
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only fd3b326 6f8518b -- supabase package.json package-lock.json .github public worker   # returns nothing
```

Gate: **222 tests passing** (221 at Version 154, one added), ESLint clean,
production build succeeds.

## Migrations

**None.** No storage key, no payload shape, and no database column changes.
This release is markup and CSS: a class on one already-rendered `<div>` and an
optional prop on an existing component, both additive.

## What changed

### The Main Garage's own grid gains a labeled boundary

The Main Garage renders as one 7-row × 12-bay grid with no distinction between
any of its rows. A thick green line now separates ROW 6 from ROW 7, and the
section's own title bar — "MAIN GARAGE (BAYS 1-12)" plus its live bus count —
carries a small matching badge reading **ROWS 1–6 READY**, so the split still
reads when the section is collapsed and the grid itself is hidden.

The line is a 4px top border on ROW 7's own cells — its sticky row label and
all 12 of its bays — rather than a bottom border on ROW 6's. `.grow`, the div
wrapping each row, renders as `display:contents` and paints nothing of its
own, so any border has to land on the cells themselves, and a line above
ROW 7 reads identically to one below ROW 6. The green is the same shade the
drag-and-drop `.ready` highlight already uses elsewhere on this page for
"this space is fine" — the same word keeps the same color rather than a
second green meaning something else on the same screen.

The badge is a new optional prop, `badge`, on `T` — the title-bar component
every section on the Facility Map shares — rendered beside the existing count
pill. It is additive by construction: a section that never passes one (every
section except the Main Garage, today) renders exactly as it always has, and
nothing about how sections count buses, drag-and-drop, collapse, or report
their name to the operator or to `RELOCATION_AREAS` changes. The existing
column split — `MAIN GARAGE (BAYS 1-10)` versus `TROUBLE BAY 11` / `TROUBLE
BAY 12`, used for moves and the AI Operator — is untouched; rows and columns
are two separate dimensions of the same grid, and only the row one gained a
label here.

## Validation

- 222 regression tests passing, ESLint clean, production build succeeds
- **Driven against the PRODUCTION build at 1400×1000 and 390×844, zero console
  errors:** computed styles confirm ROW 7's row label and every one of its 12
  bays carry `border-top-width: 4px`, ROW 6 and every other row still carry the
  ordinary `1px`, and the title bar's `.section-badge` renders the text `ROWS
  1–6 READY`; a screenshot at both widths shows the pill sitting cleanly next
  to the bus count and the green line spanning the full width of the grid,
  under the sticky ROW 7 label and every bay to its right
- **Scoped to the Main Garage alone:** the new `badge` prop is optional and no
  other section's `ttl(...)` call passes one; `ready-rows-divider` appears
  exactly once in the JSX (the one conditional on `r===6`) and its CSS rule is
  a single selector shared by all seven rows, not one rule per row
- **The existing bay 11/12 special-slot logic is untouched**, confirmed by the
  same exact expression this release's test checks alongside the new divider
  class, in the same `Array.from` call

## After it is live

1. **Open the Facility Map and scroll to MAIN GARAGE (BAYS 1-12).** A green
   pill reading ROWS 1–6 READY should sit beside the bus count in the title
   bar, and a visibly thicker green line should separate ROW 6 from ROW 7.
2. **Collapse the section.** The badge should still be visible in the
   collapsed title bar even though the grid itself is hidden.
3. **On a phone**, confirm the title wraps to a second line without the badge
   being cut off or overlapping the collapse/menu buttons.
4. **Move a bus into or out of ROW 7 or any bay 11/12 slot** and confirm
   nothing about moves, the operator, or bay coloring changed — this release
   only adds a line and a label.

## The way back

Measured in a throwaway worktree from `6f8518b`:

- `git revert 6f8518b` alone is **clean** and removes the badge, the divider,
  and their CSS, leaving Version 154 exactly as it was.
- Nothing in this release writes new stored state, so there is nothing to
  clean up going backwards.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 155 | Live | <published tip hash> | Rows 1-6 of the Main Garage are marked READY ROWS: a thick green line separates ROW 6 from ROW 7 in the grid itself, and a matching badge sits in the section's own title bar next to its bus count so the split still reads when the section is collapsed. This is the first piece of a smart tracking system planned for later — service rows and trouble rows are not part of this change, and the existing bay 1-10 / Trouble Bay 11 / Trouble Bay 12 column split used for moves and the AI Operator is untouched |
```


# Version 154 — A scan sweep can be taken back out, exactly

**Publish this after Version 152.** It answers a mistake made on Sep 6 that the
app had no way to undo: a photo of the Vehicle Down Sheet went through SCAN
SWEEP, 24 Tech Services records landed on 23 buses in one press, the log went
from 178 active defects to 202, and an export/import from the other device did
not take them out — nor could it have (section 1).

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`fd3b326`** |
| Last code-bearing commit | `fd3b326` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 152, pending from `015e789` |

**Three application commits** on top of 152's `015e789`:

```
git log --oneline 015e789..fd3b326      # docs-only commits omitted
fd3b326 Let the person holding the sheet tell the scanner what the camera will get wrong
0db855a Take a whole scan sweep back out of the Defect Log, and stop the next one going in
dd1b093 Correct what the camera misread, and stop the margin rows slipping out

git diff --name-only 015e789 fd3b326 -- app tests
app/api/down-sheet-scan/route.ts
app/api/sweep-scan/route.ts
app/cloud-client.ts
app/cloud-live.ts
app/cloud-sync-control.tsx
app/cloud-sync.ts
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/defect-log/scan-batches-panel.tsx   (new)
app/defect-log/scan-batches.ts          (new)
app/defect-log/sweep-scan-import.ts
app/defect-log/sweep-scanner.tsx
app/down-sheet/down-sheet-scan-import.ts
app/down-sheet/down-sheet-scanner.tsx
app/down-sheet/down-sheet.css
app/down-sheet/scan-spelling.ts         (new)
app/operator-engine.ts
app/page.tsx
app/scan-notes.ts                       (new)
app/shop-cloud-live.tsx
tests/rendered-html.test.mjs
```

No dependency, database, CI, worker, or service-worker change:

```
git diff --name-only 015e789 fd3b326 -- supabase package.json package-lock.json .github public worker   # returns nothing
```

**No database change.** The two cloud changes in section 4 are in what the app
sends and asks for: a defect row now carries `deleted_at: null` explicitly, and
a pull additionally selects `defect_id, deleted_at` where `deleted_at is not
null`. Both columns have existed since migration 0002; the read is covered by
the existing "shop reads" policy; **no table, column, trigger or policy
changes.** No new route and no service-worker bump.

Gate: **221 tests passing** (214 at Version 152, seven added), ESLint clean,
production build succeeds.

## Migrations

**None, and nothing is rewritten.** No storage key changes and no payload shape
changes.

**Two new storage keys, both additive.** `pace-scan-batch-undo-v1` holds the
last removed scan sweep so PUT BACK works after a reload; absent means nothing
to put back; written only by a removal, cleared by a restore.
`pace-scan-notes-v1` holds the scan notes a person asked to keep, one text per
scanner; absent means none; written on every READ, with the text or with
nothing, according to the tick.

**One new form field on both scan routes,** `notes`, optional; a request
without it is the request it was.

**One first-sweep cost, harmless and once per device.** A defect row's
fingerprint now includes `deleted_at: null`, so every fingerprint changes and
the first shop-cloud sweep after the update re-sends the device's whole defect
table — around three hundred rows in two 200-row upserts. The server's
keep-newest trigger lets an equal timestamp through, and the rows are
identical, so nothing on the server changes; after that sweep the fingerprints
are current and pushes are incremental again.

## What changed

### 1. Why the import did not remove them — and never could

A Defect Log import merges by defect id: a record both devices have takes the
incoming version, and **a record only the receiving device has is kept.** That
rule exists because the alternative — an import that deletes repairs the
sending device never saw — is the data loss the merge rules were argued out to
prevent. The iPad had never had the 24, so the phone kept them. Nothing was
wrong with the import; it is not, and cannot be, the way to take records out.
The "202" the phone shows is 178 real records plus the 24 filed by the sweep.

### 2. The fingerprint, and SCAN BATCHES

Everything a sweep files in one press of FILE APPROVED shares **one creation
stamp** — `fileSweep` takes the clock once and hands the same value to every
record — and every id it mints begins with `sweep-`. No honest record carries
that stamp, so the pair identifies a press exactly. The 24 carry
`2026-09-06T23:30` to the millisecond. `scan-batches.ts` groups by it.

**SCAN BATCHES**, a new button beside SCAN SWEEP on the Defect Log, lists every
press on the device — when, how many records on how many buses, who checked,
the bus numbers — and REMOVE takes one out. Two rules:

- **Only what nobody has touched.** A record from the batch that has since been
  marked fixed, deferred or in progress, ticked, or written on (shop notes,
  action taken, a finding, a part) is somebody's decision that it was real. It
  stays, and the row says how many stayed.
- **The way back is kept.** What was removed is written to the device, and PUT
  BACK returns every record to its bus. UNDO LAST covers a removal too, by the
  same path. A record put back is stamped `updatedAt: now`, which section 4
  explains is not cosmetic.

The board is written with the bulk-loss guard lifted for this one confirmed
write, the way MERGE DUPES does on Settings; the recovery snapshot is still
taken first, so RESTORE LAST GOOD COPY stands behind it. The cloud ledger is
written after the board write lands, never before: a removal that reached the
cloud but not the device would be worse than either alone.

### 3. The operator understands the request

Said exactly as it was said in chat: **"Remove the most recent 24 entries from
the Defect log"** previews the batch — 24 Tech Services records filed at that
time on 23 buses, the first six numbers listed — and applies on confirmation
with the same three writes as the button. The number is checked, never
assumed: "the last 20" when the sweep filed 24 is answered with the correction,
not with 20 records quietly removed. "Undo the last scan sweep" and "take the
sweep out of the defect log" need no number.

**"Undo most recent change to defect log"** names no sweep and no number. That
is the log's own UNDO LAST, and the operator says so — and says what it can do
from here, naming the batch. "Put the scan sweep back" restores. A command that
names a bus is a bus command and falls through to the paths that were there.

### 4. A removal reaches the other devices, and so does a restore

Removing already wrote the cloud ledger, so the phone would have sent
tombstones. What did not exist was any way for the iPad to learn of them: a
pull returns live rows only, and the merge keeps whatever the receiver alone
holds, so the iPad's 24 copies would have stayed for good, pushed back up every
sweep (harmlessly — the server keeps the newest write, and the tombstone is
newer). **The pull now reads the tombstones as well, as ids and dates only**,
and a copy older than its tombstone is dropped from the device. A copy edited
AFTER the removal is real work: it stays, and its next push undeletes the row.
The bulk-loss guard is lifted for that write exactly when a tombstone applied
and only then; the recovery snapshot is taken first.

Putting a sweep back had a matching hole. A restored record was upserted with
no `deleted_at` column, so the tombstone stood and every device's pull went on
filtering the record out — the restore looked done on the device that made it
and reached nobody. **A live defect row now says `deleted_at: null` out loud**,
and a restored record is stamped newer than its tombstone, so the restore wins
on `updated_at` and clears the deletion. A stale copy still cannot undelete a
record removed after it was last touched: it loses on `updated_at` first.

### 5. The scanner will not do it again

The sweep route now asks the model **what the page is before what is on it**,
in the schema: `document` is one of `ventra`, `farebox`, `mixed`, `other`, and
a Vehicle Down Sheet is named in the prompt as the example of `other`, with
the instruction to return no rows for it. On the client a page called `other`
contributes no rows — they are not shown unticked, they are not shown, since a
tick box beside a Down Sheet row is how 24 records got filed — and a red notice
points at SCAN SHEET on the Down Sheet page. A page the model would not vouch
for, or where most rows could not be placed on either sheet, arrives with
nothing ticked and an amber notice.

### 6. Tell the scanner what the camera will get wrong, before it does

The photo reader is not pattern matching. It is a vision-language model reading
the page under written instructions, and it follows a sentence the way a person
would. So both scanners now carry **NOTES FOR THIS SCAN** — up to 500
characters, a counter beside it — sent with every page and appended to the
prompt **behind** the fixed instructions, never in front of them. "Line 23 is
17565." "The margin name is Carlos." "TIROS means tires." "HAZMAT means a
biohazard on board." The person who knows the row is ambiguous says so before
the photo is read, instead of fixing the row afterwards on the review screen
(which still works; every field there is still editable).

The block that carries the notes bounds them in the same breath: a note can
correct HOW something written on the sheet is read; it can **never add a bus, a
row or a repair that is not on the paper**, and a note that contradicts what is
clearly printed loses to the paper and is called out in reviewNote. Empty notes
add nothing, so a scan without them is byte-for-byte the scan it was.

**Keep these notes on this device for the next scan** remembers them with one
tick — the shop's shorthand and the mechanics' names are not retyped every
morning — and a one-off left unticked is forgotten, so a correction about line
30 today does not come back tomorrow as a standing instruction. Each scanner
remembers its own. The cap and the cleaning are applied on the server as well
as in the box.

### 7. From `dd1b093`: FRONT TIROS, and the margin rows

A scanned row now has its words corrected against the shop's own vocabulary and
the mechanics' names already on the device — TIROS becomes TIRES, CAROS becomes
CARLOS — under rules deliberately timid: nothing already a shop word, nothing
with a digit, nothing under four letters, and nothing with two equally close
candidates. And the prompt now names the handwritten margin rows as loudly as
the printed lines, after a previous prompt change about printed line numbers
plausibly taught the model to favour the table over the margin; margin rows are
capped below the review threshold so they always arrive amber and marked
MARGIN.

## Validation

- 221 regression tests passing, ESLint clean, production build succeeds
- **The notes box, driven against the PRODUCTION build at 390 px with the scan
  routes stubbed, zero page errors:** a 700-character paste clamps at 500/500;
  the request carries `name="notes"` with the text beside the page; ticked
  notes are stored and come back pre-filled and ticked on the next open;
  unticked notes are forgotten; the sweep scanner keeps its own; and a stubbed
  `document: "other"` answer produces the red refusal with no FILE button —
  which is the section 5 path measured in a browser, with the model's answer
  the only thing stubbed
- **Driven against the PRODUCTION build, zero page errors,** with the real Sep
  6 shape seeded — 24 sweep records on 23 buses among 30 defects:
  - SCAN BATCHES lists one row reading **24 RECORDS ON 23 BUSES · CHECKED BY
    EJ** with the 23 numbers, and a button reading REMOVE 24
  - REMOVE, confirmed: the board holds **6** defects (the six hand-typed
    records, untouched), the cloud ledger holds **24** ids, the snapshot holds
    **24** records, the recovery snapshot was taken, UNDO LAST reads "Undo
    Removed 24 scan sweep records", and no save banner appears
  - PUT BACK **after a reload**: 30 defects again, all 24 restamped newer than
    their creation, ledger back to 0 ids, snapshot cleared
  - The operator, with the exact chat wording: "Undo most recent change to
    defect log" answers with UNDO LAST and names the batch; "Remove the last 20
    entries" answers "filed 24 records, not 20"; "Remove the most recent 24
    entries from the Defect log" previews and applies — 6 defects, 24 ledger
    ids, 24 in the snapshot; "Put the scan sweep back" restores all 24
  - After an operator removal, the Defect Log's SCAN BATCHES offers PUT BACK
    for it and lists no remaining sweep
  - At 390 px the four feed actions sit in a 2×2 grid
- **The cloud path is tested against the merge rules that shipped**, not
  mocked around them: 24 tombstoned records leave storage through
  `applyCloudPull` with the recovery snapshot written and the page notified,
  a copy edited after its tombstone stays, and the tombstone read issues
  exactly `select("defect_id,deleted_at").not("deleted_at","is",null)`
- **Every rule was confirmed to fail without it:** a touched record removed, a
  wrong count rounded to the batch, a five-digit number read as a batch
  command, tombstones ignored on pull, the guard lifted with nothing
  tombstoned, and a `document: other` page still producing findings each fail
  their own test
- **Not measured here, and cannot be:** the model's answer to a real Down Sheet
  photo through the sweep route. The schema forces it to choose; the prompt
  names the Down Sheet; the review step is the last line either way.

## After it is live

1. **On the phone, open the Defect Log and press ↶ SCAN BATCHES.** One row
   should read 24 RECORDS ON 23 BUSES for Sep 6. Press REMOVE 24 and confirm.
   The active count should drop from 202 to 178 — or a little less than 24 if
   any of them were touched since, and the row will say how many were kept.
2. **Watch the iPad.** Within the live-sync window its Defect Log should lose
   the same 24 with nobody touching it. If the iPad is offline, they leave on
   its next sync.
3. **Check the cloud if you want the receipt:** in the Supabase SQL editor,
   `select count(*) from bus_defects where defect_id like 'sweep-%' and
   deleted_at is not null` should say 24 once the phone has synced.
4. **Try the operator once, on purpose:** "Remove the last scan sweep from the
   defect log" should now answer that there is no scan sweep to take out.
5. **Press PUT BACK once, then REMOVE again**, to see the way back work — the
   records should return on both devices, then leave both again.
6. **Photograph a Down Sheet through SCAN SWEEP deliberately.** It should
   refuse the page in red and point at SCAN SHEET, with nothing to tick.
7. **SCAN SHEET a page with a margin row.** The row arrives amber and marked
   MARGIN whatever the model claimed, and a misspelt shop word reads corrected.
8. **Write a note before reading a sheet you know is ambiguous** — "line 23 is
   17565" or "the margin name is Carlos" — and see whether the row comes back
   right the first time. Tick KEEP for something standing like "HAZMAT means
   biohazard" and confirm it is there the next morning; leave a one-off
   unticked and confirm it is not.

## The way back

Measured in a throwaway worktree from `fd3b326`:

- `git revert fd3b326` alone is **clean** and takes out the notes box (section
  6), leaving everything else in place.
- `git revert fd3b326 0db855a` (newest first) is **clean** and takes out
  sections 2–6, leaving `dd1b093`'s scan corrections in place.
- `git revert fd3b326 0db855a dd1b093` (newest first) is **clean** and takes
  the whole release out, back to 152.
- **Single reverts of `0db855a` and `dd1b093` conflict** — `0db855a` in
  `sweep-scanner.tsx` and the test file, `dd1b093` in the down-sheet scan route
  and the test file — because the later commits touched the same lines. None is
  a code disagreement; revert from the newest down, as above.
- Going back leaves `pace-scan-batch-undo-v1` and `pace-scan-notes-v1` on any
  device that used them; nothing reads them and they are harmless. Ledger
  entries a removal wrote stay, by the ledger's own design.
- Nothing in the cloud needs undoing. A tombstone is data, not an absence:
  the older app goes on filtering tombstoned rows out of its pulls exactly as
  it did before.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 153 | Live | <published tip hash> | A whole scan sweep can be taken back out of the Defect Log. On Sep 6 a photo of the Vehicle Down Sheet went through SCAN SWEEP and 24 Tech Services records landed on 23 buses in one press, and importing the other device's log could not remove them because an import keeps every record only the receiver has, by design. Every record a sweep files in one press shares one creation stamp, and SCAN BATCHES, beside SCAN SWEEP, lists each press and REMOVEs one — keeping any record marked fixed, deferred, ticked or written on since — with PUT BACK as the way back, surviving a reload. The AI Operator reads "remove the most recent 24 entries from the defect log" as that batch, checks the number rather than rounding to it, explains that "undo the most recent change" is the log's own UNDO LAST, and puts a sweep back on request. A removal now reaches the other devices, because a pull reads the tombstones as well as the live rows and drops a copy older than its tombstone while keeping one edited since, and a restore reaches them because a live defect row now says deleted_at is null and returns stamped newer than the deletion. The sweep scanner asks the model what the page is before what is on it and refuses a Down Sheet outright, pointing at SCAN SHEET. Both scanners take up to 500 characters of NOTES FOR THIS SCAN — "line 23 is 17565", "the margin name is Carlos", "HAZMAT means biohazard" — read with the photo under a rule that a note can correct how a row is read but never add a bus, and remembered on the device only when asked. And a scanned FRONT TIROS reads FRONT TIRES, with handwritten margin rows named as loudly as printed lines and always arriving amber |
```


# Version 153 — The shop cloud starts working again

**Publish this next, after Version 151.** It carries a week-long outage fix:
every shop-cloud sweep has failed since Aug 31 (section 2), which is also why
the cloud's Down Sheet is still Aug 30.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`015e789`** |
| Last code-bearing commit | `015e789` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 151, published from `f5939df` |

**Seven application commits.** The first was cherry-picked onto Codex's release
commit `e493516`, not merged over it:

```
git log --oneline e493516..015e789      # docs-only commits omitted
015e789 Run the shop cloud on every page, and merge the shop's changes as they happen
b57dcb5 Flag a scanned row the model guessed at, not only one that missed the fleet
413daab Catch a scan that drops a row, and give A-3, A-21 and HAZMAT somewhere to go
393b47f Put SHOP CLOUD first in MASTER, where nobody has to look for it
e3b33e4 Send a merged-away tombstone as an UPDATE, not inside an upsert
9436f22 Make the DEFERRED badge count the same buses its filter lists
a8e7e2a Make the DEFERRED badge show the buses it is counting

git diff --name-only e493516 015e789 -- app tests
app/api/down-sheet-scan/route.ts
app/cloud-client.ts
app/cloud-live.ts               (new)
app/cloud-sync-control.tsx
app/cloud-sync.ts
app/fixed-repairs/page.tsx
app/lists/page.tsx
app/page.tsx
app/shop-cloud-live.tsx         (new)
app/defect-log/page.tsx
app/deferred-counts.ts          (new)
app/deferred-watch.tsx
app/down-sheet/down-sheet-scan-import.ts
app/down-sheet/down-sheet-scanner.tsx
app/down-sheet/down-sheet.css
app/map-settings-panel.tsx
app/quick-filters.ts
app/repair-catalog.ts
app/settings/page.tsx
tests/rendered-html.test.mjs
```

No dependency, database, CI, or service-worker change:

```
git diff --name-only e493516 015e789 -- supabase package.json package-lock.json .github public   # returns nothing
```

**One database change, already applied** (section 5): `buses`, `bus_defects` and
`down_sheet_entries` were added to the `supabase_realtime` publication, without
which the app subscribes successfully and receives nothing forever. It is
additive and reversible, changes no data and no column, and RLS still gates it.
**No table, column or constraint changed.** The tombstone fix in section 2
changes how the app writes to Supabase, not what the database holds. **No new route and no service-worker
bump,** so no shell re-download.

Gate: **214 tests passing** (206 at Version 151, eight added), ESLint clean,
production build succeeds.

## Migrations

**None, and nothing is rewritten.** No storage key changes and no payload shape
changes.

**Two catalog additions, which are additions only.** `A-3` and `A-21` join the
Inspection list and a biohazard condition joins Interior Cleaning. Adding an
option cannot disturb a stored record — the renames that would are read-time by
design and untouched here.

## What changed

### 1. The DEFERRED badge shows, and counts, the buses it is alarming about

The pulsing 90-minute badge was a bare link to `/defect-log`. It renders on all
six pages — the Defect Log included — so pressing it there pointed at the page
already on screen and **did nothing at all**; from elsewhere it landed with no
filter, leaving the overdue buses wherever they sat in the list.

It opens the **Deferred (Held from Service)** quick filter now, which already
listed exactly those buses, longest-held first. Two routes, because the badge
renders on the page it points at: a query string from elsewhere, an event from
the Defect Log itself. The drawer is scrolled to, and the query string is
stripped once applied so closing it and reloading does not reopen it.

**The number on it was also wrong, in two ways.** It counted overdue *defects*
while the drawer lists held-back *buses* — so a bus held on two repairs counted
as two, and a badge reading 3 could open a list of 4. It now prints the count of
buses the filter will list, deduplicated, using the drawer's own exclusions. The
badge still only *appears* past ninety minutes, and the overdue figure survives
in the aria-label: *"4 buses held from service, 3 over 90 minutes"*.

### 2. The shop cloud has been failing every sweep since Aug 31

**This is the one to publish for.** The Phone's status has read *"62 changes
waiting"* in red for a week.

MERGE DUPES writes a tombstone for each record it folds away — the key, the
deletion stamp and the signature, deliberately carrying **no fleet number**,
since writing a repair's fields back while deleting it would let a stale copy
overwrite the version that survived. Those tombstones were appended to the
ordinary defect rows and upserted with them.

Postgres will not accept that. An upsert is an INSERT that falls through to
UPDATE only after the insert half is rejected as a duplicate, and NOT NULL is
checked on that insert half **first**. `bus_defects` requires `fleet_number`, so
the tombstone is refused with `null value in column "fleet_number" ... violates
not-null constraint` before the conflict on `defect_id` is ever reached, and the
whole 200-row chunk rolls back with it.

**The damage ran past the defects.** `cloudPush` returns on the first error and
`down_sheet_entries` is written *after* `bus_defects`, so the Down Sheet was
never attempted at all — the cloud's copy is still **Aug 30**. Not one tombstone
ever landed, so the 37 duplicate groups the Phone cleaned locally are still live
in the cloud.

`pushPlan` now partitions each table's rows by whether they carry a fleet
number. Repairs are upserted as before; a tombstone goes as an **UPDATE by
`defect_id`**, which touches no required column, is what the shop's edit policy
allows, and against an id the server never had changes nothing — correct, since
there is nothing to delete. The roadmap always described a delete as *"an
ordinary update"*; this is that sentence, kept.

### 3. SHOP CLOUD moves to the top of MASTER

It was inside FACILITY MAP — a page's settings — while being the only control
that decides whether the map, the Defect Log **and** the Down Sheet reach the
other devices at all. Setting up a new iPad meant knowing to open a collapsed
section titled "Board settings" and scrolling past bus markers and the DS badge.

It is the **first group in MASTER** now, the section that opens by default,
ahead of MASTER EXPORT, RESTORE LAST GOOD COPY and the theme picker.

### 4. A photographed sheet says what it failed to read

Checked the 09/5 4:24pm sheet against the export the phone produced from it.

**Two buses vanished without a word.** Line 23 (18501, high oil usage) and line
30 (20504, IDOT-ABS light, JEVELL) are on the paper and reached nothing, and
nothing on screen said a row had been missed. A bus that is down and not on the
sheet is a bus that goes back out broken.

OCR cannot be trusted never to drop a line, but **the sheet numbers its rows
01..55**, so a missing number can be found exactly. The review screen names them
— *"LINES NOT READ: 23, 30"* — before anything is imported, collapsing runs to
`37–41`. It reports rather than blocks: blank lines are ordinary, and only the
person holding the paper can tell a blank line from a missed one. Counting stops
at the highest line actually read.

**A-3 and A-21 were not in the catalog.** The sheet has A3 and A21; with nowhere
to put them the scan picked the nearest thing it had, so **A3 was recorded as
A-6 and A21 as A-15** — two buses credited with a service they never had. The
band rules already accepted any one- or two-digit code; the catalog had not
caught up.

**HAZMAT had nowhere to go and read as "Unknown diagnosis".** On this sheet it
means a biohazard on board — blood, vomit or faeces. It is its own entry under
Interior Cleaning now and, like Cleaning Required, **takes the bus out of
service on its own**.

**And the review flagged the wrong kind of doubt.** It flagged only rows whose
bus number matched no bus in the fleet — but a misread digit usually lands on
*another real bus*: 17565 came back as 17563, which exists, so the row resolved
cleanly, showed FLEET MATCH and arrived pre-selected. Every row that scan got
wrong was pencilled into the margin, and the model had been reporting its doubt
all along in a `confidence` field nothing read. Below 0.75 a row now carries
**CHECK THIS ROW** with the percentage and an amber border, and counts toward
the flagged total. This does not make the OCR read a digit correctly; it makes
the rows most likely to be wrong the ones that stand out.

### 5. The shop cloud runs everywhere, and the shop's changes arrive live

**The sync barely ran.** Every part of it — the 45-second sweep included — lived
inside `CloudSyncControl`, which is mounted on **exactly one page**. A mechanic
could move buses around the Facility Map for a whole shift, or log defects all
night, and none of it left the device: the only moments anything synced were the
moments somebody happened to have Settings open. Section 2's bug is why the
sweeps that did run failed; this is why so few ran at all.

The engine moves into `ShopCloudLive`, which renders nothing and is dropped into
all six pages the way the DEFERRED badge already is. Settings keeps the buttons,
the fields and the status line, and no longer keeps the sweep — two sweepers on
one device would race whenever Settings was open.

**Live sync is then one more trigger on that engine.** A Supabase realtime
notification means *the shop has news*; the news is fetched and merged down the
ordinary path with the same rules GET THE SHOP'S COPY uses. **Realtime is a
doorbell, not a delivery** — no row from a notification is ever written to the
board, because those merge rules were argued out once and do not get a second
copy. The merge moved into `cloud-live.ts` so the button and the background
share one implementation and cannot drift.

Three things keep it safe. It **still sends before it receives**, so someone
else's burst cannot land on top of unsent local work. It keeps
`allowBulkDefectLoss:false`, because a merge is never a reason to accept a write
the guard refuses and this runs with nobody watching. And a device **ignores the
echo of its own writes**, matched on device label.

**The screen keeps up without a reload.** Every page already listens for
`storage` to pick up another tab's work — but the browser fires that only for
OTHER tabs, so a merge performed in this tab would leave the board right on disk
and stale in front of the user. `cloud-live` dispatches the event itself after a
merge, and every existing handler then does the correct thing. That is why live
sync needed **no change to any page's own code**.

## Validation

- 214 regression tests passing, ESLint clean, production build succeeds
- **The shop-cloud failure was diagnosed against the live database, not
  guessed:** the Postgres logs carry seven `null value in column "fleet_number"`
  errors, the newest at 22:23 today, each naming the exact PostgREST upsert; the
  live tables show `bus_defects` with **0 tombstoned rows** and **37 live
  duplicate groups**, and `down_sheet_entries` last updated **Aug 30** while
  buses and defects are current
- **The DEFERRED badge driven against the PRODUCTION build, both routes:**
  pressing it on the Defect Log opens the drawer in place with 17510 at 6h 40m,
  17511 at 3h 20m and 17512 at 1h 35m flagged overdue and 17513 at 20m below
  them; from the Down Sheet it lands already filtered; closing and reloading
  leaves it closed. A fleet with one bus held on **two** deferred repairs renders
  a badge reading 4 against a drawer of exactly four buses, that bus listed once
- **SHOP CLOUD measured at 1024×1366 and 390×844:** the heading is on screen
  **without scrolling** on both, MASTER is open by default so it costs no taps,
  it is first in MASTER, and nothing named Shop Cloud is left in Board settings
- **The scan findings come from a real sheet and its real export**, compared row
  by row: 55 entries against two photographed pages
- **Every fix was confirmed to fail without it:** tombstones back inside the
  upsert, gap detection disabled, `A-3`/`A-21` removed, the badge counting
  overdue defects again, and dropping the per-bus deduplication each fail their
  own test
- **Live sync's one novel mechanism measured in the PRODUCTION build:** adding a
  bus to storage and dispatching the synthetic `storage` event took the Facility
  Map from 8 drawn buses to 9 **with no navigation and no reload** — the event
  was heard, and the page's existing handler did the rest
- **All six pages load with the engine mounted and zero console errors**
- **The publication was empty before this.** `supabase_realtime` existed and
  carried no tables, so the subscription would have connected and received
  nothing forever. Verified after the migration: all three tables present
- **A harness limitation worth keeping written down:** Playwright will not click
  the DEFERRED badge — `position:fixed` with an infinite pulse means the element
  is never "stable", and a coordinate click misses even with `force:true`. Drive
  it with `element.click()`

## After it is live

1. **Open ⚙ SETTINGS.** SHOP CLOUD is the first thing under MASTER, no scrolling.
2. **On the device that has been showing changes waiting, press SEND MY
   CHANGES.** The count should go to zero and the banner should stop being red.
   This is the whole point of the release.
3. **Then press GET THE SHOP'S COPY on the other device.** The Down Sheet should
   finally arrive; the cloud's copy has been stuck at Aug 30.
4. **Check the duplicates you merged are gone from the other devices too.** The
   tombstones have never landed, so they will travel for the first time.
5. **Leave a bus DEFERRED past ninety minutes and press the red badge** — from
   another page and from the Defect Log itself, where it used to do nothing. The
   number on the badge must equal the number on the drawer.
6. **Defer two repairs on one bus.** It counts as one bus, not two.
7. **SCAN SHEET a full paper sheet.** If any numbered line was not read, the
   review says so before you import. Rows the model guessed at are amber and say
   CHECK THIS ROW.
8. **Check an A3 or A21 row** records as A-3 and A-21, not A-6 and A-15.
9. **The real test of this release: two devices, side by side.** Move a bus on
   one and watch the other's map follow within a few seconds, with nobody
   pressing anything and no page reloading. Then log a defect on one and watch it
   reach the other's Defect Log.
10. **Leave the Facility Map open and work for a while, never opening Settings.**
   The changes must reach the cloud on their own — before this release they never
   did.
11. **Log a HAZMAT bus.** Interior Cleaning → Biohazard, and it takes the bus out
   of service on its own.

## The way back

Measured in a throwaway worktree from `015e789`:

- `git revert 015e789 b57dcb5 413daab 393b47f e3b33e4 9436f22 a8e7e2a` (newest
  first) takes the whole release out together.
- **Do not revert `e3b33e4` on its own unless the intent is to stop the shop
  cloud working.** It reverts cleanly, and that is the only reason to mention it:
  taking it out puts every sweep back to failing.
- `git revert 015e789` alone is **clean** and takes live sync out, putting the
  sweep back inside the Settings page — which means back to syncing only while
  Settings is open. The publication change can stay: with no subscriber it costs
  nothing. To undo that too, `alter publication supabase_realtime drop table
  public.buses, public.bus_defects, public.down_sheet_entries;`
- `git revert b57dcb5` alone is **clean.** `git revert b57dcb5 413daab` (newest
  first) is **clean** and takes the scan work out as a unit.
- **Single reverts of `413daab`, `393b47f`, and the DEFERRED pair conflict** —
  in `down-sheet-scanner.tsx` and `down-sheet.css` for the first, and in
  `tests/rendered-html.test.mjs` for all three, because later commits appended to
  the same files. None of these is a code disagreement; revert the stacked pair
  above, or resolve the test file by keeping both sides.
- Nothing in this release writes new stored state, so there is nothing to clean
  up going backwards.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 152 | Live | <published tip hash> | The shop cloud now runs on every page instead of only while the Settings page was open — the sweep lived inside the settings control, so a shift spent on the Facility Map or the Defect Log synced nothing at all — and the shop's changes now arrive live, a Supabase realtime notification triggering the same merge GET THE SHOP'S COPY performs, with the screen keeping up without a reload because the merge announces itself to the listeners every page already had. The shop cloud also works again — every sweep had failed since Aug 31 because a merged-away tombstone, which carries no fleet number by design, was being sent inside an upsert that checks NOT NULL before it reaches the conflict, rolling back the whole chunk and, since the Down Sheet is written after the defects, keeping the Down Sheet out of the cloud entirely; tombstones now go as an ordinary UPDATE by id. SHOP CLOUD moves to the top of MASTER, the first thing on the Settings page, since it decides whether the map, the Defect Log and the Down Sheet reach the other devices at all. A photographed down sheet now names any numbered line it failed to read before anything is imported, and flags rows the model had to guess at rather than only rows whose bus number matched no bus — a misread digit usually lands on another real bus and looked certain. A-3 and A-21 join the Inspection catalog, so a sheet reading A3 or A21 is no longer recorded as A-6 or A-15, and HAZMAT becomes a biohazard condition that takes the bus out of service instead of reading as an unknown diagnosis. The pulsing 90-minute DEFERRED badge opens the Deferred filter showing the buses it counts, longest-held first, from every page including the one it points at, and its number now matches that list where it had counted deferred repairs and shown a bus held on two of them twice |
```


# Version 151 — A road call is a fact about the bus, not a sentence in a description

**Publish this next, after Version 150.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`f5939df`** |
| Last code-bearing commit | `f5939df` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 150, published from `6d62787` |

**Seven application commits.** The first was rebased onto Codex's release
commit `e8f9515`, not merged over it:

```
git log --oneline e8f9515..f5939df
f5939df Count a bus with a fault as down, even when a PM is on the same row
51d3d54 Move Version 151 to 4bca6d7: the band rules corrected against a real sheet   <- docs only
4bca6d7 Correct the Down Sheet band rules against a real sheet
8736fd3 Move Version 151 to dda0661: the Down Sheet divides itself into four bands   <- docs only
dda0661 Divide the Down Sheet into off property, scheduled, unscheduled and inspections
c5ca8d6 Move Version 151 to 415fe96, and correct the revert advice that was wrong   <- docs only
415fe96 Move RESTORE LAST GOOD COPY into MASTER, and fix the pointers the move broke
eb5f9a3 Move Version 151 to 4241dd7: MASTER settings and the whole-app transfer   <- docs only
4241dd7 Put a MASTER section at the top of Settings, with MASTER EXPORT and IMPORT
4b154d9 Move Version 151 to ef5add7: the map's checkbox counts, and a minute to undo   <- docs only
ef5add7 Count road calls ticked on the map, and give every tick a minute to be taken back
a74d750 Queue Version 151 from 27891d9: road calls as dated events    <- docs only
27891d9 Record road calls as dated events, and move PARTS ON ORDER to Fixed Repairs

git diff --name-only e8f9515 ef5add7 -- app
app/defect-log/defect-log-sync.ts
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/fixed-repairs/page.tsx
app/quick-filters.ts
app/repair-catalog.ts
app/road-calls.ts          (new)

git diff --name-only 27891d9 ef5add7 -- app
app/defect-log/defect-log-sync.ts
app/page.tsx
app/road-calls.ts

git diff --name-only ef5add7 4241dd7 -- app
app/fleet-backup.ts
app/fleet-restore.ts       (new)
app/page.tsx
app/settings/page.tsx
app/settings/settings.css

git diff --name-only 4241dd7 415fe96 -- app
app/defect-log/offline-backup-reminder.tsx
app/page.tsx
app/section-transfer.ts
app/settings/page.tsx
app/storage.ts

git diff --name-only 415fe96 dda0661 -- app
app/api/down-sheet-scan/route.ts
app/down-sheet/down-sheet-scan-import.ts
app/down-sheet/down-sheet-scanner.tsx
app/down-sheet/down-sheet-view.ts
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx

git diff --name-only dda0661 4bca6d7 -- app
app/api/down-sheet-scan/route.ts
app/down-sheet/down-sheet-scan-import.ts
app/down-sheet/down-sheet-view.ts

git diff --name-only 4bca6d7 f5939df -- app
app/down-sheet/down-sheet-view.ts
```

No dependency, database, CI, or service-worker change:

```
git diff --name-only e8f9515 f5939df -- supabase package.json package-lock.json .github public   # returns nothing
```

**No service-worker bump this time,** so no shell re-download: `/settings` was
the last new route and it went out with 150.

Gate: **206 tests passing** (201 at Version 150, five added), ESLint clean,
production build succeeds.

## Migrations

**None, and no rewrite.** No storage key changes and no payload shape changes.
Buses gain an optional `roadCalls` array; a bus without one reads exactly as it
does today, which is what "never road-called" has always looked like.

**The Down Sheet's four bands are read-time only.** Nothing is written to say
which band an entry is in — the band is worked out on every read from the bus's
location, the entry's section and its assigned mechanic, all of which are
already stored. An existing sheet divides itself the first time it is opened,
and a device rolled back reads it as the single list it was.

**The one thing that would have been silent data loss, and was not.** Removing
`parts-on-order` from the Defect Log's six boxes could not mean removing it
from the vocabulary the read-time normalizer uses, because that normalizer
drops any key it does not recognise — every record already ticked PARTS ON
ORDER would have lost it on the next read. The catalog now carries two lists:
the full vocabulary, and the six the form draws from it. A test pins that the
stored key stays legal and still shows on the records that carry it.

## What changed

### 1. ROAD CALL, in the box PARTS ON ORDER used to hold

Third box, top right, so the grid is still six across three columns with a full
bottom row.

Ticking it does **three things at once**, because doing one without the others
is how the board starts disagreeing with itself:

1. **A dated event is appended to the bus** — append-only, never rewritten, the
   same shape the odometer readings and maintenance events already use. It
   carries who ticked it and which fault it was.
2. **The map's own ROADCALL flag goes on,** so the orange badge and the pulsing
   dot appear where the shop already looks for them.
3. **The bus is parked on the road,** in the first open space, because that is
   where it is. It goes through the same helper the relocation tools use, so
   the status follows the existing rules: a bus with a downing defect on the
   road reads Out of Service, which is what a broken-down bus is.

**A full road lot is not a failure.** The event and the flag still land and the
bus keeps its space — losing the record of a breakdown because 75 slots were
taken would be far worse than a bus parked in the wrong place.

**Only the transition from unticked to ticked records a breakdown.** Re-saving
a repair that road-called last week must not record a second one, or the
counter counts how many times somebody opened the form.

### 2. Seven days on the card, forever in the history

The Defect Log card carries the note **under the LATEST line**, in the **DS
badge's purple** — both answer "what else do I need to know about this bus",
and a second colour would say they were different kinds of thing. One road call
reads as a date; two or more lead with the count.

It shows for **seven days and then falls off on its own**. Nothing is deleted
to make that happen: the event stays on the bus permanently, because four road
calls in six months is a pattern and only an intact history shows it. The
counter behind it counts every road call the bus has ever had.

### 3. The quick filter, which empties itself

**Road Calls (Last 7 Days)**, sitting with the other "what is broken" lists
rather than at the end with the three that are about what somebody still has to
decide. A bus joins the moment it road-calls and leaves as that road call ages
past seven days. No clearing, no end-of-week reset.

The **bus's own history** decides the list, not its defects — a road call
outlives the repair it was ticked on, so a defect later merged away must not
take this week's breakdown off the board with it.

### 4. PARTS ON ORDER moved to Fixed Repairs

Beside the part it is about. It says what a repair is waiting on rather than
what the shop did, which is why it never sat comfortably with the other five.
It is stamped through the same path every work state uses, so it carries who
ticked it and when.

### 5. Unticking your only ticked box now sticks

**Found by building this, and it hit all six boxes.** `setDefectWorkState`
deletes the `workStates` key when the last tick goes, to keep stored records
clean — so the spread that merges an edit over the stored record had nothing to
override with, and the box came back on the next read. Unticking one of several
always worked; unticking your last one did not.

It matters most here, because ticking ROAD CALL moves a bus and writes a
permanent record, so a mis-tick has to be reversible. The breakdown itself is
not unwritten by unticking, because it happened — **UNDO LAST** is the way back
from a genuine mis-tick, and it already works, because road calls live on the
bus record it restores.

### 6. The map's own ROADCALL checkbox counts too

The Facility Map has had a ROADCALL checkbox on every bus for a long time. It
said the bus was out on one right now and said nothing once it was back, and
it knew nothing about the Defect Log's box.

Ticking it now writes **the same dated event**, so a road call logged on the
map reaches the badge on the Defect Log card, the running counter and the
seven-day filter. The two places can no longer disagree.

It parks the bus on the road **only when that same save did not set a location
itself.** The Defect Log's box has no location field to argue with, so it
always parks; on the map, somebody who has just chosen a space means it.

### 7. Sixty seconds to take a tick back

A tick is a permanent record of a breakdown. It does not come off because
somebody changed their mind an hour later — a counter that can be tidied stops
meaning anything. But a wrong tap is a wrong tap, and the person who made it
knows within seconds.

**Unticking within sixty seconds withdraws the whole thing:** the event, and
the move it caused. The event carries the location the bus came from, so the
undo puts it back. This works from either box.

**Outside the window the flag still comes off** — the bus is not out on a road
call now — **and the breakdown stays recorded,** because it happened.

**An undo never fights a person.** A bus somebody has since moved themselves
stays where they put it, and a space another bus has taken is not reclaimed.
The event is still withdrawn either way.

### 8. Settings opens on MASTER, with the whole-app transfer in it

The Settings page opened on FACILITY MAP, which is a page's settings rather
than the app's. **MASTER is the first section now, and the one that starts
open**; the four page sections stay closed.

**MASTER EXPORT and MASTER IMPORT** move the whole app in one file — the
board, the Defect Log, the Down Sheet, Fleet Campaigns, the remembered parts
and findings, and every page's settings. They were EXPORT ALL DATA and IMPORT
ALL DATA behind ACTIONS on the Facility Map, reachable from that one page;
Settings is in the nav on all six. The map keeps its Fleet Map transfer and
points at where they went.

The reading and writing **moved into `fleet-restore.ts` rather than being
copied**, so there is one answer to what a valid backup is. It keeps all four
of the map's refusals — not a backup, no buses, something that is not a bus,
and two buses under one id, which would silently merge two real buses — and
keeps the rule that made them safe: **a key the file does not carry is left
alone, not cleared.** Campaigns were missing from the backup until version 4,
so restoring an older file must not wipe the campaigns this device holds. The
board is written first and its result decides everything, so a refused write
leaves nothing half-restored.

**RESTORE LAST GOOD COPY moved into MASTER too**, beside MASTER IMPORT. Both
answer "this device is wrong, put it right", and leaving one on the map split
one job across two pages. It is described as the smaller step: it restores the
buses and their repairs, while the Down Sheet, campaigns and settings stay as
they are, where MASTER IMPORT replaces everything.

**The app was already promising this.** The save-failure notice has said
*"restore the last-known-good copy from Settings"* for as long as it has
existed, and the safety-stop alert sent people to *"Fleet Tracker Settings"*.
Neither was true until now.

**Three more pointers the move had broken, found by auditing what travels with
a whole-app transfer rather than by waiting for somebody to hit them:**

- the wrong-file message on every section transfer told people to *"Use IMPORT
  ALL DATA in Facility Map settings"* — a button that no longer exists, on a
  page that no longer has it. It names MASTER IMPORT in Settings now.
- the offline backup reminder's button said EXPORT FULL BACKUP while the
  Settings button said MASTER EXPORT. One file, one function, two names, which
  is how somebody ends up with two backups and no idea which one restores.
- the map's section was still titled BOARD BACKUP & TRANSFER while holding only
  the Fleet Map transfer. It is FLEET MAP TRANSFER, and its note names all
  three whole-device controls and where they live.

**ONE LOOK FOR EVERY PAGE** sets the map and the Defect Log / Fixed Repairs
pair together. It is a **writer, not a layer**: one press writes into each
page's own settings, so the sections below show what happened and can still be
tuned one at a time, and there is never a second value to decide between. It
reads back as active only when every page actually agrees.

### 9. The Down Sheet divides itself into four bands

The sheet gave one long ranked list. The two questions it is actually read for
— **how many buses are down, and how many of those are not even on the
property** — could only be answered by scrolling and counting, and inspections,
spark plugs and valve adjustments counted as breakdowns, which is what made the
down count read high.

It now divides itself **by default**, not only when an ordering is picked:

| Band | What is in it |
| --- | --- |
| **OFF PROPERTY** | Away at a vendor or otherwise not in the yard |
| **SCHEDULED** | Down in the yard with a mechanic or vendor named |
| **UNSCHEDULED** | Down in the yard with nobody assigned yet |
| **INSPECTIONS & SCHEDULED MAINTENANCE** | Inspections, spark plugs and valve adjustments |

Every divider carries **its own count**, and the four counts sit **above the
sheet beside the total**, so no number has to be arrived at by scrolling.

**The precedence is deliberately not the reading order.** Where the bus
physically is beats everything, so a bus at Bus & Truck is off property whether
it went there for an inspection or a transmission. The page reads that from
**the map's own location, looked up by bus id** — not from anything copied onto
the entry, which would go stale the moment somebody moved the bus on the map.
What the work *is* comes next, so an inspection is an inspection with or
without a name beside it. **Only then does it come down to who has it,** which
is what puts the pencilled-in overflow rows at the bottom of a paper sheet into
UNSCHEDULED instead of leaving them indistinguishable from assigned work — the
floor's own definition of unscheduled is a row with no name attached.

**ORDER sorts inside a band now** rather than dissolving the bands, so the
counts on the dividers never change with the sort. WORK CATEGORIES still
sub-groups within each band, exactly as it did across the whole sheet before.

**The photo import is taught the same structure,** because a sheet organized
this way is the sheet that gets photographed. The scan prompt names the four
headings, says a heading is **never a bus row** and applies to every row
beneath it until the next one, and says a row's own wording still wins over the
band it sits in — a collision is an Accident and an R/C is a Roadcall wherever
it is written. Pencilled-in rows are called out as real rows to read, with the
mechanic left empty when no name is written beside them. The section normalizer
learns the heading words, with **inspection decided before scheduled** because
INSPECTIONS & SCHEDULED MAINTENANCE contains the word "scheduled".

**Each scan-review row now says which band it will land in before the import**,
read from the same two functions the sheet itself uses so the two cannot drift,
and it follows the MECHANIC / VENDOR field live as that field is typed — which
is the field that decides scheduled from unscheduled.

**The rules were then corrected against a real sheet** — the Vehicle Down Sheet
of 09/5/2026, 55 rows over two pages — and three of them were wrong on it:

- **The service codes are whatever the interval is.** That morning's sheet
  carries A3, A15, A21, B12, B18 and C24. The rule listed the intervals it had
  been shown — 6, 12, 15, 18, 24 — so **A21 and A3 were counted as buses that
  broke.** It now takes any one- or two-digit code.
- **The letter and the number are written together or hyphenated, never spaced.**
  Tightening that was the price of widening the number: under the old loose
  spacing, "needs a 12 volt battery" would have become an inspection.
- **PM'S heads a row carrying six buses at once** and was counted as six
  breakdowns. It is scheduled maintenance. **PM DEFECTS is the opposite** — the
  faults found while doing a PM, on a bus that is genuinely down — and the sheet
  carries two of those, so the rule has to tell them apart. It does.
- **TRANS HUB DIFF** is a fluid service written as three assemblies with no
  symptom. All three words are required, so a roaring differential stays a
  repair.
- **A vendor in the MECHANIC/LOCATION column means the bus is there.** Two rows
  carry "Bus & Truck" in that column, and one writes "Off Property" into the
  reason as well. **Only that column counts:** a note saying "waiting on a call
  back from Cummins" is a bus sitting in the yard, and reading vendor names out
  of the whole row would have sent it off property.

**A bus can be on the sheet twice, and the fold must not lose the fault.**
Bus 17514 appears once for MISFIRES with JEVELL on it and again on the PM'S
line. A bus gets one row, so those merge — and asking only whether the row
mentioned a PM sent the merged row to INSPECTIONS, dropping a live misfire out
of the down count. **A row is scheduled maintenance only when that is ALL it
carries now:** the maintenance wording is struck out and whatever is left is
examined, and if anything with words in it survives, somebody wrote a complaint
and the bus is down. Leftover punctuation and the bus numbers on a PM line are
not a complaint. Both facts still show on the row — the reason still reads
MISFIRES / PM'S — it is only the counting that has to pick one, and it picks the
fault. Which row was photographed first does not decide it. This also moves
17550, written as "B12 / STEERING SHAKES AT 35 MPH": the B12 does not stop the
shake from being a fault.

The scan prompt learned the same sheet: a **struck-through bus number** has come
off the sheet and is skipped, a **row carrying several bus numbers becomes one
row per bus** sharing the reason, and the **MECHANIC/LOCATION column** is
described for what it is. The scan's own idea of an inspection was replaced by
the sheet's, because two copies had already drifted — the scanner took any
number after the letter while the page took a list of five, so A21 was an
inspection to one and a breakdown to the other.

## Validation

- 206 regression tests passing, ESLint clean, production build succeeds
- **The Down Sheet bands driven against the PRODUCTION build at 1440 and 390,
  zero console errors:** the four counts read 1 / 1 / 2 / 2 against a total of
  6 and summed to it; the four dividers rendered in order carrying those same
  counts; line numbers ran 01–06 continuously across the bands; and **a bus
  parked at `offsite-0` with a mechanic named and section Pending still landed
  in OFF PROPERTY**, which only the location rule can do — that case is in the
  seed precisely because nothing else in the row would put it there. On a
  390px phone the total spans the row above a 2×2 of bands and the page does
  not scroll sideways (`scrollWidth` 390 = `clientWidth` 390)
- **The scan review driven against the PRODUCTION build** with the four
  headings stubbed in place of the model: each row showed GOES TO with its own
  band and colour, full width across the row's grid, and typing a mechanic into
  the third row moved it live from UNSCHEDULED to SCHEDULED
- **Each band divider resolves its own colour at the top level,** asserted by
  stripping every media block out of the stylesheet and re-matching — the same
  trap that put the road-call card note inside the phone breakpoint earlier in
  this release
- **The whole 09/5/2026 sheet is a test fixture**, transcribed row by row with
  the band each row belongs in, including the two PM DEFECTS rows, the six-bus
  PM'S row, both vendor rows, the double-listed 17514 and the three handwritten
  margin entries. Driven against the PRODUCTION build it renders **54 rows as 2
  off property, 9 scheduled, 28 unscheduled and 15 inspections** — so the sheet
  that reads as 54 buses down is **39 buses actually down, two of them not on
  the property.** That is the count the sheet could not give before
- **A production bug the unit tests could not have found.** `normalizeEntry`
  stamps `Repair required` into the repair field and into every repair item of
  an entry that arrives without one, so a row whose whole reason is `A15` comes
  back off storage carrying that phrase. Read as a written complaint it put
  every inspection back in the down count — **the built app showed INSPECTIONS 0
  against data that scored 16 in isolation.** The app's own stand-ins are now
  excluded the way the catalog category already was, and the exact
  post-storage shape of an inspection row is pinned by a test that was confirmed
  to fail without the fix
- **Every rule the real sheet corrected was confirmed to fail without it:**
  restoring the old interval list, dropping PM, dropping the PM DEFECTS guard,
  and loosening the code spacing each fail the fixture on their own
- **Both new Down Sheet tests were confirmed to fail with the rules they cover
  removed:** deleting the location rule from `downSheetGroup` fails the band
  test, and moving inspection below scheduled in the scan normalizer fails the
  photo-import test
- **Sharing one definition of an inspection immediately caught its own
  regression:** the shared pattern required the singular, so the scan stopped
  recognising its own INSPECTIONS heading. The photo-import test failed on it
  before it could ship
- **RESTORE LAST GOOD COPY driven against the PRODUCTION build, 13 checks,
  zero console errors:** it renders inside MASTER reading "1 DEFECTS" off the
  stored snapshot; the map's ACTIONS no longer carries it, is titled FLEET MAP
  TRANSFER, names all three controls and where they went, and has no dead
  button names left; pressing it put both buses and the saved defect back
- **The MASTER section driven against the PRODUCTION build, 23 checks, zero
  console errors:** MASTER first and open with the other four closed; Midnight
  set the map's key and the log's key in one press; MASTER EXPORT wrote a
  backup carrying the board and all seven side keys; emptying the board and
  importing that file back restored two buses, the log's theme and the
  campaigns, and the open page refreshed without a reload; a file that is not
  a backup changed nothing and never even asked
- **Driven against the PRODUCTION build, 19 checks, zero console errors:**
  - tick then untick at 30 seconds put bus 17505 back in `garage-4` with no
    event and no card note
  - the same untick against a three-hour-old road call left the event, the road
    slot and the card note alone, and only cleared the flag
  - ticking ROADCALL on the Facility Map recorded an event that showed up in
    the Defect Log's filter, and unticking it there put the bus back in
    `garage-5`
  - the exact edge is pinned by unit tests: 59 seconds is inside the window, 60
    exactly is outside
- **Driven in Chromium at 390 and 1180, 21 checks, zero console errors:**
  - ticking ROAD CALL on bus 17505 moved it to `road-0`, set the map flag, and
    stamped one event with `by:"CJ"` and `defectId:"d1"`
  - saving that repair again left the count at one
  - a road call two days old showed `ROAD CALL Sep 4, 12:36 AM` under the
    LATEST line; a nine-day-old one showed nothing; a bus that never
    road-called showed nothing
  - the note measured `rgb(124, 58, 237)` from `--downsheet-badge`, the DS
    badge's own purple, at both widths, and sat under and left-aligned with the
    time on a phone
  - the quick filter counted exactly 2 and listed 17505 and 17506, not the
    nine-day-old 17507
  - the map drew the bus on the road
- The unticking fix and the seven-day edge are pinned by unit tests: exactly
  seven days still shows, a second past it does not, and the window plus the
  backlog always equals the whole history
- **The card styling was caught by measuring, not reading.** It first landed
  inside the phone breakpoint, so on a desktop the note drew as bare text with
  no background at all; the browser reported no matching CSS rule, which is how
  it was found. The visual rule is top level now, and the grid row stays in the
  breakpoint that owns the grid.

## After it is live

1. **Open ⚙ SETTINGS.** It opens on **MASTER**, with MASTER EXPORT and MASTER
   IMPORT and a theme picker that sets every page at once. The four page
   sections are closed below it.
2. **Press MASTER EXPORT, then MASTER IMPORT with the file it just wrote.** It
   asks first, then reports what it restored. Do this on a phone too — it is
   the phone move-to-a-new-device path, and it is no longer on the map.
3. **Look just below it for RESTORE LAST GOOD COPY**, with a date and a defect
   count on it. It used to be on the map. Do not press it unless the board is
   actually wrong — it steps the buses back to before the last save.
4. **Open LOG DEFECT on any bus.** WORK DONE SO FAR still has six boxes, with
   **ROAD CALL** third, where PARTS ON ORDER used to be.
5. **Tick ROAD CALL and save.** The bus should move to the road on the Facility
   Map, wear its orange ROADCALL badge, and the Defect Log card should show a
   purple **ROAD CALL** note with the date and time under the LATEST line.
6. **Open that repair and save it again.** The note must still say one road
   call, not two.
7. **Untick ROAD CALL and save straight away.** Within a minute of ticking it,
   the whole thing comes back out: no note, no count, and the bus returns to
   the space it came from.
8. **Do it again on a road call from yesterday.** The box unticks and the flag
   clears, but the note and the count stay, because that breakdown happened.
9. **Tick ROADCALL on the Facility Map** in the bus editor. It should count
   toward the same note, counter and filter as one ticked on the Defect Log.
10. **QUICK FILTERS → Road Calls (Last 7 Days).** Every bus that road-called this
   week, and nothing older.
11. **Open a bus you had already ticked PARTS ON ORDER on** before this release.
   The tick is still there, now shown on **Fixed Repairs** rather than the
   Defect Log.
12. **A bus that road-called eight days ago** should have no note and should not
   be in the filter.
13. **Open DOWN SHEET.** Above the sheet there is now a row of counts — TOTAL ON
   SHEET, then OFF PROPERTY, SCHEDULED, UNSCHEDULED and INSPECTIONS &
   SCHEDULED MAINTENANCE. The four should add up to the total.
14. **Look down the sheet.** It is divided by four coloured dividers in that
   same order, each carrying its own count. The line numbers keep running
   across them.
15. **Find a bus parked in OFF PROPERTY on the Facility Map** and check it sits
   in the OFF PROPERTY band even though the sheet says a mechanic has it —
   where the bus is beats what the sheet says.
16. **Take the mechanic's name off a row** and save. It should move from
   SCHEDULED to UNSCHEDULED. Put the name back and it returns.
17. **Check a spark plug or valve adjustment row** sits with the inspections
   rather than counting as a bus that broke.
18. **Change ORDER to WORK CATEGORIES.** The four bands and their counts must
   stay exactly as they were; only the order of rows inside each band changes.
19. **SCAN SHEET a photographed down sheet.** Each review row now says GOES TO
   with the band it will land in. Type a mechanic into a row and watch it move
   from UNSCHEDULED to SCHEDULED before you import.
20. **Check the inspection block at the bottom of a real sheet.** Every service
   code should be in INSPECTIONS — A3 and A21 included, not just the common
   intervals — along with TRANS HUB DIFF and every bus on the PM'S line.
21. **Check the two PM DEFECTS rows are NOT in inspections.** Those are faults
   found while doing a PM, so those buses are down.
22. **Check a bus with a vendor in the MECHANIC/LOCATION column** sits in OFF
   PROPERTY even though it is parked in the yard on the map.
23. **Find a bus written on the sheet twice** — once for a fault and once on the
   PM'S line — and check it counts as a bus that is DOWN, not as an inspection.
   The row should still say both, something like MISFIRES / PM'S.

## The way back

Measured in a throwaway worktree from `f5939df`:

- **Do not revert `f5939df` on its own.** It is the rule that keeps a bus with a
  live fault in the down count when a PM is written on the same row; without it
  a folded row goes to INSPECTIONS and a real breakdown leaves the count. It
  does revert cleanly, which is the only reason to say so.
- `git revert f5939df 4bca6d7 dda0661` (newest first) is **clean** and takes the
  Down Sheet bands out as a unit, which is the right set if they have to go.
- `git revert 4bca6d7` alone is **clean**, and leaves the four bands in place
  with the rules as they were before the real sheet corrected them — which
  means A21, A3, TRANS HUB DIFF and every bus on a PM'S line go back to being
  counted as breakdowns. There is no reason to revert this one on its own.
- `git revert dda0661` alone is **clean.** The Down Sheet goes back to one
  ranked list and the scan prompt forgets the four headings. Nothing else in
  the release depends on it — it shares **no application file** with the other
  four commits, only the test file and this one, and both reverted cleanly when
  measured.
- `git revert f5939df 4bca6d7 dda0661 415fe96 4241dd7 ef5add7 27891d9` (newest
  first) is **clean** and takes the whole release out together.
- `git revert 415fe96` alone is **clean.** RESTORE LAST GOOD COPY goes back to
  the map and the three corrected pointers revert with it — including the
  wrong-file message, which would again name a button that does not exist.
  Prefer reverting the pair below over this one alone.
- `git revert 415fe96 4241dd7` (newest first) is **clean** and is the right
  pair if the MASTER section has to go: it puts the whole-app transfer and the
  recovery control back on the map together, which is where they both were.
  **Reverting `4241dd7` alone would leave the app with no way to move
  everything to another device**, since MASTER IMPORT is the only one now.
- `git revert ef5add7` alone is **clean.** The map's checkbox stops recording
  events and the sixty-second window goes, leaving the Defect Log's box working
  as it did in the first commit.
- `git revert ef5add7 27891d9` (newest first) is **clean.** ROAD CALL leaves
  the boxes, PARTS ON ORDER returns to them, and the card note and the filter
  go with it.
- **Road-call events already written stay on their buses,** harmlessly ignored,
  and reappear if the feature comes back. Nothing is destroyed by going
  backwards. The same is true of the flags and the moves: a bus parked on the
  road stays there, which is where it was put.
- Reverting also takes the unticking fix with it. That fix is independent and
  worth keeping — if the road-call work has to go but the fix should stay,
  revert this commit and re-apply the one-line `workStates:incoming.workStates`
  in `saveDefectLogRecord`.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 151 | Live | <published tip hash> | The Down Sheet divides itself into OFF PROPERTY, SCHEDULED, UNSCHEDULED and INSPECTIONS & SCHEDULED MAINTENANCE by default rather than giving one long ranked list, with the band rules checked row by row against a real 55-row sheet so that every service code counts as scheduled maintenance rather than only the common intervals, a PM'S line carrying several buses counts as the service it is while PM DEFECTS stays a bus that is down, and a bus written on the sheet twice — once for a fault and once for a PM — folds into the one row a bus gets and is counted as down rather than as maintenance, so a real breakdown cannot drop out of the count, and a vendor written in the MECHANIC/LOCATION column puts the bus off property while the same name in a note does not, each divider carrying its own count with the four counts and the total sitting above the sheet, so how many buses are down and how many are not even on the property can both be read at a glance and inspections, spark plugs and valve adjustments stop counting as breakdowns; where the bus physically is decides the band ahead of anything the sheet says, read from the Facility Map's own location by bus id, then what the work is, then who has it, which puts the pencilled-in overflow rows with no name attached into UNSCHEDULED; ORDER now sorts inside a band instead of dissolving the bands, so the counts never change with the sort; and the photo import reads the same four headings, treating a heading as a heading rather than a bus row and applying it to every row beneath it while a row's own wording still wins, with each scan-review row saying which band it will land in before the import; Settings opens on a MASTER section carrying every whole-device control together — MASTER EXPORT, MASTER IMPORT and RESTORE LAST GOOD COPY, which the save-failure and safety-stop notices had already been pointing at Settings for — and the wrong-file message, the backup reminder's button name and the map's section title were corrected to match; MASTER EXPORT and MASTER IMPORT which move the whole app between devices in one file and replace EXPORT ALL DATA and IMPORT ALL DATA on the Facility Map, with the reading and writing shared in one module that keeps every refusal and leaves any key the file does not carry alone, plus one theme that sets every page at once by writing into each page's own settings; ROAD CALL replaces PARTS ON ORDER as the third work box on the Defect Log, and the Facility Map's own ROADCALL checkbox records the same event so the two can no longer disagree; either tick can be taken back whole within sixty seconds, event and bus move together, while an older one leaves the breakdown recorded and only clears the flag: ticking it appends a dated, append-only event to the bus, turns on the Facility Map's own ROADCALL flag, and parks the bus in the first open space on the road, with only the unticked-to-ticked transition counting so re-saving a repair cannot record a second breakdown; the Defect Log card shows the road call under its LATEST line in the DS badge's purple for seven days, leading with a count when there is more than one, while the event itself stays on the bus permanently so a pattern of breakdowns remains visible; a Road Calls (Last 7 Days) quick filter lists this week's and empties itself as they age out, driven by the bus's own history rather than its defects; PARTS ON ORDER moves to Fixed Repairs beside the part it is about, keeping its stored key readable on every record that already carries it; and unticking the only ticked work-state box now sticks, which had silently failed for all six |
```

---

# Version 150 — One Settings page for everything, and IMPORT ALL DATA works again

**Publish this next, after Version 149.** It carries a data-safety fix: the
map's IMPORT ALL DATA button has thrown on every press since Aug 31 (section 6).

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`6d62787`** |
| Last code-bearing commit | `6d62787` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 149, published from `011bb09` |

**Six application commits.** Three were written before Codex published 149
and have been **rebased onto the release commit `b7da27a`**, not merged over
it; the last three came after it:

```
git log --oneline 011bb09..6d62787
6d62787 Import the writer IMPORT ALL DATA calls, so restoring a backup works again   <- app code
484b525 Move Version 150 to ca5cec0: the Settings sections collapse                  <- docs only
ca5cec0 Collapse the Settings sections, and make the title row the thing you press   <- app code
6acf869 Queue Version 150 from e89d17b                                                <- docs only
e89d17b Put every setting in the app on one page, behind the gear in the nav   <- app code
e9bfc30 Draw the page nav from one list instead of five copies                 <- app code
38e3365 Make ALL mean everything, search box included                          <- app code
35f9006 Give a repair a service bulletin, and name the sensor that shuts buses down   <- app code
b7da27a Record Sites Version 149 release                                       <- Codex, docs only
074ad4d Fold the sixth work state into the Version 149 handoff                 <- docs only
```

Application files touched, in full — a **new route, `app/settings/`**, and the
service worker:

```
git diff --name-only 011bb09 6d62787 -- app public
app/defect-log/defect-log-settings-modal.tsx   (new)
app/defect-log/defect-log-settings.ts          (new)
app/defect-log/defect-log-sync.ts
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet-settings-store.ts    (new)
app/down-sheet/down-sheet-settings.tsx
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/fixed-repairs/fixed-repairs-settings.tsx
app/fixed-repairs/fixed-repairs.css
app/fixed-repairs/page.tsx
app/fleet-backup.ts
app/globals.css
app/lists/page.tsx
app/map-settings-panel.tsx                     (new)
app/map-settings.ts                            (new)
app/page.tsx
app/repair-catalog.ts
app/settings/page.tsx                          (new)
app/settings/settings.css                      (new)
app/status-icon.tsx                            (new)
app/tracker-nav.tsx                            (new)
app/tracker-pages.ts                           (new)
public/sw.js
```

No dependency, database, or CI change:

```
git diff --name-only 011bb09 6d62787 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: **201 tests passing** (196 at Version 149, five added), ESLint clean,
production build succeeds.

## Migrations

**None, and no rewrite.** No storage key is renamed and no payload shape
changes. `app/storage.ts` is untouched. The seven keys read exactly as they
did; the Settings page writes each one by **merging over what it already
holds**, so the Down Sheet's quick note and sort order, the DS badge view the
map's menu sets, and any field a later release adds all survive a change made
there.

**One thing phones will notice once:** `public/sw.js` gains `/settings` in
`CORE_PAGES`, which bumps the shell cache name from `pace-bus-tracker-shell-v4`
to **`v5`**. The first online launch after the update re-downloads the shell,
once; after that `/settings` works offline like every other page. This is the
same bump Fleet Campaigns needed in Version 137.

MERGE DUPES still runs only when a person presses it and confirms.

## What changed

### 1. The gear is a page

Every page kept its own settings behind its own gear — the Facility Map's
modal held fifteen sections, the Down Sheet's five, the Defect Log's eight, and
Fixed Repairs re-read the Defect Log's key to show three of those again.

**⚙ SETTINGS is now the sixth link in the nav on every page**, and `/settings`
holds one large section per page: FACILITY MAP, DOWN SHEET, DEFECT LOG, FIXED
REPAIRS, with a jump row at the top. Each section renders that page's **own
panel inline** — the same component the gear used to open, with the shade and
the close button switched off — so nothing was copied and nothing can drift.
The Defect Log and Fixed Repairs sections are drawn in the theme you pick, so
what you see there is what the page will look like.

**The sections collapse.** Open, all four ran to fourteen phone screens.
FACILITY MAP starts open; DOWN SHEET, DEFECT LOG and FIXED REPAIRS start
closed, each a single bold title row until it is pressed. The whole row is
the button, not a chevron to aim for. The jump links at the top open what
they jump to. A closed section is hidden rather than unmounted, so its state
is where you left it when it opens again.

**The per-page gears are gone** from the Down Sheet, the Defect Log and Fixed
Repairs. The Facility Map's button is **ACTIONS** (☰ on a phone, under MORE)
and opens only what acts on the board rather than describes it: backup and
transfer, repair cleanup, creating a bus, renumbering one. Two map hints that
said *"in Settings"* now say *"under ACTIONS"*, and the report tooltip points
at *EXPORT ALL DATA under ACTIONS on the Facility Map*.

**Fixed Repairs has no settings of its own** — it reads the Defect Log's
theme, font and colours off the same key — so its section is driven from the
same state as the Defect Log's and either one changes both. The section says so.

### 2. MERGE DUPES lives on the Settings page

Under DEFECT LOG, with **the live count on the button** — from the same
function that does the merging, so the number is by construction the number
the button will act on. The bulk-loss guard is lifted there and only there, as
it was on the Defect Log since 135. **UNDO MERGE** appears after a merge and
puts every record back, cloud tombstones included, until you leave the page.
The Defect Log's feed row is now CLEAN UP · SCAN SWEEP · AI OPERATOR.

The Defect Log's report button and both section transfers (Down Sheet, Defect
Log) came with their panels. An imported Down Sheet marks its buses down on
the map at once rather than waiting for the sheet to be opened.

### 3. A repair can carry a Technical Service Bulletin

**LOW OIL** and **COOLANT LEVEL SENSOR** join Misfire and Loss of power as
check-engine symptoms — four boxes in two columns, bottom row full. The sensor
is named in full because it is not the coolant temp sensor.

**TSB — TECHNICAL SERVICE BULLETIN** is a second, permanent note under the
existing amber one, in warm tan: what this fleet has learned about a repair,
keyed on category and issue and read through the same migration as notes. The
first bulletin is the coolant level sensor, written down from Curtis — which
sensor it is, that it shuts the bus down below a tight glycol threshold, that
a bus which shut down and restarts fine is usually this, that high engine
temperature is a severe leak and not this, and that a bus running with it
unplugged has its low-glycol shutdown bypassed.

### 4. ALL means everything, search box included

Pressing ALL on the Defect Log clears the search box too. Only ALL does; IN
PROGRESS and FIXED TODAY keep the search, because narrowing a search by state
is their whole point.

### 5. One nav list

The page nav is drawn from one list in `tracker-pages.ts`; five hand-written
copies had drifted (the map called itself FLEET TRACKER). Adding the sixth
page was one line because of this.

### 6. IMPORT ALL DATA restores a backup again

**Found by the type checker while checking this release, and confirmed in the
source and in a browser.** The commit of Aug 31 that added the save-failure
banner swapped the map's storage import to `writeFleetStorageResult` and left
three bare `writeFleetStorage(...)` calls behind: **IMPORT ALL DATA**, and the
AI operator's clear-down-sheet plan and its undo. A bundler does not check
free identifiers, so every build since has passed, and every press of IMPORT
ALL DATA has thrown `ReferenceError: writeFleetStorage is not defined` — caught
into *"This file is not a valid fleet board backup. No changes were made."*
The one button that restores a phone from a backup restored nothing, and said
the file was at fault.

**The fix is the missing name in the import.** Nothing else changes: the same
guarded writer, the same confirm, the same `allowBulkDefectLoss:true` a
deliberate restore has always carried.

**The test is the rule it broke,** not the one line: every file under `app/`
that calls a storage function must import it, checked against the storage
module's own export list rather than a copy. It was **confirmed to fail** with
the import line stashed and to pass with it restored, so the next missing
import fails the suite instead of the first person to press the button.

## Validation

- 201 regression tests passing, ESLint clean, production build succeeds
- **IMPORT ALL DATA round-tripped in Chromium against the dev server:**
  EXPORT ALL DATA wrote a 62-bus backup; two buses were removed from storage
  and the reload drew 60; IMPORT ALL DATA from that file asked first, then
  reported *"Board backup imported successfully. All 62 buses are now
  available on this device."*, storage held 62 and the map drew 62, with no
  page error. **The same run against the pre-fix code produced the "not a
  valid fleet board backup" alert and left the board at 60** — the failure the
  live site has been giving
- **Driven in a 390px, 800px and 1180px Chromium, 56 checks, zero console
  errors** — a script, not a test suite, so the tests carry the guarantees:
  - six links in one row at 1180 and **two full rows of three at 390**; no
    horizontal overflow at either width, collapsed or with everything open;
    the four panels inline with no shade
  - **collapsed by default the way the page ships:** FACILITY MAP open, the
    other three closed; **4,647px tall at 390 against 11,879px with everything
    open**; every title row at least 58px tall; pressing a title opens it and
    pressing it again closes it; the DEFECT LOG jump link opens its section
    and lands it under the sticky jump row
  - changing DEFAULT SHIFT on the Settings page left the Down Sheet's
    `quickNotes` and `order` in the key untouched
  - picking the Midnight theme for the map kept `downSheetBadgeView` and an
    unknown future field in the key, and stamped `statusVersion:3`
  - a manual map colour set the theme to custom **and** the colour — two
    updates in one tick, which is the case a state-only implementation lost
  - picking Dark under DEFECT LOG turned both that section and FIXED REPAIRS
    dark, **reached an open Defect Log tab**, and that tab did not write its
    old theme back; picking Tactical under FIXED REPAIRS drove the log panel
  - MERGE DUPES on a seeded exact repeat: count `(1)`, confirm, 3 records → 2
    with the earliest date kept, tombstone written; UNDO MERGE: 3 records,
    count back, tombstone withdrawn
  - every other page at 390: no gear button, SETTINGS in the nav, ACTIONS on
    the map (under MORE on a phone) opens backup/cleanup/create/renumber only
- Two things were caught by measuring rather than reading: the map's
  relabelled button had no glyph and the phone command bar hides button text,
  so it was invisible on phones until the glyph went back; and the map page had
  lost a line in the extraction (`applyTheme`) that the type checker found
  before the build did
- A test asserts `sw.js` pre-caches every real route under `app/`, so a page
  added without the service worker fails the suite — that is what forced the
  cache bump

## After it is live

1. **Open any page.** Six links in the nav, ⚙ SETTINGS last; on a phone, two
   rows of three.
2. **Open ⚙ SETTINGS.** FACILITY MAP is open; DOWN SHEET, DEFECT LOG and
   FIXED REPAIRS are single bold title rows. Press a title and it opens in
   place — nothing pops up, nothing to close. The jump links at the top open a
   section too.
3. **Under DEFECT LOG pick Dark.** That section and FIXED REPAIRS turn dark
   together. Open the Defect Log: dark. Open Fixed Repairs: dark.
4. **Under DOWN SHEET change DEFAULT SHIFT**, then open the Down Sheet. The
   quick note is still there and + ADD DOWN BUS defaults to the new shift.
5. **Look at MERGE DUPES.** The live board was cleaned up in 135, so expect it
   disabled with the hover text *Every open repair on this board is recorded
   once* — or a count, if repeats have crept back. Pressing it still asks first.
6. **On the Facility Map** the gear is gone; ACTIONS (☰ under MORE on a phone)
   opens backup and transfer, repair cleanup, create and renumber — and nothing
   else.
7. **On the Down Sheet, the Defect Log and Fixed Repairs** there is no gear
   button anywhere.
8. **On a phone**, the first launch online after the update re-downloads the
   shell once. Then put it in airplane mode and open ⚙ SETTINGS: it loads.
9. **Open LOG DEFECT, choose Engine → Check engine light.** Four symptom
   boxes; tick COOLANT LEVEL SENSOR and the tan TSB appears under the note.
10. **On the Facility Map, ACTIONS → EXPORT ALL DATA, then IMPORT ALL DATA
    with the file it just wrote.** It asks first, then says *Board backup
    imported successfully* with the bus count. Before this release the same
    press said the file was not a valid backup. Do this on a phone too — it
    is the phone restore path.

## The way back

Measured in a throwaway worktree from `6d62787`, not assumed:

- **Do not revert `6d62787`.** It is the import fix; taking it out puts IMPORT
  ALL DATA back to throwing. It does revert cleanly on its own, which is the
  only reason to say so.
- `git revert ca5cec0` alone is **clean** — the sections stop collapsing and
  everything else stays.
- `git revert 6d62787 ca5cec0 e89d17b` (newest first) is **clean** — it removes
  the Settings page, puts every gear and MERGE DUPES back where they were, and
  drops the cache name to `v4`. Phones re-download the shell once more.
  `e89d17b` alone conflicts, because `ca5cec0` edited the same files; if the
  Settings page has to go, keep the fix by reverting the pair and then
  re-applying `6d62787` — it is one word in one import line.
- `git revert 6d62787 ca5cec0 e89d17b e9bfc30` is clean.
- **`38e3365` or `35f9006` alone conflict** in `tests/rendered-html.test.mjs`
  (and `35f9006` in `app/defect-log/page.tsx`) because later commits edited the
  same lines — measured from `e89d17b`; no later commit touches those files. To
  take those out, revert **all six, newest first**:
  `git revert 6d62787 ca5cec0 e89d17b e9bfc30 38e3365 35f9006` — clean.

No migration to undo in any case. A record that already carries a symptom
added in `35f9006` keeps the stored string, harmlessly ignored, and it
reappears if the box comes back.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 150 | Live | <published tip hash> | IMPORT ALL DATA on the Facility Map restores a backup again — since Aug 31 it had thrown on a missing import and reported the file as invalid, and a test now checks that every storage function a file calls is one it imports; every setting in the app lives on one Settings page, the sixth link in the nav behind the gear, one collapsible section per page rendering that page's own panel inline with FACILITY MAP open by default, with every write merging over what the key already holds; the per-page gears are gone and the Facility Map's button is ACTIONS, holding only backup and transfer, repair cleanup, create and renumber; MERGE DUPES moves to the Settings page with its live count on the button and an UNDO MERGE; Fixed Repairs' appearance is shown to be the Defect Log's, driven from one state so neither can overwrite the other; the service worker pre-caches /settings (shell cache v5, one re-download); a repair can carry a Technical Service Bulletin under its note, the first one for the coolant level sensor, and Low oil and Coolant level sensor are check-engine symptoms; ALL on the Defect Log clears the search box; and the page nav is drawn from one list instead of five copies |
```

---

# Version 149 — Five days is the same fault, and the operator's report is a fact worth keeping

**Publish this next, after Version 148.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`011bb09`** |
| Last code-bearing commit | `011bb09` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 148, published from `60c2a01` |

**Two application commits.** The first was written before Codex published 148
and has been **rebased onto the release commit `2b34c52`**, not merged over it:

```
git log --oneline 60c2a01..011bb09
011bb09 Record that the operator reported it, alongside whatever the shop did   <- app code
13835c8 Queue Version 149 from 9b4e14b, and put the 147 row back                <- docs only
9b4e14b Look back five days for a duplicate defect, not two                     <- app code
2b34c52 Record Sites Version 148 release                                        <- Codex, docs only

git diff --name-only 60c2a01 011bb09 -- app
app/defect-log/defect-log-sync.ts
app/defect-log/page.tsx
app/duplicate-defects.ts
app/repair-catalog.ts
```

No dependency, database, or CI change:

```
git diff --name-only 60c2a01 011bb09 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 196 tests passing, ESLint clean, production build succeeds.

## Migrations

**None, and no rewrite.** No storage key and no payload shape changes. The
catalog gains a work-state key; it does not rename or retire one, so every
record already on the board reads exactly as it did.

`operator-reported` is simply absent from every existing record, which is what
"not ticked" has always looked like in this field — `workStates` is a partial
record, so a missing key is the normal state, not a gap to fill.

## What changed

### 1. Five days, not two

The Defect Log's duplicate guard looked back **48 hours**. It now looks back
**120 hours — five days.**

**The live board is the reason.** Of the 25 duplicate records found on it, two
were typed into this form by hand on different days, with the second landing
after the two-day window had already shut. A fault reported Monday and reported
again Thursday is the same fault. Both of those would now be caught before they
were written.

### Why widening cannot suppress real work

The guard **only ever matches a record that is still unresolved.** A repair that
was finished and came back does not match, because the finished one is resolved
— so a genuine recurrence still gets its own record no matter how soon it
returns. The rule that decides a match is unchanged: same bus, same category,
same issue.

### The number and the wording now come from one place

`RECENT_DUPLICATE_WINDOW_HOURS` and `RECENT_DUPLICATE_WINDOW_LABEL` are exported
together from `defect-log-sync.ts`, and the four messages that used to hardcode
"48 hours" read the label. The copy can no longer drift away from the rule the
code enforces, and the next change to this window is one line.

The note in `duplicate-defects.ts` recording how those two duplicates reached
the board was **updated rather than rewritten** — it still says the guard looked
back 48 hours at the time, and now adds what it looks back today.

## Validation

- 196 regression tests passing, ESLint clean, production build succeeds
- **Driven in a browser against a defect logged three days ago** — past the old
  window, inside the new one:
  `ALREADY LOGGED Sep 1, 12:53 AM · Use the existing defect. A new report is
  allowed after 5 days.` with the save button disabled
- The boundary test moved to the new line and **was confirmed to fail** with the
  window put back to 48, so it checks the change rather than passing on the
  fixture
- The test also asserts the day the old 48-hour window used to expire is now
  still caught
- **The six boxes were driven, not assumed.** They render in grid order with
  OPERATOR REPORTED bottom-right; ticking OPERATOR REPORTED, INSPECTED and TEST
  DRIVEN leaves all three checked; saving stores
  `["operator-reported","inspected","test-driven"]` on the record
- The checkbox assertion **was confirmed to fail against a radio conversion**

### 2. A repair can record that the operator reported it

WORK DONE SO FAR gains a **sixth box, OPERATOR REPORTED**, in the bottom-right
of the three-column grid. Six also fills the bottom row, so no box sits alone.

It was already a fact people recorded — *"Operator Reported Defect"* typed into
the description by hand — it just could not be counted, filtered, or read off a
badge while it lived in free text.

It is **last on purpose**: it says where the report came from rather than work
the shop did, which is what the other five describe.

**Several boxes at once already worked, and still do.** `workStates` is a record
keyed per state rather than one chosen value, so an operator report, an
inspection and a road test are all true of the same repair. What this release
adds is a **test**, because that only stays true while the picker draws
checkboxes — turning them into radios, or adding mutual exclusion, would
silently start throwing away recorded work and nothing else in the app would
complain.

The one control that IS exclusive stays exclusive and is now pinned too: a brake
test is a pass or a fail, never both, held as one stored result behind a pair of
`aria-pressed` buttons rather than two independent boxes.

## After it is live

1. **Find a bus with an open defect logged two to four days ago.** Try to log
   the same category and repair again. It should refuse, and the message should
   say *five days*, not 48 hours.
2. **Check a defect that was fixed and came back.** It should still be allowed
   through — the guard only holds back reports of faults that are still open.
3. **Open LOG DEFECT and look at WORK DONE SO FAR.** Six boxes now, with
   OPERATOR REPORTED in the bottom-right corner.
4. **Tick three of them at once** — say OPERATOR REPORTED, INSPECTED and TEST
   DRIVEN. All three should stay ticked, save together, and show on the record.
5. **Tick BRAKE TEST.** The pass/fail choice should still appear, and still be
   one or the other.
6. **Nothing else on the Defect Log should look different.**

## The way back

`git revert 011bb09 9b4e14b` — two commits, newest first, no migration to undo.

Either reverts alone. Reverting `9b4e14b` narrows the window to 48 hours again.
Reverting `011bb09` removes the sixth box; **any record that already ticked it
keeps the stored key**, harmlessly ignored, and it reappears if the box comes
back — nothing is destroyed by going backwards.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 149 | Live | <published tip hash> | The Defect Log's duplicate guard looks back five days instead of two, so a fault reported Monday and typed in again Thursday is recognised as the same fault rather than becoming a second record; the window only ever matches records that are still unresolved, so a repair that was fixed and came back still gets its own record; the window and the wording that reports it now come from one exported constant so they cannot drift apart; and WORK DONE SO FAR gains a sixth box, OPERATOR REPORTED, in the bottom-right, recording as structured data what was being typed into the description by hand, alongside any of the other five rather than instead of them |
```

---

# Version 147 — The defect form asks for the bus the way a mechanic reaches for it

**Publish this next, after Version 146.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`9d69a9b`** |
| Last code-bearing commit | `9d69a9b` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 146, published from `1d5454b` |

**One application commit.** It was written before Codex published 146 and has
been **rebased onto the release commit `4c1e502`**, not merged over it, so the
history stays a straight line:

```
git log --oneline 1d5454b..9d69a9b
9d69a9b Name the bus boxes for what they do, and make the typed number the big one   <- app code
4c1e502 Record Sites Version 146 release                                             <- Codex, docs only
afbcc83 Queue Version 146 from 1d5454b                                               <- docs only

git diff --name-only 1d5454b 9d69a9b -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
```

No dependency, database, or CI change:

```
git diff --name-only 1d5454b 9d69a9b -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 196 tests passing, ESLint clean, production build succeeds.

## Migrations

**None.** No storage key, no payload shape, no catalog identity. This release
changes only what the LOG DEFECT form looks like; every record it writes is
identical to what Version 146 wrote.

## What changed

All of it is in the LOG DEFECT / edit-defect form on the Defect Log, which is
the screen a mechanic uses more than any other.

### 1. The bus boxes are named for what they do

| | Version 146 | Version 147 |
| --- | --- | --- |
| First box | `BUS NUMBER`, and the first thing in it was a row of generations | **`BUS GENERATIONS`** — the chips, and the count |
| Second box | — | **`BUS NUMBER`** — TYPE BUS # and BUS LIST together |

One box called BUS NUMBER whose opening row was 15s / 17s / 18s / 20s was
telling a new person the wrong thing about both halves. The generations narrow
the fleet; the number names one bus. Each box now says which job it is doing.

### 2. TYPE BUS # is the biggest control on the screen

It is the way in that actually gets used, and it was rendering at the same 16px
as every other field. It is now **full width above the list, 26px, weight 800,
in the page's own `--log-text`** instead of the muted grey the other inputs
inherit — 27px on a phone.

It stays on `--log-text` rather than a hardcoded `#000` on purpose: that token
is a user setting in Defect Log COLORS, and black would be invisible in the dark,
midnight and tactical themes.

### 3. The LOGGED stamp moves to the bottom

It sat between the bus and the category, where it read like a field somebody had
to deal with. It is a fact about the record, so it is now the last thing in the
form, above the save buttons.

### 4. The bus list says why it is disabled

BUS LIST is disabled until a generation is chosen, and that control now lives in
a different box. Without a reason stated where the list is, it reads as a broken
dropdown, so it now says *"Pick a generation above to use the bus list, or type
the full number."*

### The wiring did not change

Worth writing down because it is a **three-way** binding and the split makes it
look like two:

- a generation filters the bus list **and** the type-ahead behind TYPE BUS #
  (both read the same `candidates` array);
- typing two digits lights the matching generation chip, and an exact number
  selects the bus;
- picking from the list fills the number **and** lights the generation.

The split is what a person reads. Nothing about how the three controls talk to
each other moved.

## Validation

- 196 regression tests passing, ESLint clean, production build succeeds
- **Driven at 414px**, the width of the reported screenshot: legends read
  `BUS GENERATIONS` then `BUS NUMBER`; picking 15s and typing `15505` selects
  Bus 15505 - On Road; the stamp reports as `child 15 of 15 (LAST)`
- One new test covering all four changes, plus the wiring's box membership
- **A CSS trap was found by measuring, not by reading.**
  `.log-form input,.log-form select{font-size:16px}` sits **later** in
  `defect-log.css` at the **same specificity** as an unscoped
  `.type-bus-number>input`, so the first attempt lost the tie and rendered at
  16px with no error anywhere — it looked applied and was not. Measured at 16px,
  scoped to `.log-form .type-bus-number>input`, measured again at 27px. The test
  pins the scoping and **was confirmed to fail without it**

## After it is live

1. **Open LOG DEFECT on a phone.** Two boxes: BUS GENERATIONS with the chips,
   then BUS NUMBER with a large typed field above the bus list.
2. **Type a full bus number without touching the chips.** The matching
   generation should light up on its own and the bus should be selected.
3. **Tap a generation, then the bus list.** It should be enabled and filtered to
   that generation.
4. **Open the form on a fresh bus and look at the bus list before picking a
   generation.** It should be disabled with the line telling you why.
5. **Scroll to the bottom of the form.** LOGGED should be the last thing above
   the save buttons, not up by the category.

## The way back

`git revert 9d69a9b` — one commit, two application files, no migration to undo.

Nothing stored depends on it, so a revert is purely cosmetic: every defect
logged while 147 was live reads identically afterwards.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 147 | Live | <published tip hash> | The LOG DEFECT form splits its one mislabelled BUS NUMBER box into BUS GENERATIONS for the 15s/17s/18s/20s chips and BUS NUMBER for the two ways of naming one bus; TYPE BUS # becomes the biggest control on the screen at 26px in the page's own text colour rather than 16px muted grey; the LOGGED stamp moves from between the bus and the category down to the bottom of the form; and the bus list now says it needs a generation instead of looking like a broken dropdown |
```

---

# Version 136 — One overloaded category becomes two, named the way the floor names them

**Publish this next, after Version 135.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`dccf431`** |
| Last code-bearing commit | `dccf431` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 135, published from `d3c05c3` |

Five commits sit in this range and **only two of them touch application code**.
The other three are documentation and tooling, and are listed here so nobody has
to wonder what they were doing in the diff:

```
git log --oneline d3c05c3..dccf431
dccf431 Keep the four door and ramp options the shop actually uses      <- app code
b5e553d Split Bus Controls in two, and name the stop request what the floor calls it   <- app code
44cbe4d Three skills that travel with the repository                     <- .claude/skills + CLAUDE.md
f022a90 Record Sites Version 135 release                                 <- docs only
1ded73e Queue Version 135                                                <- docs only
```

**Exactly one application file changed in the whole range.** Everything this
release does, it does in the repair catalogue:

```
git diff --name-only d3c05c3 dccf431 -- app
app/repair-catalog.ts
```

No dependency, database, or CI change. The filter returns nothing:

```
git diff --name-only d3c05c3 dccf431 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 176 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration, no dependency change.** `supabase/`, `package.json`
and `package-lock.json` are untouched.

**No LocalStorage key added, renamed or removed. Nothing on disk is rewritten.**
This is a read-time rename, the same mechanism every previous catalogue change
has used: a stored record keeps the wording it was saved with, and
`migrateRepairIdentity` moves it to its surviving home as it is read. A board
written by Version 135 opens on Version 136 with every defect intact, and the
reverse is true as well — see the known issue below.

### The category change

| Version 135 | | Version 136 |
| --- | --- | --- |
| `Bus Controls` — 52 options | → | `Operator/Driver Controls` — 40 options |
| `Doors, Ramp and ADA` — 27 options | → | `Bus Accessories` — 40 options |

The two old names disappear from the picker and neither can be selected again.
Catalogue totals: **300 options across 21 categories → 302 across 21.** The
category count is unchanged because two categories became two categories; what
moved is where the line between them falls.

`Bus Accessories` collects the physical things a passenger touches — both doors,
the ramp, the kneeler, wheelchair securement, the stop request, the bike rack.
`Operator/Driver Controls` keeps the switches, buttons, gauges, dash and driver
seat. A record filed under the old `Bus Controls` category is routed to whichever
of the two now owns it, per option, rather than all landing in one.

### Verified against the live Shop Cloud, not asserted

Every distinct category/issue pair actually present in `bus_defects` was read
from the live project and run through the new migration:

| | |
| --- | --- |
| Live defect records (`deleted_at is null`) | **334** |
| Records in the two affected categories | **35** — 25 `Bus Controls`, 10 `Doors, Ramp and ADA` |
| Distinct identities among them | 17 |
| **Records landing on a live, re-pickable option** | **35** |
| Records landing on a retired wording | **0** |
| Records resolving to nothing (orphans) | **0** |

They land 24 in `Operator/Driver Controls` and 11 in `Bus Accessories` — the
eleventh being a front-door fault that had been misfiled under `Bus Controls`
and now sorts itself into the right category on the way in.

The same check was run over **every option a Version 135 device can write**, not
just the ones already used, so a defect logged between now and this release
migrating cleanly is not left to chance:

| | |
| --- | --- |
| Version 135 options in the two categories | **79** |
| Land on a live, re-pickable option | **78** |
| Land on a documented retired wording | **1** |
| Land on nothing | **0** |

And the migration is **idempotent**: all 302 current catalogue entries come back
unchanged when passed through it a second time, so a record cannot drift on
repeated reads.

### The one retirement

Exactly one option was dropped, and only because it became two:

```
Bus Accessories → "Stop Request - Stop request (wheelchair area)"
```

The wheelchair-area stop request is now recorded curbside or roadside, and a
record already written against the old single option cannot be assigned a side
after the fact. **No live record uses it** — it is retired before anybody logged
one. A record carrying it would still open and still read as logged; it simply
could not be re-picked from the list.

**Four more options were nearly retired with it, and the live board is why they
are still here.** `Doors - Front door`, `Doors - Rear door`,
`Ramp, Lift and Kneeler - Wheelchair ramp` and `Ramp, Lift and Kneeler - Kneeler`
looked redundant next to the specific symptoms now listed under each. Querying
the Shop Cloud showed three of them were the **most used options in the entire
category**, carrying **nine of its ten records**. They are how a fault gets
logged when the component is known and the symptom is not yet. The general
option now sits first in its group with the specific symptoms beneath it.

## Known issue this release does not fix

**A device still on Version 135 shows the old category names.** The rename is
applied on read by the build doing the reading, so an un-updated device reads
`Bus Accessories` records back under whatever wording is stored — and stored
wordings are unchanged, by design. Nothing is lost either way, on either device,
in either direction; the two simply label the same defect differently until both
are updated. **Refresh every device once this is live** so the floor and the
office are reading the same category names.

## What changed

### 1. `Bus Controls` was doing two unrelated jobs

Fifty-two options covering both the driver's switch panel and every physical
accessory on the bus, with doors and the ramp in a separate category of their
own. A mechanic looking for the ramp had to know which of the two it was in.
The split follows how the work is actually assigned: accessories are one kind of
call, controls are another.

**`Operator/Driver Controls` — 40 options in 4 groups**

| Group | Options |
| --- | --- |
| Driver Seat | 5 |
| Gauges and Dash | 5 |
| System Switches | 12 |
| Operating Controls | 18 |

**`Bus Accessories` — 40 options in 5 groups**

| Group | Options |
| --- | --- |
| Doors | 11 |
| Ramp, Lift and Kneeler | 10 |
| Wheelchair Securement | 8 |
| Stop Request | 9 |
| Bike Rack | 2 |

### 2. The stop request is named what the floor calls it

Previously one option. A passenger pulls the cord and nothing sounds — that is a
**Stop Request INOP**, including when the cord itself is broken, and it happens
on one side of the bus at a time. Nine options now:

```
Stop request INOP (curbside)
Stop request INOP (roadside)
Stop request INOP (wheelchair area - curbside)
Stop request INOP (wheelchair area - roadside)
Stop request pull cord / line - broken (curbside)
Stop request pull cord / line - broken (roadside)
Stop request chime / tone
Stop request sign / light
Other stop request defect
```

The wheelchair-area request is sided like the rest, which is the change that
retired the old unsided option above.

### 3. A ramp beyond repair is bodywork, not a ramp fault

When a ramp is judged past repair, body shop technicians fit a new one — it is
their job, not the ADA technician's, and it belongs on their list. Added to
`Bodywork`, the only other category this release touches:

```
Bodywork - Ramp - complete replacement (beyond repair)
```

`Bodywork` goes from 17 options to 18. Nothing else in it changed.

## The one visible behaviour change, measured

**The `Ramp / Kneeler (ADA)` quick filter returns fewer buses, and that is the
point — but it is a change somebody will notice.**

The filter matches on the text of a defect, and that text includes its category.
The old category name `Doors, Ramp and ADA` **contains the word "Ramp"**, so
every defect filed anywhere in it matched the ramp filter — a broken front door
included. `Bus Accessories` does not contain the word, so only genuine ramp and
kneeler faults match now.

Measured over the 35 live records, at `d3c05c3` and again at `dccf431`:

| | Version 135 | Version 136 |
| --- | --- | --- |
| Live records matching `Ramp / Kneeler (ADA)` | **12** | **7** |

The five that drop out are four door defects and one misfiled front-door record.
None of them is a ramp or kneeler fault. The filter is narrower and correct; a
foreman who has been using it as an all-ADA list will see a shorter list and
should be told why.

**This one is worth a decision rather than a surprise.** The list can stay as it
is (recommended — it now answers the question it asks), or the pattern can be
widened, or a separate all-accessories filter can be added alongside it. Nothing
here needs to block the release either way.

## Validation

- **176 regression tests passing**, unchanged in count from Version 135; ESLint
  clean; production build succeeds
- **The live Shop Cloud was queried, not estimated** — 334 records, 35 affected,
  all 35 verified to land on a live, re-pickable option with zero orphans
- **All 79 Version 135 options** in the two affected categories were run through
  the new migration: 78 live, 1 documented retirement, 0 orphans
- **The migration is idempotent** across all 302 current catalogue entries
- **The legacy chain still resolves two generations back** — `Operator Controls`
  and `Doors, Ramp and Lift`, names retired in earlier releases, still reach the
  right home through the new split
- **The flat catalogue and the grouped picker were checked against each other**
  for every category: 0 out of step
- **The quick-filter change was measured at both commits** rather than reasoned
  about — 12 matches before, 7 after

## After it is live

1. **Open any repair → the category list.** Confirm `Bus Controls` and
   `Doors, Ramp and ADA` are gone, and `Operator/Driver Controls` and
   `Bus Accessories` are there in their place.
2. **Open a bus that already had a Bus Controls defect** — a horn or a turn
   signal. It should now read under `Operator/Driver Controls` with its wording
   unchanged, and open, filter and report exactly as before.
3. **Open a bus with a door or ramp defect.** It should read under
   `Bus Accessories`. Front door, rear door, wheelchair ramp and kneeler are all
   still selectable — those four carry most of the ADA history and were
   deliberately kept.
4. **Bus Accessories → Stop Request.** Confirm nine options, with curbside and
   roadside on both the standard and the wheelchair-area request.
5. **Bodywork.** Confirm `Ramp - complete replacement (beyond repair)` is there,
   for a ramp the body shop has to replace outright.
6. **Press the `ADA` quick filter.** Expect a shorter list than before — ramp
   and kneeler faults only, no longer every door defect. This is the intended
   change; see the section above.
7. **Refresh every device** that reads this board, so nobody is looking at the
   old category names beside somebody looking at the new ones.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 136 | Live | <published tip hash> | Bus Controls splits into Operator/Driver Controls (switches, buttons, gauges, dash, driver seat) and Bus Accessories (doors, ramp, kneeler, wheelchair securement, stop request, bike rack), absorbing Doors, Ramp and ADA; the stop request becomes nine options named the way the floor names them, sided curbside and roadside including the wheelchair area; a ramp beyond repair is added to Bodywork as a complete replacement. Read-time rename only — nothing stored is rewritten, and all 35 affected live records were verified against the Shop Cloud to land on a live, re-pickable option |
```

---

# Version 137 — Fleet Campaigns survives a dead bay

**Publish this after Version 136.** It builds on it: `d6f99d8` contains
`dccf431`, so publishing 137 carries 136 with it. Run both sets of checks.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`d6f99d8`** |
| Last code-bearing commit | `d6f99d8` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 136, from `dccf431` |

```
git log --oneline dccf431..d6f99d8
d6f99d8 Pre-cache Fleet Campaigns so it is not blank in a dead bay   <- the release
a85f570 Queue Version 136                                            <- docs only
```

Two files of substance, and neither is application code:

```
git diff --name-only dccf431 d6f99d8
docs/PUBLISH_NEXT.md
public/sw.js
tests/rendered-html.test.mjs
```

No dependency, database, CI or `app/` change at all. The filter returns nothing:

```
git diff --name-only dccf431 d6f99d8 -- supabase package.json package-lock.json .github app   # returns nothing
```

Gate: 176 tests passing, ESLint clean, production build succeeds.

## Migrations

**None.** No database change, no dependency change, no LocalStorage key touched,
nothing stored rewritten. This release changes only which files the service
worker keeps on the phone.

## What changed

### Fleet Campaigns was never pre-cached

`sw.js` pre-cached four of the app's five pages — the map, Down Sheet, Defect
Log and Fixed Repairs. **`/lists` was missing.** It reached the phone only if
somebody happened to open it while online, and the navigation handler cached it
as a side effect. A phone that had never opened Fleet Campaigns got nothing when
it lost signal in a bay, which is the one situation the service worker exists to
prevent. It is now in the list.

### The test that should have caught it agreed with it instead

The old assertion pinned `CORE_PAGES` by matching a literal copy of the same
four paths, so it confirmed the list matched itself and had nothing to say about
the page that was missing. It now reads the real routes off disk and asserts
every served page is pre-cached, so adding a page and forgetting the service
worker fails the suite rather than surfacing on a mechanic's phone.

**Forced, not assumed:** with `/lists` removed from `CORE_PAGES`, the suite goes
to 175 passing / 1 failing, naming the route. Restored, 176 pass.

### Cache name bumped to v4

`activate` deletes only caches whose name no longer matches `CACHE_NAME`, so the
bump is what makes the new pre-cache take effect promptly — and it is also the
only thing that clears the **dead asset files every previous release left on the
phone**. Every build renames every chunk by content hash, so a phone that has
been through several releases is holding chunks nothing will ever request again.

**Cost to be aware of:** the first launch after this update re-downloads the app
shell, and it must be online to do it. That is one download of the pages and
their assets, not fleet data — **no board, defect, down sheet or settings is
stored in this cache and none of it is affected.** If the device is offline when
it tries, the install fails, the previous service worker stays in control, and
the app keeps working exactly as before until it next has signal.

## Validation

- 176 regression tests passing, ESLint clean, production build succeeds
- **The new guard was driven to failure deliberately** — removing `/lists` from
  `CORE_PAGES` fails the suite with the route named; restoring it passes
- **The ancestry was verified, not assumed** — `git merge-base --is-ancestor
  dccf431 d6f99d8` confirms 137 carries 136
- **No `app/` file changed in this range**, confirmed by an empty path filter

## After it is live

1. **Open the app online once** and let it settle. This is the launch that
   re-downloads the shell under the new cache name.
2. **Then put the phone in airplane mode and open Fleet Campaigns.** It should
   come up. Before this release, on a phone that had never visited it, it did
   not.
3. **Check the other four pages offline too** — the map, Down Sheet, Defect Log
   and Fixed Repairs — to confirm the cache rebuilt rather than merely emptied.
4. **Confirm the board is intact** after the re-download. It will be; the board
   is in LocalStorage and this cache never held it. Worth one look the first
   time regardless.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 137 | Live | <published tip hash> | Fleet Campaigns is pre-cached by the service worker, so it opens on a phone that has lost signal instead of coming up blank; the test that pinned the pre-cache list now reads the real routes off disk so a new page cannot be added without it; cache name bumped to v4, which clears the dead hashed chunks left by earlier builds at the cost of one online re-download of the app shell |
```

---

# Version 138 — The A/C category learns to count, and the HVAC panel gets recorded

**Publish this after Version 137.** It stacks on it: `0969840` contains
`d6f99d8`, so publishing 138 carries 137 with it. Version 136 is already live,
published from `dccf431`.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`0969840`** |
| Last code-bearing commit | `0969840` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 137, from `d6f99d8` |

Gate: 179 tests passing (up from 176 at 136), ESLint clean, production build
succeeds. No dependency, database or CI change.

## Migrations

**No database migration, no dependency change, no LocalStorage key touched.**
Two new optional fields on a repair record, and one read-time rename.

| Addition | Shape | Notes |
| --- | --- | --- |
| `diagLight` | `"yellow" \| "red"` | one value, not two flags — the panel cannot show both |
| `alarmCode` | text, exactly two digits | text so `04` does not read back as `4` |

Both are dropped on read unless they are valid, so a hand-edited file or a
newer build cannot put a lamp the panel does not have onto a record. **A record
written by an older build reads back untouched** — absent fields simply stay
absent.

**Read-time rename:** `Refrigerant leak` → `Refrigerant / Freon leak`. Nothing
stored is rewritten. Verified against the live board: **25 A/C records, all 25
landing on a pickable option, and none of them using the renamed wording**, so
this rename touches zero live records today. All 13 A/C wordings a Version 136
device can write still resolve.

## What changed

### 1. Six new A/C options — the fans are counted, not described

| Added |
| --- |
| `Semi cold air` |
| `Condenser fan INOP - 1 fan` |
| `Condenser fans INOP - both fans` |
| `Evaporator fan / motor INOP - 1` |
| `Evaporator fans / motors INOP - both` |
| `Bad connection / wiring` |

One fan down and both fans down are different jobs — the first still cools
badly and limps, the second does not cool at all — and a single "fan INOP"
option would lose that the moment it saved. `Semi cold air` sits between
`No cooling` and nothing at all, which is what a driver actually reports.
`Bad connection / wiring` was previously only reachable as the much vaguer
`Controls / electrical`, which stays for everything else.

A/C and HVAC goes from **13 options to 19**; the catalogue from **302 to 308**
across the same 21 categories.

### 2. The HVAC diag lamp and its alarm number

A new optional block on **A/C repairs only**: two lamps, yellow and red, and a
two-digit alarm number off the panel. Offered on the whole A/C category rather
than a list of specific repairs, since any HVAC fault can put the lamp up.

- **One lamp, never two.** Stored as a single value, because the panel cannot
  show yellow and red at once. Ticking the lit lamp again clears it; switching
  lamps keeps whatever number was already typed, since a panel escalating
  yellow to red on the same alarm is the ordinary case.
- **The number is text, not a number.** `04` and `4` are different alarms and a
  numeric field would lose the leading zero.
- **It leads the supporting details**, so the Down Sheet line reads
  `A/C and HVAC — Semi cold air — RED DIAG LIGHT alarm 32 — warm at the back`
  rather than burying it in a notes field nobody scrolls to.

### 3. Two silent-loss traps, both found by driving the form

Neither showed up in the tests, which passed throughout:

- **A single digit looked entered and did not save.** Typing `ab4x` leaves a
  bare `4` in the field; on save it vanished, because `4` could be `04` or `40`
  and only the panel knows which. The form now says so in an amber hint —
  *"type 04 if that is what the panel shows. A single digit will not save."*
- **An alarm number with no lamp ticked had nothing to belong to.** It was
  stored where no screen displays it. The hint now says so, and the number is
  dropped at the storage boundary rather than kept invisibly.

The lamp is also judged by the **migrated** category, so a record renamed out of
A/C — a horn defect moving to Operator/Driver Controls — drops the lamp rather
than showing an HVAC alarm against a brake job.

## Validation

- 179 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 360, 390, 430 and 820** — the block is not
  clipped at any of them, and it reflows from two rows to one on a tablet
- **Measured, not eyeballed:** an apparent overflow past the parent turned out
  to be the form's own scroll container (`.log-form`, `overflow-y:auto`,
  scrollHeight 1583 vs clientHeight 533). Scrolled into view it is fully on
  screen, uncovered, and clickable — so nothing was "fixed" that was not broken
- **Both traps were reproduced before they were fixed** and re-driven after
- **Round-tripped through storage:** saving RED + `32` writes
  `{diagLight:"red", alarmCode:"32"}` and the feed line renders the lamp
- **The live board was queried, not estimated** — 25 A/C records, 0 orphaned,
  0 using the renamed wording
- No page errors in any browser run

## After it is live

1. **Open any A/C repair.** A new **HVAC DIAG LIGHT (OPTIONAL)** block should
   appear under the issue picker, with YELLOW, RED and an ALARM # box.
2. **Open a non-A/C repair** — a brake job — and confirm the block is absent.
3. **Tick a lamp, type an alarm number, save and reopen.** Both should still be
   there, and the Down Sheet line should read the lamp and number.
4. **Type a single digit** and confirm the amber warning appears saying it will
   not save.
5. **Check the A/C issue list** for the six new options, and that
   `Refrigerant / Freon leak` is there in place of `Refrigerant leak` — an
   existing record logged under the old wording should read as the new one.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 138 | Live | <published tip hash> | A/C and HVAC gains six options — Semi cold air, Bad connection / wiring, and separate one-fan and both-fan entries for the condenser and evaporator, so a partial fan failure stays distinguishable from a total one; Refrigerant leak reads as Refrigerant / Freon leak. A/C repairs can record the HVAC panel's diagnostic lamp as yellow or red with its two-digit alarm number, kept as text so 04 stays 04 and shown at the front of the Down Sheet line; a lamp without a valid two-digit number, and a number without a lamp, are both refused rather than stored where nothing displays them |
```

---

# Version 139 — Tech Services learns the shape of the check-off sheet

**Publish this next, after Version 138.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`a33ffab`** |
| Last code-bearing commit | `a33ffab` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 138, published from `0969840` |

One commit, three application files:

```
git log --oneline 8e3454f..a33ffab
a33ffab Group Tech Services the way the shop's check-off sheets are laid out

git diff --name-only 8e3454f a33ffab -- app
app/facility-defect-clear.ts
app/quick-filters.ts
app/repair-catalog.ts
```

No dependency, database, or CI change. The filter returns nothing:

```
git diff --name-only 8e3454f a33ffab -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 182 tests passing (up from 179 at Version 138), ESLint clean, production
build succeeds.

## Migrations

**No database migration, no dependency change, no LocalStorage key touched.
Nothing on disk is rewritten.** This is a read-time regroup, the same mechanism
as the Bus Controls split in Version 136: a stored record keeps the wording it
was saved with, and `migrateRepairIdentity` moves it to its new home as it is
read. **Nothing is retired.**

### The category change

`Tech Services` was one flat list of ten options. It is now five groups holding
twenty-two:

| Group | Options |
| --- | --- |
| Farebox | 11 — INOP (general), No power, Blank / black screen, Bill transport INOP, Coin mech INOP, Coin off line, Coin bin missing, Unlocked / won't lock, Can't unlock top / coin bypass reset, Loose from floor mounts, Other |
| Ventra | 2 — INOP (general), Other |
| CUBIC Screen | 3 — BUS ER, MV ER, Screen black |
| IBS Screen | 2 — INOP (general), Screen black |
| Signs, Cameras and Other | 4 — Destination Sign, Dash cam, Camera / DVR system, Other Tech Services |

Catalogue totals: **308 options across 21 categories → 320 across 21.**

The shop's farebox check-off sheet checks three things per bus — power, bill
transport, coin mech — and none of them had an option, so every finding landed
on the bare word `Farebox`. Eleven live records sit there today with nothing
more specific, five of them saying "black screen" in free text. Those three
columns are options now, and so is the black screen.

### Verified against the live Shop Cloud, not asserted

Every distinct wording actually present under Tech Services in `bus_defects`
was read from the live project and run through the new migration:

| | |
| --- | --- |
| Live Tech Services records (`deleted_at is null`) | **33** |
| Land on a live, re-pickable option | **32** |
| — of which keep their exact stored wording | 12 (`CUBIC Screen - BUS ER` ×6, `CUBIC Screen - MV ER` ×6) |
| — of which are renamed on read | 20 (`Farebox` ×11, `Farebox won't lock` ×3, `Ventra` ×3, `Destination Sign` ×2, `IBS Screen` ×1) |
| Off-catalog, left exactly as logged | **1** (`Unspecified issue` — already off-catalog before this release) |
| Orphaned | **0** |

**The two CUBIC Screen wordings do not move at all.** They already read
`Group - Item`, so they became their own group with their stored identity
untouched. The twelve live records under them are not renamed even on read.

All ten wordings a Version 138 device can write still resolve. The two-step
legacy chain still resolves: a record logged as `MDT Screen` becomes
`IBS Screen` and then `IBS Screen - INOP (general)`. The migration is
idempotent across all 22 new entries.

### Two wordings became one

`Farebox won't lock` (3 live records) and the check-off sheet's "says unlock,
won't lock" were one fault written two ways. They share `Unlocked / won't lock`.
The opposite fault — can't unlock the top to reset the coin bypass, a live
record on 17524 — has its own option and is not conflated with it.

## Two things found on the way, both fixed here

### The IBS & Ventra quick filter never matched a CUBIC screen

BUS ER and MV ER are the two Ventra devices, but neither the word "IBS" nor
"Ventra" appears in their wording, so the filter named for them missed every
one. Measured over the 33 live Tech Services records:

| | Version 138 | Version 139 |
| --- | --- | --- |
| Live records matching `IBS & Ventra` | **4** | **16** |

The twelve that appear are the CUBIC records. Nothing else changes; a farebox
still does not match it.

### A Facility Map alert that flips twice added its defect twice

`syncFacilityAlertDefects` writes a defect when a tracker flag (check engine,
no horn, farebox, IBS / Ventra…) turns on, and checks first that the bus does
not already carry it. It ran that check by comparing the alert table's wording
against defects it had **just normalized** — and normalizing migrates a wording
to its current home. Once a wording had moved, the comparison could never
match, so the second flip of the same flag added the alert again.

Three of the six alert wordings were already in that state before this release
(the horn, the transmission fault, the kneeler). The Tech Services regroup
would have made it five. The alert is now migrated *before* the comparison,
which fixes all six and means new alerts are written in the wording a record
reads as, rather than one it will be migrated to.

**Forced, not assumed:** with the raw comparison put back, the new test fails on
the duplicate; restored, it passes.

## Known issue this release does not fix

**A device still on Version 138 shows the flat Tech Services list.** Same as
every catalogue change: the grouping is applied on read by the build doing the
reading, and stored wordings do not change. Nothing is lost in either direction.
**Refresh every device once this is live** so a farebox fault reads the same
way on the floor and in the office.

## Validation

- 182 regression tests passing, ESLint clean, production build succeeds
- **The live Shop Cloud was queried, not estimated** — 33 records, 32 landing,
  1 already off-catalog, 0 orphaned
- **The flat list and the grouped picker were checked against each other** for
  every category: 0 out of step
- **The quick-filter change was measured** over the live records: 4 → 16
- **The double-add bug was driven to failure and back** — a flag flipped twice
  with the fix reverted adds two defects; with the fix, one
- **The legacy chain still resolves two renames deep** (`MDT Screen`)

## After it is live

1. **Open any repair → Tech Services.** The issue picker should show five
   groups, Farebox first. Under Farebox, `INOP (general)` leads and the three
   sheet columns — no power, bill transport, coin mech — are all there.
2. **Open a bus with an existing Farebox defect** — there are eleven. It should
   read `Farebox - INOP (general)` with its details unchanged, and open, filter
   and report exactly as before.
3. **Open a bus with a CUBIC Screen defect** — there are twelve. Its wording
   should be **exactly** what it was; these did not move.
4. **Press the `IBS/Ventra` quick filter.** Expect the CUBIC screen buses to
   appear for the first time. Before this release, they never did.
5. **On the Facility Map, flip a bus's Farebox flag on, off, on.** The Defect
   Log should show one farebox defect for it, not two.
6. **Refresh every device** that reads this board.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 139 | Live | <published tip hash> | Tech Services becomes five groups — Farebox, Ventra, CUBIC Screen, IBS Screen, and Signs, Cameras and Other — so the farebox check-off sheet's three columns (power, bill transport, coin mech) and the black screen are real options instead of free text under the bare word Farebox; 10 options become 22, nothing is retired, and the twelve live CUBIC records keep their exact wording. The IBS & Ventra quick filter now matches CUBIC screens (4 → 16 live matches), and a Facility Map alert flag flipped twice no longer adds its defect twice |
```

---

# Version 140 — The check-off sheets get a camera

**Publish this after Version 139.** It stacks on it: `f0c7939` contains `a33ffab`,
so publishing 140 carries 139 with it. Version 139 must be live or go live with
this — the sweep files against the Tech Services groups 139 introduces.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`f0c7939`** |
| Last code-bearing commit | `f0c7939` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 139, from `a33ffab` |

```
git log --oneline 8bd48c7..f0c7939
f0c7939 Scan the farebox and Ventra check-off sheets from a photo

git diff --name-only 8bd48c7 f0c7939 -- app
app/api/sweep-scan/route.ts            <- new: the scan route
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/defect-log/sweep-scan-import.ts    <- new: what a mark means, in code
app/defect-log/sweep-scanner.tsx       <- new: the modal
app/down-sheet/down-sheet-scanner.tsx  <- one import; behaviour unchanged
app/scan-photo.ts                      <- new: the shared photo prep
```

No dependency, database, or CI change:

```
git diff --name-only 8bd48c7 f0c7939 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 186 tests passing (up from 182 at Version 139), ESLint clean, production
build succeeds.

## Migrations and configuration

**No database migration, no dependency change, no LocalStorage key added.** What
the sweep files are ordinary defect records, `source: "defect-log"`, exactly
as LOG DEFECT writes them.

**No new secret is required.** The new route `/api/sweep-scan` uses the same
`OPENROUTER_API_KEY` the Down Sheet scan already runs on. It reads an optional
`SWEEP_SCAN_MODEL`, falling back to `DOWN_SHEET_SCAN_MODEL`, then to the same
default model. Nothing has to be set for it to work where the Down Sheet scan
already works.

**One thing to confirm once live**, because it is the only way this release can
fail silently: the route deployed and can see the key. An empty POST proves both:

```
curl -s -X POST https://<live host>/api/sweep-scan
# expected  {"error":"Choose at least one photo."}     -> route is live, key present
# if you see {"error":"Photo processing is not configured yet."} -> route is live, key MISSING
# if you see HTML or a 404                                       -> route did not deploy
```

## What changed

### 1. SCAN SWEEP, a new button on the Defect Log

Next to LOG DEFECT, CLEAN UP and MERGE DUPES. Opens the same kind of modal the
Down Sheet scan uses — take a photo or upload one, up to six pages, READ SHEETS,
review, approve — **but approving files defects onto buses.** It never touches
the Down Sheet, never closes a record, and never files a row that was not
ticked. Both sheet types can go in together; the model tells them apart by the
printed title.

### 2. What a mark means is decided in code, not by the model

The route describes the two sheets to the model — their columns and what each
kind of mark is — and the client decides again from what comes back. Anything
that is not one of four words reads as blank, and **blank means nobody looked;
it is never read as working.** That rule is the difference between this sheet
and a Down Sheet, and it is stated to the model and enforced in code.

| Mark column | Files as |
| --- | --- |
| DT | `CUBIC Screen - BUS ER` |
| MV | `CUBIC Screen - MV ER` |
| Farebox power | `Farebox - No power` |
| Bills Trans | `Farebox - Bill transport INOP` |
| Coin Mech | `Farebox - Coin mech INOP` |

A **written note** on the sheet names faults the columns cannot — coin off line,
blank screen, coin bin missing, unlocked / won't lock, can't unlock top, loose
from mounts — and **a note beats the column it explains**, so "coin off line"
files Coin off line and not also a generic coin fault for the same cell. "Can't
unlock" is tested before "unlock", because they are opposite faults. Every
finding's issue can be re-pointed from a dropdown of Tech Services options
before it is filed.

### 3. Three kinds of row are held back

- **Already on the board.** The bus carries an open record with that wording.
  Offered, labelled, and unticked, so the sweep confirms what is known without
  doubling it.
- **Not in fleet / duplicate fleet number.** Same rules as the Down Sheet scan;
  cannot be ticked.
- **Unclear.** A mark the model could not read never becomes a finding.

### 4. Sheet says OK, board says open

Buses ticked working on a device the board still holds an open record for are
listed under the findings — with the open wording, read through the migration —
for a person to decide. **Nothing is closed from a tick mark.** A destination
sign or a brake job is not listed, because the sweep did not check them.

### 5. Filing is the ordinary path

Each approved finding goes through the same single-record save as LOG DEFECT, so
the **48-hour duplicate guard** applies to every one. The fleet is threaded
through one save at a time and written **once**; a refused write claims nothing.
Each record carries the note, which page it came from, and who checked —
`coin off line — Sweep sheet p2 · checked by BB` — with the initials in
`reportedBy`. **UNDO LAST** reverses the whole filing as one change.

### 6. Shared photo prep

`scanReadyPhoto` moved from the Down Sheet scanner into `app/scan-photo.ts`
so both scanners share one 700 KB cap. The Down Sheet scanner's behaviour,
including its upload filename, is unchanged.

## Validation

- 186 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 390 wide with the route mocked** to rows shaped
  like the 8-29 sheets: button enabled with a fleet and disabled without one;
  modal not clipped; READ disabled until a photo is added; 5 buses read →
  7 findings → 5 filed; ALREADY ON BOARD arrives unticked; NOT IN FLEET cannot
  be ticked; a finding re-pointed in the dropdown files as re-pointed; storage
  carries issue, note, provenance and `reportedBy`; UNDO LAST reads
  *Undo Filed 5 sweep findings*
- **The 503 path was forced**: the modal shows *Photo processing is not
  configured yet.*, stays on the photo step, and storage is byte-for-byte
  unchanged
- **The OK-vs-board panel was driven separately**: a bus with an open Farebox
  and an open CUBIC record, ticked OK on both sheets, is listed with both
  wordings read through the migration; its open brake job and another bus's
  destination sign are not
- Unit tests cover the mark normalisation, the note-beats-column rule, the
  opposite lock faults, dedupe within a bus, the fleet-match states, and the
  provenance on the record
- No page errors in any browser run

## After it is live

1. **Run the curl above** against the live host. Expect *Choose at least one
   photo.*
2. **Defect Log → 📷 SCAN SWEEP.** Confirm the modal opens and READ SHEETS is
   disabled until a photo is added.
3. **Photograph both 8-29 sheets** — they are the first real test. Expect around
   a dozen findings, with the five DT errors landing as `CUBIC Screen - BUS ER`,
   the two MV errors as `CUBIC Screen - MV ER`, and 17531's note producing both
   Coin off line and Blank / black screen.
4. **Look at the badges before approving.** 17523 should arrive as ALREADY ON
   BOARD and unticked. Anything the model was unsure of should say so under the
   details.
5. **Approve, then open one of the buses.** The record should read the note,
   the page, and the checker's initials.
6. **Press UNDO LAST once** to confirm the whole filing comes back off, then
   file it again.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 140 | Live | <published tip hash> | SCAN SWEEP on the Defect Log photographs the farebox and Ventra check-off sheets and files what they found as Tech Services defects: the five mark columns map to catalog options, a written note names the faults the columns cannot and beats the column it explains, blank is read as not checked and never as working, findings already on the board arrive unticked, and buses ticked OK that the board still holds open are listed for a person rather than closed. Filing uses the same single-record save as LOG DEFECT with the 48-hour duplicate guard and one write, carries page and checker initials on each record, and is reversed by UNDO LAST. Uses the existing OPENROUTER_API_KEY; no new secret |
```

---

# Version 142 — Every line on a card starts at the same tab stop

**Publish this next, after Version 141.** Curtis asked for this to be built so
it can be taken back if he does not like the new layout; the way back is at the
end of this section.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`1ff1224`** |
| Last code-bearing commit | `1ff1224` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 141, published from `e99e06a` |

```
git log --oneline e99e06a..1ff1224
1ff1224 Give every card line a fixed tab stop, and bring the reading text up a step   <- one commit on top of the live version

git diff --name-only e99e06a 1ff1224 -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet.css
app/fixed-repairs/fixed-repairs.css
```

No dependency, database, or CI change:

```
git diff --name-only e99e06a 1ff1224 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 187 tests passing (up from 186 at Version 140), ESLint clean, production
build succeeds.

## Migrations

**None.** No storage change of any kind. Two files of markup and CSS on the
Defect Log, and CSS only on Fixed Repairs and the Down Sheet. Nothing a record
carries is different.

## What changed, with the numbers

### 1. The card's bottom row has fixed tab stops

The same word landed in a different place on every card, because the optional
purple badges sat in the same flowing row as the state and status. Measured at
390 wide, four neighbouring cards:

| | Version 140 | Version 141 |
| --- | --- | --- |
| Where OPEN begins (card with DS and ×3) | x131 | **x157** |
| Where OPEN begins (card with ×4 alone) | x105 | **x157** |
| Where OPEN begins (card with no badges) | x73 | **x157** |
| Where LATEST begins | x73 or x209, wrapping on 2 of 4 | **x73, always on its own row** |
| Where VIEW sits | wrapped, x73 or x153 | **flush right, always** |

Same result at 360 and 430. The row is a grid with named slots: badges, state,
status on the first row; LATEST at the left and VIEW at the right of the second.
An empty slot stays empty; nothing slides left into it. DS and ×N have their own
two fixed sub-slots, so ×N is at the same x whether or not DS is beside it.

### 2. The title starts at the same place on every card

A single-defect title used to lead with the category emoji; MULTIPLE DEFECTS
did not, so the words began at different points. The emoji is gone from the
title — the round icon on the left already carries it — and both titles start
at x146 at 390 wide.

### 3. DS and ×N are a matched pair

| | Version 140 | Version 141 |
| --- | --- | --- |
| DS | 22 × 17, 7px | **34 × 24, 11px** |
| ×N | 28 × 21, 10px | **38 × 24, 11px** |

Both on the same colour token, so a Down Sheet badge colour set on the Facility
Map recolours both here. Both carry the thin border Codex gave DS in Version 141 (`e99e06a`); this release keeps that border and brings the size up a further step, as asked.

### 4. Reading text comes up one step, on all three feeds

| Surface | Before | After |
| --- | --- | --- |
| Defect Log card: status / LATEST / VIEW | 8 / 7 / 7 px | **10 / 9 / 9 px** |
| Defect Log card: BUS eyebrow, location, "+N more" | 7 / 7 / 8 px | **8 / 8 / 9 px** |
| Defect Log expanded rows: work-state badges, action labels, SAVED | 7 / 6.5 / 6 px | **9 / 8 / 8 px** |
| Fixed Repairs: BUS eyebrow, category, section titles, Logged line | 6 / 7 / 7 / 8 px | **8 / 9 / 9 / 9 px** |
| Down Sheet: the four small cell captions | 7 px | **8 px** |

Labels inside editors and settings are left alone; those are label styling, not
reading text. The Defect Log's own font-size setting still scales everything
above the new base. In an expanded row the timestamp now starts a line of its
own rather than trailing the state pill, so it no longer moves by a pill's width
between OPEN and FIXED.

## Six defects found and fixed before this shipped

The two releases were smoke-tested and the diff reviewed from a clean context
before queueing. Six real faults came out of it; all six are fixed in
`0153c09`, and each was driven in a browser before and after.

| Severity | Fault | Now |
| --- | --- | --- |
| **High** | A refused fleet write on Fixed Repairs was reported as a save. `persistFleet` discarded the writer's boolean; `changeFleet` set the undo snapshot and closed the editor regardless. With LOG A REPAIR creating records that exist nowhere else, a phone at its storage limit lost the only copy silently and then offered to undo it. | The write result is checked, the editor stays open with what was typed, and this page now has the save banner the other three already had. |
| **High** | Changing the BUS dropdown wiped the whole form — the editor was keyed on the bus id, so picking a bus remounted it and reset the draft. | The key is gone; the select was already controlled by its prop. |
| Medium | The DAILY STATS bar hardcoded labels a shop can rename in settings, and the tiles that honour them are closed by default. | The bar uses the saved labels, and DOWNING is back in the summary. |
| Low | A repair logged on Fixed Repairs was stamped `source: "defect-log"` and shown as FIXED FROM THE DEFECT LOG, which it never touched — and inherited that source's rule making it unremovable on the Facility Map. | It is `"fixed-log"`, labelled LOGGED AS A COMPLETED REPAIR. |
| **High** | `normalizeDefects` passed a non-string `details` straight through, and every consumer calls `.trim()` on it — so one malformed record threw inside the render and the whole page showed a runtime error instead of the board. Reachable from a JSON backup import, which validates only `id`, `n` and `l`. | `details` is coerced at the read boundary every consumer already passes through. |
| Low | A saved default view of Open or Down Sheet left a filtered board with no button lit and no way back without opening settings. | Each button appears while its own filter is active, so it explains the view and clears it. |

## The way back

**If Curtis does not like the new layout**, either is clean:

- **Republish Version 141 from `e99e06a`.** That is the live version as it stands
  today, with Codex's enlarged DS badge and none of this.
- Or revert on `main` and publish the revert: `git revert 1ff1224` produces one new
  commit that removes exactly this release and nothing else. It is a single
  code commit for that reason.

## Validation

- 187 regression tests passing, ESLint clean, production build succeeds
- **Measured, not read**: bounding boxes of every card element at 360, 390, 430
  and 1180, before and after, on four cards chosen to cover every badge
  combination (DS + ×N, ×N alone, none, ×N with the longest status)
- **Nothing clips**: the status text stays on one line at 360; the meta row stays
  inside the card; the FOCUS button does not overlap it
- **The other pages were audited the same way**: Fixed Repairs and the Down
  Sheet already aligned by construction; the only drift found was a 1px
  timestamp shift in expanded Defect Log rows, now fixed. After the size
  changes, nothing on any of the three pages overflows its box, and no reading
  text remains below 8px
- Version 141's `e99e06a` was brought underneath this work by fast-forward, not
  merged over; its border and colour-token wiring are kept

## After it is live

1. **Defect Log, on a phone.** Look down four or five cards. OPEN, the status,
   LATEST and VIEW should sit in the same place on every one, whether or not
   the card has DS or a ×N badge.
2. **A card with both badges.** DS and ×N should be the same height and type
   size, side by side.
3. **Change the Down Sheet badge colour** in Facility Map settings and return.
   Both badges should take the new colour.
4. **Expand a bus** and look at two rows with different states. The LOGGED and
   UPDATED lines should start at the same x on both.
5. **Fixed Repairs and the Down Sheet.** The small grey text should be readable
   without leaning in; nothing should wrap where it did not before.
6. **Set the Defect Log font size to Large** in its settings and confirm the
   card text scales up, not down.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 142 | Live | <published tip hash> | Every line on a Defect Log card sits at a fixed tab stop regardless of which badges the bus carries — OPEN, status, LATEST and VIEW at the same place on every card, the title without the duplicated category emoji — with DS and ×N as a matched 24px pair on one colour token (one step above the Version 141 DS badge, keeping its border); the small grey reading text comes up a step on the Defect Log, Fixed Repairs and Down Sheet feeds while editor and settings labels stay as they were. One code commit, reversible with a single revert |
```

---

# Version 143 — The bus card stops wearing one defect's badge

**Publish this next, after Version 142.** A follow-on to 142's card polish,
kept as its own commit so either can be taken back without the other.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`f94608b`** |
| Last code-bearing commit | `f94608b` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 142, published from `1ff1224` |

Five commits since the live version; only the top one is application code. The
other four are the 142 handoff being written and corrected, and Codex's release
record:

```
git log --oneline 1ff1224..f94608b
f94608b Take the category glyph off the collapsed bus card      <- this release
ebd4727 Record Sites Versions 141 and 142 releases           <- docs only (Codex)
8fdd0e2 Renumber the queued polish release to Version 142    <- docs only
a9c6305 Correct the 141 handoff's commit range               <- docs only
ded95b4 Queue Version 141                                    <- docs only

git diff --name-only ebd4727 f94608b -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
```

No dependency, database, or CI change:

```
git diff --name-only ebd4727 f94608b -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 188 tests passing (up from 187 at Version 142), ESLint clean, production
build succeeds.

## Migrations

**None.** Markup and CSS on one page. Nothing a record carries is different.

## What changed

### The collapsed bus card carries no category glyph

The round icon at the left of a collapsed card showed the category of whichever
defect happened to be first. On a MULTIPLE DEFECTS card that was one category's
glyph standing in for a bus with three problems in three categories, and beside
the emoji on every expanded row it read as one long run of defects.

| Where | Version 142 | Version 143 |
| --- | --- | --- |
| Collapsed bus card | round category icon at left; title without emoji | **no glyph anywhere** |
| Expanded defect rows | emoji on each row | emoji on each row — unchanged |
| Fixed Repairs cards | emoji on each card | unchanged; each card is one defect |

The icon's column is gone from the header grid at every width, so the bus
number and everything after it move left by the same amount on every card. The
tab stops from Version 142 hold, measured at 360, 390, 430 and 1180 on the same
four test cards:

| At 390 wide | Every card |
| --- | --- |
| Bus number begins | x34 |
| Title begins | x107 |
| OPEN begins | x118 |
| LATEST begins | x34 — under the bus number, its own row |
| VIEW | flush right |

Nothing clips; the status text stays on one line at 360; the FOCUS button does
not reach the meta row.

## The way back

`git revert f94608b` restores the icon and its column and nothing else. Or
republish Version 142 from `1ff1224`.

## Validation

- 188 regression tests passing, ESLint clean, production build succeeds
- **Measured, not read**, at four widths on four cards covering every badge
  combination; the expanded rows were opened in the same run and each still
  leads with its own emoji
- A test now pins all three: no icon on the collapsed card, plain-text title,
  and the emoji kept on each expanded row

## After it is live

1. **Defect Log, on a phone.** Collapsed cards show the bus number, the title
   and the summary, with no picture at the left.
2. **Expand a bus with more than one defect.** Each row still leads with its
   category emoji.
3. **Look down four or five cards.** The bus numbers, titles and OPEN pills
   should still line up as they did in 142, just further left.
4. **Fixed Repairs.** Unchanged; the card head still shows the category emoji.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 143 | Live | <published tip hash> | The collapsed Defect Log bus card no longer shows a category glyph — the round icon showed only the first defect's category, one category standing in for three on a multi-defect bus — while each expanded defect row and each Fixed Repairs card keeps its own emoji; the icon column is removed from the header grid so every card shifts equally and the 142 tab stops hold |
```

---

# Version 144 — The choices you have to read, and the word you look for

**Publish this next, after Version 143.** Stage one of a two-stage cleanup of
the Defect Log, prompted by watching a mechanic use the app for the first time.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`9f1f73f`** |
| Last code-bearing commit | `9f1f73f` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 143, published from `f94608b` |

```
git log --oneline 3082954..9f1f73f
9f1f73f Make the four save-screen choices readable, and name the search SEARCH

git diff --name-only 3082954 9f1f73f -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet.css
```

No dependency, database, or CI change:

```
git diff --name-only 3082954 9f1f73f -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 188 tests passing, ESLint clean, production build succeeds.

## Migrations

**None.** Copy and CSS. Nothing a record carries is different, and no control
changed what it does.

## What changed

### 1. The four choices under the save buttons

They carried their label at 7–8px and their explanation at 7px — smaller than
anything else a mechanic has to act on — and the explanations had grown into
paragraphs that have to be read past to make a choice.

| | Version 143 | Version 144 |
| --- | --- | --- |
| Label | 7–8 px | **11 px, 12 on a phone** |
| Explanation | 7 px | **10 px, 11 on a phone** |

The copy is cut to what is needed to choose:

| Choice | Now reads |
| --- | --- |
| RECOMMEND FOR DOWN SHEET | Put it forward for the sheet. Not added yet. |
| DOWN SHEET | Add it to the sheet now. |
| DEFERRED | Hold the bus back from service. |
| DEFECT / CONDITION NOT DUPLICATED | Could not reproduce the reported condition. |

DEFERRED has four conditional messages depending on the record's state. All
four are cut the same way and all four still say which state the record is in
and where it came from — including the one that explains why the box is
disabled while the repair is on the Down Sheet. WAS DEFERRED keeps the return
time and drops the rest.

### 2. SEARCH

The Defect Log's search box was labelled **FIND** in 7px grey. That is not a
word somebody scans a page for, and it was the smallest text on the row. It now
reads **SEARCH**, 11px, weight 900, in the page's ink.

The Down Sheet already said SEARCH but in the same 7px grey caption style; it
is brought to the same size and weight, so the two pages match. **ORDER** beside
it stays a caption on purpose — one of the two is the thing a first-time user
is looking for, and making both loud would be no help.

**The Facility Map's LOCATE is deliberately unchanged.** It jumps to a bus on
the map rather than searching a list, so calling it SEARCH would name two
different actions the same thing.

Fixed Repairs and Fleet Campaigns have no text search box, so there was nothing
to rename there.

## Validation

- 188 regression tests passing, ESLint clean, production build succeeds
- **Measured at 390 wide in a real browser**: every card label 12px, every copy
  line 11px, no card taller than 54px, nothing clipped, nothing overflowing its
  box, no page errors
- Both search labels read back at 12px / weight 900 in the page ink; ORDER
  beside the Down Sheet's stays at 8px as intended
- One test pinned the old DEFERRED sentence and was updated to the new wording;
  what it checks — that the box is disabled on a Down Sheet repair and says why
  — is unchanged

## After it is live

1. **Open any repair and scroll to the four choices.** Label and explanation
   should be readable at arm's length without leaning in.
2. **Open a repair that is on the Down Sheet.** DEFERRED should still be
   disabled and still explain why, in one line.
3. **Open a repair that was deferred and returned to service.** The WAS
   DEFERRED note should show the return time and say it is still open.
4. **Defect Log and Down Sheet.** Both search boxes should be labelled SEARCH
   in black, clearly larger than before.
5. **Facility Map.** LOCATE is unchanged; that is intended.

## Still to come — stage two

Not in this release, queued next: collapse the five summary tiles into a
DAILY STATS bar closed by default, drop the OPEN and DOWN SHEET filter
buttons while keeping the OPEN key working for anybody whose saved default
view uses it, let a filter be pressed again to turn it off, and move
+ LOG DEFECT up so the page opens on what it is for.

## The way back

`git revert 9f1f73f` — one commit, copy and CSS only.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 144 | Live | <published tip hash> | The four choices under the save buttons — recommend, down sheet, deferred, not duplicated — are readable on a phone at 11-12px with their explanations cut to one short line each, and the Defect Log's 7px grey FIND label becomes a black 11px SEARCH matching the Down Sheet's, which is brought to the same size; the Facility Map's LOCATE is left as it is because it jumps to a bus rather than searching a list |
```

---

# Version 145 — The page opens on its job, and a repair can be logged without a defect

**Publish this after Version 144.** It stacks on it: `3890055` contains
`9f1f73f`, so publishing 145 carries 144. Stage two of a cleanup that came out
of watching a mechanic use the app for the first time.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`5aab35f`** |
| Last code-bearing commit | `5aab35f` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 144, from `9f1f73f` |

```
git log --oneline 9f1f73f..5aab35f
5aab35f Never let one malformed record take a whole page down   <- this release
a5fff18 Rewrite the 145 log block from actual git output   <- docs only
6321f7d Repoint the 145 handoff at the fix commit   <- docs only
0153c09 Fix five defects a cold review of the queued releases found   <- this release
8741bd2 Correct three facts in the Version 145 handoff   <- docs only
eb2d508 Repoint the 145 handoff at the SETTINGS commit   <- docs only
198083b Give SETTINGS its name, and keep it with the controls it belongs to   <- this release
19991fe Queue Version 145 behind 144   <- docs only
3890055 Open the Defect Log on its job, and let a repair be logged without a defect   <- this release
2bcf1b0 Set the handoff status to Version 144 pending   <- docs only
c7b86f6 Queue Version 144   <- docs only
```

No dependency, database, or CI change:

```
git diff --name-only 2bcf1b0 5aab35f -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 192 tests passing (up from 188 at Version 144), ESLint clean, production
build succeeds.

## Migrations

**No storage rewrite.** One new LocalStorage key, `pace-defect-log-stats-open-v1`,
holding `"1"` or `"0"`. **Absent means closed**, so a device that has never
opened the stats writes nothing and still behaves correctly.

**No filter behaviour was removed.** Two buttons were, and that distinction
matters — see below.

## What changed on the Defect Log

### 1. DAILY STATS, closed by default

Five stat tiles were the first thing on the page, above the filters and above
the button that logs a defect. They are now behind one bar carrying the three
numbers worth a glance — *3 active · 2 buses · 1 fixed today* — and the open or
closed choice is remembered per device, like the mystery board's.

### 2. + LOG DEFECT is the first control

It sat in the feed header, below the tiles, the filters and the mystery board.
It is now the first thing under the page header, full width on a phone, and
**no longer repeated** in the feed header — two buttons doing one job was part
of what made the page feel busy. Measured at 390 wide: visible without
scrolling, and present exactly once.

### 3. Two filter buttons removed, no filter behaviour removed

| Button | Why it went |
| --- | --- |
| OPEN | Differed from ALL only by hiding in-progress and today's fixes. A real distinction, but a fine one that reads as noise to somebody new. |
| DOWN SHEET | Has its own page, and the DS badge on each card already says which buses are on it. |

**Both keys still filter, and both are still choosable as a default view in
settings.** Anybody whose saved default is OPEN or DOWN SHEET keeps exactly the
view they had; only the button is gone. Verified by setting a saved default of
`downsheet` and reloading — the filter still applied.

### 4. SETTINGS says what it is, and stays put

The gear stays in the controls row beside QUICK FILTERS and UNDO LAST —
**deliberately outside the collapsible stats**, because it is not a stat and
must not vanish when they close. It was a square holding a bare glyph between
two buttons that say what they do, so it read as decoration; it now carries its
name and is shaped like its neighbours.

All three controls in the row were brought to one height at the same time:
settings and undo were 42px against quick filters' 44.

### 5. Pressing the active filter clears it

It used to stay stuck on, with no way back but pressing ALL. Pressing the lit
one now returns to ALL. The quick-filter menu already behaved this way; only
this row did not.

## What changed on Fixed Repairs

### + LOG A REPAIR

Armon went to Fixed Repairs to add a fix and found only **ADD FIX DETAILS**,
which edits a record that already exists. A repair done without a defect ever
being logged — which is how it happens on the floor more often than not — had
nowhere to go.

The button opens **the same editor every other record uses**, so every field is
already there: category, issue, description, fix, diagnosis, finding, parts,
hours, who and when. The only thing a blank record lacks is the bus, so the
editor asks for that at the top and nothing else about the form differs. It is
disabled when the device has no buses, because there would be nothing to attach
the repair to.

**One real bug was fixed to make this work.** `saveCompletion` mapped over the
bus's existing defects. A record that is not on the bus yet matches nothing, so
mapping alone would have **written no record and reported success**. It now
appends when the defect is absent, and the change lands on UNDO like every other
change on that page.

## Validation

- 192 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 390 wide.** Defect Log: stats closed on first
  load, opened, remembered across a reload, closed again; LOG DEFECT visible
  without scrolling and present exactly once; each filter pressed on and off
  with the card count moving 3 → 1 → 3; a saved default view of a removed key
  still filtering after a reload
- **A repair logged end to end**: LOG A REPAIR → bus 15514 → Brakes → ABS
  warning → fix text → initials → save. Storage went from 0 defects on that bus
  to 1, the record reads `state: completed` with its fix, initials and
  completion time, the editor closed, the record appeared in the feed, and UNDO
  became available
- No page errors in any run

## After it is live

1. **Open the Defect Log on a phone.** The first things should be DAILY STATS
   closed, then + LOG DEFECT, then three filters.
2. **Tap DAILY STATS.** The five tiles appear; leave and come back and it
   should still be open. Close it and it should stay closed.
3. **Tap a filter, then tap it again.** It should clear back to ALL.
4. **Find SETTINGS.** It reads ⚙ SETTINGS beside QUICK FILTERS, the same height
   as it, and it is still there whether DAILY STATS is open or closed.
5. **If anybody had a saved default view of Open or Down Sheet** (Settings →
   Default View), it still works. The button is gone; the view is not.
6. **Fixed Repairs → + LOG A REPAIR.** Pick a bus, fill in the repair, save. It
   should appear immediately as a completed record, with UNDO available.

## The way back

`git revert 198083b` takes back the SETTINGS change alone and applies cleanly.

To take back the whole release, revert them newest first — `git revert 198083b`
then `git revert 3890055`. Reverting `3890055` on its own conflicts, because
`198083b` edits the same lines after it. Or publish Version 144 from `9f1f73f`.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 145 | Live | <published tip hash> | The Defect Log opens on + LOG DEFECT instead of a scoreboard: the five stat tiles collapse into a DAILY STATS bar closed by default and remembered per device, the log button moves to the top and is no longer duplicated, and the OPEN and DOWN SHEET filter buttons are removed while both keys keep filtering so saved default views still work; pressing the active filter now clears it. Fixed Repairs gains + LOG A REPAIR for a repair done without a defect ever being logged, opening the existing editor with a bus picker, and the save path now appends a new record instead of silently writing nothing |
```

---

# Version 146 — A page a screen reader can name, a sheet that opens on its job, one repair kept as one record that says why the bus is down, and the air system named the way the shop names it

**Publish this next, after Version 145.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`1d5454b`** |
| Last code-bearing commit | `1d5454b` — the release source is this commit |
| Branch | `main` on the private `origin` remote — **pushed**, `origin/main` carries this commit |
| Previous | Version 145, published from `5aab35f` |

Eight commits sit in this range and **four of them touch application code**:

```
git log --oneline 5aab35f..1d5454b
1d5454b Say which defect has the bus on the down sheet                       <- app code
834d76a Queue Version 146 from 21a0d06, and correct what the handoff claimed <- docs only
21a0d06 Name the air system what the shop calls it, and the rear valves for what they do   <- app code
3c1f800 Write to the repair a bus already has, instead of logging it twice   <- app code
eeab372 Queue Version 146                                                    <- docs only
acf86c2 Name the Facility Map for a screen reader, and clear out the Down Sheet header   <- app code
84164ff Record Sites Versions 144 and 145 releases                           <- docs only
651c61f Record the sixth fix in the 145 handoff                              <- docs only

git diff --name-only 5aab35f 1d5454b -- app
app/defect-identity.ts
app/defect-log/defect-log-sync.ts
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet-sync.ts
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/down-sheet/repair-time-estimates.ts
app/duplicate-defects.ts
app/globals.css
app/page.tsx
app/repair-catalog.ts
```

No dependency, database, or CI change:

```
git diff --name-only 5aab35f 1d5454b -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 195 tests passing, ESLint clean, production build succeeds.

## Migrations

**No storage rewrite.** One new LocalStorage key,
`pace-down-sheet-stats-open-v1`, holding `"1"` or `"0"`; absent means closed,
the same shape as the Defect Log's.

## What changed

### 1. The Facility Map has a heading

Its title was styled to look like one without being tagged as one, so it was
the only page of five a screen reader announced unnamed, and the only one where
jumping to the main heading did nothing. It is an `<h1>` now.

**Nothing changed visually, and that was the work.** The bare `header` rule in
`globals.css` sets a fixed 38px height and its own font size, and an `h1`
arrives with a 2em default and block margins that would have burst that box. It
inherits both and carries no margin — measured at 11px in a 40px banner with no
overflow.

### 2. The Down Sheet opens on the button that adds a bus

| | Version 145 | Version 146 |
| --- | --- | --- |
| First thing on the page | eight stat tiles | **SHEET STATS bar**, closed |
| + ADD DOWN BUS | bottom-right of six buttons, under a red CLEAR DOWNSHEET | **first, full width** |
| CLEAR DOWNSHEET / UNDO IMPORT / UNDO CLEAR | always on screen, the loudest things on it | **behind MORE** |
| Pressing the active shift filter | stayed stuck on | **clears back to ALL** |

The bar carries the four numbers worth a glance — active, pending, estimated
labour and capacity — and remembers open or closed per device. The two undo
buttons still appear only when there is something to undo, so MORE is usually a
single item. COMPLETED TODAY is still a button inside the panel and still
filters.

### 3. A note on the MORE disclosure — nothing to review in the diff

**This is not a shipped fix; it never reached a commit.** While building the
disclosure above, a bare `display:grid` on its contents overrode the browser's
own rule that hides a closed `<details>`, leaving CLEAR DOWNSHEET fully visible
while the panel reported itself closed. It was caught and scoped to `[open]`
before `acf86c2` was written, so every committed state of `down-sheet.css`
already carries `.down-more[open]>div` and `.down-more:not([open])>div`. Recorded
only so the `[open]` scoping is not mistaken for an accident and simplified
away later.

### 4. A repair the bus already has is written to, not logged a second time

**Curtis asked the right question and the answer was yes, it duplicated.** A bus
logged for a check engine light, then put on the Down Sheet by hand for that
same fault, ended up carrying it twice — once from the log, once from the sheet,
each under a different id, each looking to the app like a separate problem.
MERGE DUPES caught it afterwards, which is what it is for, but it should not
have had to.

The rule already existed and two of the four doors skipped it:

| How a repair reaches the sheet | Before | Now |
| --- | --- | --- |
| Defect Log → tick DOWN SHEET | writes to the logged record | same, plus the widening below |
| SCAN SHEET photo import | asks first, adopts the record | same, plus the widening below |
| **+ ADD DOWN BUS, typed by hand** | **minted a second record** | **writes to the one that is there** |
| **Pulled on by the app when a bus is marked down** | **minted a second record** | **writes to the one that is there** |

The question is now asked at both doors that write repairs — `importScan` in
`app/down-sheet/page.tsx` and `defectTargets` in `down-sheet-sync.ts` — against
**one shared rule** in `app/defect-identity.ts`, so all four behave the same way.
**Only an exact repeat is adopted, and only one still unresolved.** A genuinely
different fault on the same bus is still its own record, and a repair finished
last month is not reopened by new work that reads like it. A card that already
wrote its own record keeps it, so editing a card updates what it wrote rather
than wandering onto a neighbouring fault.

Two spellings count as the same record. A card the app builds from a defect
carries that defect's **supporting text** — the diagnostic lamp and its alarm
number, then the reported symptoms, then the note — rather than the bare details
field, because on a sheet that is the line that decides what the bus needs.
Without matching both, a bus the app pulls onto the sheet comes back carrying
its own defects a second time. An adopted record then keeps its own details:
writing the spelled-out card back would flatten the lamp and the symptoms into
free text and then repeat them, leaving a record reading `Misfire — Misfire — …`.

The identity rule moves to a new `app/defect-identity.ts` so the sheet and the
duplicate cleanup share one copy instead of importing each other. Two copies
would drift and the symptom is silent — duplicates quietly returning on a board
nobody is auditing. **Merging keeps the stricter rule**, matching only on what
the record itself says, because merging deletes a record and adoption only
updates one.

#### What else this widening touches — read before publishing

Adoption is now looser than it was, and two paths this section first described
as untouched do change. Neither is a regression, but neither is nothing:

- **MERGE DUPES is genuinely unchanged.** `defectFingerprint`, the placeholder
  guard and `mergeDuplicateDefects` moved between files without a change to what
  they do — verified by diffing the function across `acf86c2..21a0d06`.
- **The scan matcher matches more than it did.** `matchingUnresolvedDefectId`
  compared one fingerprint before; it now accepts the supporting spelling too.
  So a scanned row whose reason column carries the app's own spelled-out line —
  which is exactly what the Down Sheet PRINT puts on the paper — now adopts the
  existing record where it previously minted a new one. That is the intended
  direction for print-then-rescan, but it is a change to the scan path.
- **A DOWN SHEET tick entry with more than one card changes.** A single-card
  tick is identical. Add a second card that repeats another record already on
  the bus and it now writes to that record instead of minting a third: measured
  three records before, two after.

### 5. The air system is named what the shop names it

**Air System becomes Pneumatic System.** Under it, two options were listed by
valve model and where the valve sits, which says nothing about what the valve
does or whether the bus can move:

| Was | Is |
| --- | --- |
| `R-12 relay valve (C/S rear)` | **`R-12 service valve (C/S rear)`** |
| `R-14 relay valve (R/S rear)` | **`R-14 parking brake valve (R/S rear)`** |

Both keep the side, because that is still how you find them on the bus.

**Nothing stored is rewritten.** Every record on the live board was logged under
`Air System`, so this is a read-time rename like every other one in
`repair-catalog.ts`: the category goes in `LEGACY_CATEGORY_RENAMES`, the two
valves in `CATEGORY_ISSUE_RENAMES` keyed by the category the record has *after*
the rename has run. A defect logged in January keeps its id, its details and its
first-seen date, and simply reads as its new home.

Three things are keyed on the category name and would have gone quiet if only
the picker had changed — **the air-bag replacement counts, the category glyph,
and the repair-time estimate.** The counts follow the migrated category. The
glyph and the estimate keep an `Air System` entry too, the way this codebase
already does for `No Start` and `Doors, Ramp and Lift`, so a caller holding an
unmigrated category lands on the right value instead of the catch-all.

Two options still read `Air-system warning` and `Other air-system repair`, and
that is deliberate: they name the physical system on the bus, which is still the
air system, rather than referring to the category title. Say the word and they
change too.

### 6. The Defect Log says WHICH defect has the bus down

**This is the other half of section 4, and it is the half you can see.** A card
with three defects showed one purple `DS` badge. That badge is true of the
*bus*, so with more than one defect under it nothing said which one was the
reason — bus 17526 carrying a rear door, a horn and an IBS screen, all open,
under a single DS.

The specific defect now carries a **full-width banner** reading `ON THE DOWN
SHEET` with what the sheet says about it: workflow, shift, section and who has
it. A banner rather than a fourth badge — with three defects the answer has to
attach to one row, and another small badge in a row of small badges would not
have closed the question. The FOCUS view says the same thing spelled out, the
way it spells out everything else.

**The link is asked of the sheet itself.** `defectLogRecords` read only the
entry's *stated* `defectId`, which names at most one record and is empty on
every entry typed in through + ADD DOWN BUS. So a bus could sit on the sheet for
a fault open in the log and no record would know it. It now calls
`downSheetDefectIds`, a new export wrapping the same `defectTargets` the save
uses, so the badge cannot disagree with what the sheet actually writes to — the
stated id, the ids an entry mints per card, and the record a card adopts because
the bus already had it.

**And when none of them is the one.** A bus can be on the sheet for work never
typed into this log — scanned off paper, or logged straight onto the sheet.
Then the DS badge is true and no defect below carries a banner, which reads like
the app declining to answer. That case now names the sheet entry in amber and
says it is not one of the defects below.

The banner takes the shop's own DS badge colour, so recolouring the badge
recolours this too rather than leaving two purples side by side.

## Validation

- 195 regression tests passing, ESLint clean, production build succeeds
- **Driven at 390 and 1180.** Stats closed on first load, opened, remembered
  across a reload, closed again. + ADD DOWN BUS present exactly once, visible
  without scrolling, full width at 390. Each shift filter pressed on and back
  off. MORE verified closed then open. No control off screen at either width;
  the body never scrolls sideways
- **The h1 was measured, not assumed** — 11px inside a 40px banner, no overflow
- One rendered-HTML test asserted on a stat tile now behind the toggle; it
  asserts the bar and the add button instead
- **The duplicate was reproduced in a browser before it was fixed and re-driven
  after.** Bus 17563 open on the Defect Log for a check engine light, added to
  the Down Sheet by hand for the same fault: two records before, one after, and
  MERGE DUPES goes from offering a cleanup to having nothing to clean. Adding
  the same bus for a *different* fault still produces two records
- **The app's own pull was driven too** — a bus marked down, pulled onto the
  sheet by the app and saved back unchanged: one record, and its details still
  read `Loses power on the hill` rather than swallowing the card's spelling
- One new test for the duplicate: the reported case, a different fault,
  completing through the sheet, a resolved record not being reopened, both
  spellings, two cards never landing on one record, a card keeping the record it
  owns, and a blank card adopting nothing
- **The rename was driven against records stored the old way**, not just against
  the picker. Two defects written as `Air System` — one an R-12 valve, one an
  air-bag leak carrying a count of 4 — read back as
  `Pneumatic System — R-12 service valve (C/S rear)` and
  `Pneumatic System — Leaking air bag - Rear — 4 replaced`, with ids and
  first-seen dates intact. The picker offers `💨 Pneumatic System` and no
  `Air System`
- One new test for the rename covers the migration in both directions, the
  counts, the glyph and the estimate under both spellings, and asserts the new
  name is not quietly falling through to the Miscellaneous defaults
- Three existing tests named `Air System` directly and now name the new
  category; the many tests that pass `"Air System"` as *stored* input were left
  exactly as they were, because they now exercise the migration
- **The two behaviour changes above were measured against the old code**, by
  loading `acf86c2`'s own modules beside the new ones rather than reasoning
  about the diff:

  ```
  two-card DOWN SHEET tick   BEFORE: 3 records -> ["d1","d2","downsheet-repair-tick-1-item-b"]
                             AFTER : 2 records -> ["d1","d2"]
  one-card DOWN SHEET tick   BEFORE: 2 records   AFTER: 2 records   (identical)

  scan reason = stored spelling      OLD -> defect-A   NEW -> defect-A
  scan reason = supporting spelling  OLD -> undefined  NEW -> defect-A
  ```
- **The banner was driven at 390 and 1180** on a bus shaped like 17526, against
  an entry storing no `defectId` at all. The horn carries the banner; the door
  and the screen do not. On desktop the banner claims a whole line — 1099px of
  the row's 1101 — leaving the row's columns intact below it, and the body never
  scrolls sideways. The "none of these is the one" case was driven separately
- **That test was confirmed to fail against the old rule.** Putting the
  `defectId`-only lookup back turns it red, so it is checking the fix rather
  than passing on the fixture
- A cold review of this handoff found five wrong claims in an earlier draft —
  a "no behaviour change" that was not true of the scan or of a multi-card tick,
  an assertion count, a door count, and a fix described in "What changed" that
  had never reached a commit. All are corrected above; the review is the reason
  the section-4 caveat block exists

## After it is live

1. **Down Sheet on a phone.** SHEET STATS closed, then + ADD DOWN BUS full
   width, then the shift filters.
2. **Tap SHEET STATS.** The eight tiles appear; leave and come back and it
   should still be open.
3. **Tap a shift, then tap it again.** It should clear back to ALL.
4. **Tap MORE.** CLEAR DOWNSHEET is there, with the two undos when there is
   something to undo. With MORE closed, none of them is on screen.
5. **The Facility Map should look exactly as it did.** The change is for screen
   readers.
6. **Take a bus that is open on the Defect Log and add it to the Down Sheet by
   hand for that same repair.** The Defect Log should still show one line for
   it, now carrying the DS badge — not two lines. Then do it again for a
   different fault on the same bus and confirm that one *does* get its own line.
7. **Open LOG DEFECT and look at the category list.** It should read
   💨 Pneumatic System, with no Air System anywhere, and the two rear valves
   should read *service valve* and *parking brake valve*.
8. **Find a bus already logged under the old Air System.** It should now read
   Pneumatic System with the same details and the same date, and any air-bag
   count on it should still show.
9. **Open a bus with several defects that is on the Down Sheet — 17526 is the
   one this came from.** Exactly one defect should carry the purple ON THE DOWN
   SHEET banner, and it should be the repair the sheet actually has. If the
   sheet has that bus for something not in the log, an amber banner at the top
   should name it and say it is not one of the defects below.

## The way back

`git revert 1d5454b 21a0d06 3c1f800 acf86c2` — four application commits, newest
first. Driven: the set reverts clean and leaves 192 tests passing.

Each can also be reverted alone; all four touch `tests/rendered-html.test.mjs`
but different parts of it, so git auto-merges. **No ordering constraint** —
`1d5454b`'s `downSheetDefectIds` only calls `defectTargets`, which exists either
way, so reverting `3c1f800` alone while keeping the banner still builds
(verified). It just puts the duplicate back: the banner would then point at the
second record the sheet mints instead of the one already on the bus.

Reverting `21a0d06` alone puts the category back to Air System and the valves
back to their model-number wording. **No record is stranded either way**: the
rename is read-time, so a defect logged while Pneumatic System was live still
carries `Air System` in storage and reads correctly once the rename is gone.

Reverting `3c1f800` alone restores the old behaviour, in which a repair typed
onto the Down Sheet for a fault the bus is already logged for becomes a second
record. That is not data loss — MERGE DUPES folds them back together — but the
counts read high until somebody runs it.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 146 | Live | <published tip hash> | The Facility Map title becomes an h1 so the page has a name a screen reader can announce and jump to, inheriting the banner's size so nothing changes visually; the Down Sheet's eight stat tiles collapse into a SHEET STATS bar closed by default, + ADD DOWN BUS moves to the top full width from its old place beneath CLEAR DOWNSHEET, the clear and undo actions move behind MORE, and a shift filter can be pressed again to clear it; a repair added to the Down Sheet for a fault the bus is already logged for now writes to the record that is there instead of logging it a second time, matching only exact repeats that are still unresolved; a bus card with several defects now marks the specific defect that has it on the Down Sheet with a banner saying what the sheet says, and names the sheet entry when none of the listed defects is the reason; and the Air System category is renamed Pneumatic System with its two rear valves named for what they do rather than their model number, read-time so nothing stored is rewritten |
```
