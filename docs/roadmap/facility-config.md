# Pull the site out of the code

Issue #21. **Scoped, not built.** Every number here was measured at `64bd8ad`,
not estimated; the commands are in each section so they can be re-run.

## What "the site is baked in" actually means

The yard is not one table in one file. It is four independent descriptions of
the same building that must agree, plus a fifth in CSS:

| Where | What it holds | Size |
|---|---|---|
| `src/lib/fleet/facility-areas.ts` | `SECTION_SLOTS` — 16 sections to slot lists; `RELOCATION_AREAS` splits the garage into 3 move destinations | 18 areas |
| `src/lib/fleet/facility-layout.ts` | `ROAD_CAPACITY` 75, `WEST_CAPACITY` 40, plus two one-off capacity migrations | 34 lines |
| `src/lib/fleet/location-label.ts` | slot prefix to the words a person says | 16 prefixes |
| `src/lib/settings/map-settings.ts` | `SECTION_THEME_KEYS` — which sections can be re-coloured | 15 sections |
| `src/lib/fleet/fleet-intelligence.ts` | spoken aliases ("cng east", "east lot") for the move parser | 16 sections |
| `app/globals.css` | the drawn geometry | 115 section selectors, 106 `grid-template-columns` |

Slot-prefix literals outside those files, by count:

```
grep -rcoE '"(garage|road|west|east|bay|service|wall|waiting|office|pit|brake|tow|body|paint|wash|offsite)-' app --include=*.ts --include=*.tsx
```

`page.tsx` 16, `location-label` 7, `down-sheet-filters` 7, `quick-filters` 6,
`smart-status` 5, `repair-catalog` 5, `facility-layout` 4, `facility-areas` 4,
`road-calls` 3, `mystery-buses` 3, `defect-log/page` 3, `operational-time` 2,
`down-sheet-view` 2, `defect-log-sync` 2, `down-sheet-badge-view` 1,
`quick-filter-share` 1. **16 files, ~71 occurrences.**

Not all are equal. Most are labels. These carry BEHAVIOUR:

- **`smart-status.ts`** — the colour normalization. `offsite-` and
  `east-`/`west-` read "out", `bay-`/`body-` read "shop", `garage-` and `road-`
  each route to their own status function. Change a prefix and every bus on the
  map changes colour.
- **`mystery-buses.ts`** — `ONSITE_WORK_PREFIXES`, a hand-listed 16.
- **`road-calls.ts`** — `startsWith("road-")` decides a bus is on the road.

## Two landmines, both pre-existing, both must be resolved first

**1. The trouble-bay test hard-codes the garage's WIDTH.**

```ts
// src/lib/fleet/mystery-buses.ts
const slot=Number(location.slice("garage-".length));
return Number.isInteger(slot)&&slot>=0&&slot%12>=10;
```

The garage is a 7x12 grid; `%12>=10` means "the last two columns", which is how
TROUBLE BAY 11 and 12 are identified. A config that lets a garage be 10 wide or
14 wide silently mislabels the trouble bays — no error, no failing test, just
the wrong buses on the awareness board. This is the exact failure `CLAUDE.md`
already warns about: *"Five copies of that table existed and all five had the
bug; a sixth would bring it back."* The width has to become config before
anything else moves.

**2. There are two different "bay 12" and they do not agree.**

`SHOP BAYS (DIAGONAL)` is `facilitySlots("bay",9,1)` — `bay-1` through
`bay-9`. There is no `bay-12`. But:

- `operational-time.ts` lines 23 and 37 test `bus.l==="bay-12"` to set
  `bay12Watch`;
- the fleet suite (now `tests/fleet.test.mjs`) asserts on `l:"bay-12"`;
- the seed board in `page.tsx:61` parks buses at `bay-10`, `bay-11`, `bay-12`.

Meanwhile the *canonical* trouble bay test is the garage modulo above. So
`bay-12` is a location with behaviour attached, asserted by tests, and absent
from the layout that defines which locations exist. Decide what it is —
legacy alias, real slot, or dead branch — and say so in the config. Do not
carry the ambiguity into a file that claims to describe the building.

