# Future Phase: Lite Mode

**Designed, not built.** Nothing in this document exists in the app yet.

## Product intent

Give a new person a version of this app they can be handed on their first shift
without a tour. They see the three surfaces the shop actually runs on, with the
controls that matter and nothing else, and they turn the rest on when they are
ready — or a foreman turns it on for them.

The people this is for are mechanics and new foremen who have never used the
app. They are not a different kind of user with different data. They are the
same user earlier on, which is why this is a view and not a product.

## What Lite is not

**Not a second app.** No second deployment, no second set of pages, no second
build. One app that draws less of itself.

**Not a second data shape.** This is the constraint the whole idea rests on. A
Lite device writes the same records to the same storage keys and syncs through
the same cloud path as a full device. A Lite phone and a full phone sit side by
side on the same Shop Cloud and neither can tell what the other is running.

If Lite ever needs its own record shape, its own key, or its own sync rule, the
design is wrong and should be stopped rather than worked around. Everything
below is about what is DRAWN, never about what is STORED.

**Not a permission system.** Lite hides complexity, not authority. It is not a
way to stop somebody doing something; anyone on Lite can reach everything by
turning it off. If the shop ever needs to actually prevent an action, that is a
different feature and it does not belong here.

## Where it plugs in

The groundwork is already there, which is most of why this is worth doing.

- **The nav is one list.** `app/tracker-pages.ts` holds `TRACKER_PAGES` and
  every header draws from it. Hiding pages in Lite is one filter in one file,
  not six edits — the comment in that file records what the five drifting
  copies used to cost.
- **Every surface already reads per-device settings.** `pace-board-settings-v1`,
  `pace-down-sheet-settings-v1`, `pace-defect-log-settings-v1`. Adding one more
  per-device field is a road this app has been down repeatedly.
- **Settings is already one page** with a section per surface, so the control
  that turns Lite off has an obvious home and does not need a new screen.
- **Both sheets already have an ADVANCED ACTIONS section**, added in releases
  161 and 163, holding the controls that are not used on every visit. Lite is
  largely the same judgement taken one step further, and the grouping work is
  already done.

## What Lite draws

### The nav

Facility Map, Down Sheet, Defect Log, Settings. Fixed Repairs and Fleet
Campaigns are hidden — both are read after the fact rather than during a shift,
and neither is how a new person meets the app.

### The Down Sheet

Kept: the sheet itself, ADD DOWN BUS, SEARCH, and the tiles that answer "how
many buses am I down" — TOTAL ON SHEET, DOWN BUSES, and the four bands.

Hidden: ADVANCED ACTIONS entirely, which takes the shift filter, SHOW
COMPLETED, SCAN SHEET, UNDO IMPORT, UNDO CLEAR and CLEAR DOWNSHEET with it. Also
hidden: EST. ACTIVE LABOR, EST. CURRENT VIEW, SHEET CAPACITY, PENDING, ACCIDENT,
WAITING PARTS and COMPLETED TODAY.

The row's own ✓ and × stay. They are the two things a person does to a row, and
both already ask before they act.

### The Defect Log

Kept: SEARCH, LOG DEFECT, and the feed.

Hidden: ADVANCED ACTIONS entirely — the filters, QUICK FILTERS, UNDO LAST, CLEAN
UP, SCAN SWEEP, SCAN BATCHES and AI OPERATOR.

The defect form is where Lite earns its keep. Kept: the bus, the category and
issue pickers, the description, and whether it goes to the Down Sheet. Hidden:
diagnosis, finding, parts, part numbers, repair and diagnostic hours, work
states, and the TSB field. A new person reports what is wrong with a bus. Those
other fields are for the person who fixes it, and an empty one asked of somebody
who does not know the answer is how bad data gets entered.

### The Facility Map

Kept whole. It is the surface a new person understands fastest — buses in
places — and there is nothing on it that a beginner needs protecting from.

### Settings

Kept: the Lite switch itself, the per-device initials, and the theme. Hidden:
MASTER EXPORT, MASTER IMPORT, RESTORE LAST GOOD COPY, the section transfers, the
wording and colour controls, and the Shop Cloud connection panel.

Shop Cloud is the interesting one. A Lite device should still SYNC — that is the
whole point of the shop having one board — but a new person should not be able
to sign it out, repoint it, or press GET THE SHOP'S COPY. The engine runs; the
controls are not drawn.

## The way out

**A person on Lite must be able to leave it without being taught how.** The
moment somebody needs a control Lite hides is the moment Lite becomes a cage,
and a cage gets abandoned rather than grown out of.

So: a SHOW EVERYTHING control on the page itself, not buried in Settings.
Pressing it turns Lite off for that device, permanently, and says so. There is
no confirm and no ceremony. Somebody who presses it by accident presses the
switch in Settings to go back.

Whether Lite should also be turnable on for another device from a foreman's
phone is an open question below. It should not be built in the first pass.

## What this costs, permanently

Every feature added after this has to answer a new question: does it appear in
Lite? That question never goes away, and a wrong answer is invisible — a control
that a Lite user needed and never saw does not produce a bug report, it produces
somebody who stops using the app.

This is the real price, and it is not paid in the first pass. It is worth paying
if new people arrive regularly. For one or two, a foreman sitting with them for
twenty minutes is cheaper and better.

**A mitigation worth building with it:** one place that lists what Lite hides,
so the answer is a line in a list rather than a condition scattered across six
files. If the hiding ends up as `mode==="lite" &&` sprinkled through the pages,
this feature has failed regardless of how it looks on day one.

## Open questions for Curtis

1. **Who turns it on?** Per device by the person holding it, or set by a foreman
   for somebody else? The second needs the setting to sync, which means a new
   synced field and a schema change — a materially bigger job, and his call
   every time.
2. **Does Lite hide the Down Sheet's ✓ and ×, or keep them?** Kept above,
   because they are the daily verbs and both confirm. Worth confirming.
3. **Is Fixed Repairs really out?** It is where a mechanic writes down a job
   they finished, which is arguably a beginner's first action, not an advanced
   one.
4. **Should a Lite device be visibly Lite** — a small marker in the header — so
   a foreman looking over a shoulder knows why a control is missing?

## What to build first

One setting, the nav filter, and the two ADVANCED ACTIONS sections hidden. That
is a small change to files that already exist, it can be measured in a browser
the way everything else here is, and it is enough to put in front of one new
person and find out whether the idea survives contact with the floor.

The defect form is the second pass and the one with real judgement in it. Do not
start there.
