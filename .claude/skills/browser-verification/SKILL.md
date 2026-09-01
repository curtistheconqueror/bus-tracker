---
name: browser-verification
description: Use this before claiming any UI change works, and whenever a check in a real browser comes back with a surprising result — an element missing that should be there, a value that did not change, a badge that never appeared. Covers seeding LocalStorage state, waiting past the hydration race so you measure the real board rather than the seed one, measuring boxes instead of trusting screenshots, and forcing failure paths deliberately. Trigger it for any layout, badge, overlap, or breakpoint question, and before writing "verified" in a commit message or handoff. Most surprising results here have been a broken test rather than a broken app, and telling those apart is the whole job.
---

# Verifying a change in a real browser

## The rule

**Measure the rendered box. Do not read the CSS, and do not trust a
screenshot.** Nearly every significant layout bug in this project was found by
measuring and missed by reading: badges clipped by their own parent, a header
overflowing its own bottom edge, a fixed element covering a section at one
width only.

And the second rule, which costs more time than the first when ignored:
**when a browser check surprises you, suspect the test before the app.**

## Setup

Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Playwright
is not a project dependency; import it from the global install:

```js
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
```

`npm run dev` serves on 5173 — but it takes another port when one is in use, so
read the port out of the log rather than assuming:

```
grep -oP 'Local:\s+http://localhost:\K[0-9]+' devserver.log | tail -1
```

Seed a board by writing the storage keys and reloading. The keys are listed in
`CLAUDE.md`; the two that matter most are `pace-board-v1` and
`pace-down-sheet-v1`, both wrapped in an envelope:

```js
await page.goto(BASE + "/");
await page.evaluate(([fk, f]) => localStorage.setItem(fk, JSON.stringify(f)),
  ["pace-board-v1", { kind: "buses", version: 4, buses: [...] }]);
await page.reload();
```

Phone widths worth checking: 360, 390, 430. iPad: 820 portrait, 1180 landscape.

## The hydration race — this one bites every single time

The app renders a seed board first, then a mount effect replaces it with what
LocalStorage holds. **Anything you wait on that the seed board also satisfies
will resolve too early**, and you will measure the wrong board.

Wrong — the seed board has bus tokens too, so this resolves before hydration:

```js
await page.waitForFunction(() => document.querySelectorAll('[data-bus-id]').length > 0);
```

Right — wait for something only *your* fixture produces:

```js
await page.waitForFunction(() => document.querySelector('[data-bus-id="bus-1"]') !== null);
```

The same trap in a second costume: waiting for a control to **exist** when what
you need is for it to be **enabled**. A button disabled until a count is
computed exists immediately and is useless until hydration finishes:

```js
await page.waitForFunction(() => { const b = document.querySelector(".merge-duplicates"); return b && !b.disabled; });
```

Both of these were hit in a single session. The first reported a badge missing
on five pages; the second reported a button that would not click. Neither was
an app bug.

## Check the fixture before believing a negative

A check that says "the thing is not there" is a claim about your fixture as
much as the app.

**Real case.** A smoke run reported the deferred alert badge missing on all
five pages. The badge shows for buses deferred past 90 minutes; the fixture
built its timestamp with `now.setHours(21, 0, 0, 0)` on a container whose clock
read 01:28, which put "95 minutes ago" two hours into the *future*. Elapsed
time was negative, the badge correctly hid, and the app was right. Filing that
as a bug would have wasted a round trip and produced a "fix" for nothing.

Before reporting a negative result, print the fixture. Timestamps especially:
relative-to-now beats an absolute hour, and if you must pin an hour, assert it
is actually in the past.

## Measuring

Use `getBoundingClientRect()` and compare against the thing you actually care
about — which is often **not** the sibling you were looking at.

**Real case.** The DS badge appeared to have a clean 5px gap from the bus
number, so the reported overlap looked wrong. It was not overlapping its
sibling; it was spilling **13px past its own grid column** and landing 4px onto
the repair text in the next one. Measuring badge-to-sibling said fine.
Measuring badge-against-the-next-column's-bounds found it.

For "is this covering something", ask the document rather than eyeballing:

```js
const box = el.getBoundingClientRect();
const under = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
const covering = under && !el.contains(under) ? under.className : null;
```

Useful things to assert: `clipped` (does the box extend past its parent's
bounds), `offscreen` (`box.right > window.innerWidth`), and for performance,
node counts before and after via `git stash`.

## Forcing the failure path

A feature is not verified until the branch where it fails has been driven, and
the failure branch is usually where the damage lives.

Make the failure the way the app would really meet it:

- **Refused write** — overwrite the stored payload with an unsupported
  envelope (`{kind:"buses",version:99,buses:[]}`) *after* the page has loaded.
  The change still computes in memory; the write refuses.
- **Full device** — fill with large chunks until `setItem` throws. Note that
  this does **not** reliably fail a write that makes the payload *smaller*: an
  attempted fill failed to break a merge for exactly that reason.
- **A fixed clock** — override `Date` in `addInitScript` before the app loads,
  for anything time-gated.

Then assert the negative directly: no success message, nothing written, and the
banner the user should see.

## Before writing "verified"

Say what was measured, not that you looked. "42 defects before, 42 after"
carries information; "verified the merge works" does not, and is exactly the
sentence that shipped a merge that never merged anything.