## The plan

**Phase 0 — resolve the landmines. No config yet. DONE.**

The garage's shape is now four constants in `facility-layout.ts` —
`GARAGE_ROWS`, `GARAGE_COLUMNS`, `GARAGE_TROUBLE_BAY_FIRST_COLUMN`,
`GARAGE_READY_BAY_DIVIDER_COLUMN` — with `GARAGE_CAPACITY` derived rather than
typed, and one shared predicate `isGarageTroubleBayIndex`. All four readers
(`facility-areas.ts`, `mystery-buses.ts`, `page.tsx`, and the capacity) go
through them; no file spells the width itself any more.

The net that makes a width change SAFE rather than merely centralised is a test
that drives the two independent definitions of "trouble bay" — the awareness
predicate and the move destinations the editor offers — over **every** slot in
the garage and requires them to agree, plus that the three destinations
partition the grid exactly. Mutating `GARAGE_COLUMNS` to 14 fails it on the
partition; leaving `mystery-buses.ts` on its own literal while the width moves
fails it with *"garage-8 (column 8): the awareness test and the move
destinations disagree"*.

Proved a pure refactor by rendering the same seeded board at 1180 before and
after: 84 spots, trouble bays at columns 10–11 of every row, divider on 07,
awareness only on the trouble bays — and the grid's innerHTML identical to the
character (23,329).

**`bay-12` is NOT dead code, and the near-miss is the finding.** It reads like a
leftover: SHOP BAYS is `bay-1`…`bay-9`, there is no `bay-12`, and the move
editor cannot put a bus there. But `migrateFacilitySlots` — which rewrites any
bus found at `bay-10/11/12` — is local to `page.tsx`, is not exported, and only
feeds React state. **It never writes the corrected board back to
`pace-board-v1`.** The Defect Log reads that key raw and calls
`stampOperationalChange` through `defect-log-sync.ts`, so a legacy bus stored at
`bay-12` reaches the check without ever passing the migration. It stays, with
the reasoning written in `operational-time.ts`.

Deleting it is safe only once the bay migration is **persisted** rather than
held in one page's state — a change to how the board is written, so it belongs
to Phase 1.

**Phase 1 — one `site-config.ts`, values byte-identical to today. STEP 1 DONE.**

Split in two on purpose. **Step 1 writes the config and proves it, changing no
consumer** — a pure addition, so nothing in the running app can move. **Step 2**
points the five tables at it one at a time, with the rendered map diffed at each.

Step 1 is in: `src/lib/fleet/site-config.ts` holds one record per section — the slot plan,
the theme entry, and the move destinations with their labels and spoken aliases
— and a test requires it to reproduce `SECTION_SLOTS`, `RELOCATION_AREAS`, the
label table, `SECTION_THEME_KEYS` and the alias table **exactly**. That
equivalence is what makes Step 2 a refactor rather than a rewrite.

**It found two things reading would not have, and both are ORDER.**

- **The swatch list and the section list are ordered differently.** FOREMAN
  OFFICE is sixth among the theme swatches and ninth among the sections. Deriving
  the swatches from section order silently reorders somebody's colour picker, so
  the theme carries its own `order`.
- **The alias order is behaviour, not presentation.** `findOperatorArea` returns
  the FIRST area one of whose aliases appears in the command. TROUBLE BAY 11 owns
  `"bay 11"` and SHOP BAYS owns `"service bay"`, and both sit inside
  *"service bay 11"* — the trouble bays are listed first, so it resolves the way
  somebody in the shop means it. Ordered by section instead it quietly becomes
  SHOP BAYS.

**A mutation survived the first draft and that is worth recording.** Removing the
config's alias sort passed, because feeding each alias in on its own proves
nothing about order, and asking `findOperatorArea` about an overlapping phrase
exercises *fleet-intelligence's own private table* rather than the config. The
test now resolves the phrase through the **config's** list and requires it to
agree with the app.

