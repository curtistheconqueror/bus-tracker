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

**Not a permission system.** Settled with Curtis: *"It's not so much a
permissions thing as it is a training purpose."* Lite hides complexity, not
authority. Anyone holding a device can turn it on and off themselves, and
nothing about it stops a person doing anything.

Management control — options granted by login credentials — is a real and
separate phase, and Curtis has placed it deliberately: *"Those will be the very
last commits and changes to the app."* Lite must not become the half-built
version of it. If a decision here would only make sense as a permission, it
belongs in that later phase and not in this one.

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

Facility Map, Down Sheet, Defect Log, Fixed Repairs, Settings. Only Fleet
Campaigns is hidden — it is planned work read a campaign at a time, not
something a new person meets on a shift.

**Fixed Repairs stays, and the first draft of this document had it wrong.** It
argued Fixed Repairs is read after the fact. Curtis: keep it. Writing down a
job you just finished is a beginner's FIRST action, not an advanced one — often
the only thing a new mechanic does in the app all day — and LOG REPAIR exists
precisely because that is how it happens on the floor.

What Lite draws on it needs Curtis's eye before anyone builds it. The proposal:
keep LOG REPAIR, the history list and SEARCH HISTORY; hide EXPORT HISTORY
REPORT and UNDO LAST; and inside a record, hide the same detail fields the
Defect Log form hides, for the same reason. That last part is a guess about how
much a new person should be asked to fill in, and it should be checked rather
than assumed.

### The Down Sheet

Kept: the sheet itself, ADD DOWN BUS, SEARCH, and the tiles that answer "how
many buses am I down" — TOTAL ON SHEET, DOWN BUSES, and the four bands.

Hidden: ADVANCED ACTIONS entirely, which takes the shift filter, SHOW
COMPLETED, SCAN SHEET, UNDO IMPORT, UNDO CLEAR and CLEAR DOWNSHEET with it. Also
hidden: EST. ACTIVE LABOR, EST. CURRENT VIEW, SHEET CAPACITY, PENDING, ACCIDENT,
WAITING PARTS and COMPLETED TODAY.

The row's own ✓ and × stay — confirmed by Curtis. They are the two things a
person does to a row, and since release 163 both ask before they act.

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

Anyone holding the device can turn it on and off. There is no foreman-only
version of this switch and there should not be one — see the note on
permissions above.

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

## The header, and the name

Settled, and it is a bigger change than a marker.

**The app's name goes in the top-left corner of every page**, with **LITE**
behind it when the device is in Lite. The current header contents move down to
make room, so this is a header restructure on all six pages rather than a badge
dropped into a corner — and it is worth doing on its own, before or alongside
Lite, because the app's name is nowhere on the screen today.

Every header already carries a kicker of its own (`FLEET MAINTENANCE`, `MAINTENANCE FACILITY`)
above a per-page title, and each page styles its own header in its own
stylesheet. The name has to sit above that in a way that reads the same on six
pages that deliberately do not share a header component — so the honest first
step is one shared piece for the name, the way `tracker-nav.tsx` is one shared
piece for the nav, rather than six more copies to drift.

The Lite switch also lives in Settings, but Curtis is explicit that Settings is
not where it belongs long term: it ends up on the landing / home page, which is
the next piece of work after this. **Anything built here should assume the
landing page is coming** and not make the switch hard to move.

### Still open

1. **Which name goes in the corner?** The app is already named in two places,
   neither of which is drawn on any page:

   | where | value |
   | --- | --- |
   | `public/manifest.webmanifest` → `name` | Fleet Maintenance Bus Tracking System |
   | `public/manifest.webmanifest` → `short_name` | Fleet Bus Tracker |

   `short_name` is what a phone already prints under the home-screen icon, so a
   header that disagrees with it would give the same app two names on one
   device. That argues for **Fleet Bus Tracker** — but the full name is far too
   long for a header, and Curtis may want a third thing entirely. One answer
   from him settles it; this blocks the header work and nothing else.
2. **What Lite draws on Fixed Repairs**, per the section above. A proposal is
   written there; it is a guess until he looks at it.

## What to build first

One setting, the nav filter hiding Fleet Campaigns, and the two ADVANCED ACTIONS
sections hidden. That is a small change to files that already exist, it can be
measured in a browser the way everything else here is, and it is enough to put
in front of one new person and find out whether the idea survives contact with
the floor.

**The header and the name are their own piece of work** and should not be
bolted onto that first pass. They touch six stylesheets, they are wanted whether
or not Lite ever ships, and they are blocked on a question only Curtis can
answer.

The defect form is the third pass and the one with real judgement in it. Do not
start there.