Four asymmetries are preserved deliberately rather than tidied, each commented
where it appears: the theme key `bays` against the slot prefix `bay`; "Shop
Bays" against "Shop Bay"; OFF PROPERTY having no theme entry and no alias; and
the garage being one section drawn as one grid but three move destinations.
Tidying any of them is a visible change and belongs to whoever decides to make
it, on purpose.

**Step 2 is done.** Three consumers read the config; the fourth deliberately
does not.

| Consumer | Outcome |
| --- | --- |
| `facility-areas.ts` | reads the config — `SECTION_SLOTS`, `RELOCATION_AREAS`, `EAST_SLOTS` and the capacity constants |
| `location-label.ts` | reads the config — area labels and the prefix fallback |
| `fleet-intelligence.ts` | reads the config — the alias table, order included |
| `map-settings.ts` | **not switched, on purpose** |

**Why `map-settings.ts` stays.** `SECTION_THEME_KEYS` is `as const` and
`SectionThemeKey` is the literal union derived from it, which types
`Visuals.sections` and every theme. Reading the array at runtime gives identical
values and a type of plain `string` — measured — so a misspelt section key would
start type-checking in the file that types all the theming. The equivalence test
requires the two to match in content and order, so it cannot drift.

**Two tests had to change character, not just address.** Nine assertions that
matched source text (`"PIT":facilitySlots("pit",2)`) became assertions on the
table itself; a text match only ever proved a spelling.

**And one test stopped biting because of this work.** The alias-order assertion
resolved a phrase through the config and required `findOperatorArea` to agree —
which worked while they were two lists, and became a tautology the moment
`fleet-intelligence.ts` began reading the config. The mutation that removes the
config's sort passed. It is pinned to the expected area now. Caught only by
re-running the mutation after the swap; a green suite meant something different
after the change than before it.

**Proofs, per commit:** the whole map rendered before and after at 1180 — 355
spots, 16 sections, facility innerHTML identical at 86,943 characters; all 355
slots labelling exactly as before; the operator parser resolving every alias and
still splitting "bays 11 and 12" into two mentions.

**Phase 1 is complete.** The decision gate is now: Phase 2 is the CSS, and it
only pays if a second garage is real.

The gate, and it is not negotiable: **`npm test` reports 325 with zero edits to
any test file.** The suite carries 431 slot-name literals and 71 section-name
mentions — it is already the regression net for exactly this, so any change that
needs a test edited is a change that moved behaviour.

```
grep -rcoE '"(garage|road|west|east|bay|...)-' tests/   # 431
npm test | grep '^# tests'                                                    # must read 325
```

Plus: seed a real exported board into LocalStorage, render the map before and
after, and diff the HTML. Byte-identical or it is not a pure refactor.

**Phase 2 — CSS. This is the expensive half and it is where estimates go wrong.**
106 `grid-template-columns` declarations and 115 section selectors encode the
geometry. A config that changes counts without changing the drawn grid produces
a map that is wrong in a way screenshots do not reveal — which is why
`browser-verification` says measure boxes. Phase 2 is CSS custom properties
driven from the config, and it is at least as much work as Phase 1.

**Phase 3 — Settings loads a different config.** Only after 1 and 2 are green.

## What this does not touch

**Storage keys keep the `pace-` prefix. Forever.** All 50 of them. The prefix is
a name, not a claim about the site, and `CLAUDE.md`'s rule is absolute: a rename
orphans a mechanic's board. A second garage running this app uses keys that say
`pace-`, and that costs nothing.

## The honest cost, and when not to do it

Phase 0 is one session. Phase 1 is two to three. Phase 2 is two to four and
carries the real risk. Phase 3 is one. **Call it six to nine sessions.**

For Pace South alone the reward is **zero** — the app already describes this
building correctly, and every phase is a chance to break a working map that
mechanics use on the floor. It pays only if a second garage is a real goal.

Phase 0 is the exception: it fixes a latent bug and settles a contradiction, and
is worth doing on its own merits whatever happens to the rest.
