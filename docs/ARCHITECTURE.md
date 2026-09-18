# How this repository is laid out

`app/` used to be a flat directory of about 110 files in which a Next route
file, a shared React component and a pure domain module all looked the same.
Nothing in a filename said which of them Next would turn into a URL, which ones
two pages shared, or which ones held the shop's rules. This is the layout that
replaced it, and the rule for putting the next file in the right place.

## The four homes

```
app/                        what Next routes, and nothing else
  layout.tsx                the root layout
  page.tsx                  the Facility Map
  globals.css               the whole facility map, all breakpoints
  _components/              React only the map or the layout draws
  api/<name>/route.ts       server handlers
  <route>/page.tsx          Down Sheet, Defect Log, Fixed Repairs, Fleet Campaigns, Settings
  <route>/<route>.css       that page's stylesheet, beside the page
  <route>/_components/      React only that page draws

src/lib/<area>/             the domain: .ts, no JSX, storage passed in
src/components/<area>/      React that more than one route draws, and its CSS
tests/                      one file per area, shared setup in tests/helpers/
```

`db/`, `worker/`, `build/`, `drizzle/`, `supabase/` and `public/` are unchanged
and stay where they are.

## The rule for a new file

1. **Does Next route it?** `page.tsx`, `layout.tsx`, `route.ts` and a page's own
   stylesheet go in `app/`. Nothing else does.
2. **Does it hold JSX?** If not, it is domain code: `src/lib/<area>/`.
3. **Do two or more pages draw it?** Then `src/components/<area>/`.
4. **Does exactly one page draw it?** Then `app/<route>/_components/`. The
   leading underscore is load-bearing — Next does not route a directory whose
   name starts with one, so a component can sit beside its page without
   becoming a URL.

A file that answers 2 and 3 at once — a component *and* a rule — is two files.
Put the rule in `src/lib` where a test can import it directly, and let the
component draw it. The suite reads `.tsx` as text and imports `.ts` for real,
so a rule buried in a component is a rule nothing can test.

## The areas

The same nine names are used for `src/lib` and, where they apply, for
`src/components`:

| area | what it owns |
| --- | --- |
| `storage` | LocalStorage keys and envelopes, recovery snapshots, backups, section transfers |
| `cloud` | the Shop Cloud: row shapes, fingerprints, the push planner, the merge rules a pull is applied through, the tombstone ledgers |
| `fleet` | buses and this building: the grid, the areas, location labels, status, holds, mileage, service intervals, road calls, campaign lists |
| `defects` | the repair catalog and its rename maps, the Defect Log, duplicates, deferrals, recommendations, quick filters, the parts and findings memories |
| `down-sheet` | the sheet itself: availability, filters, grouping, repair items, the replacing scan, membership, the swap ledger |
| `operator` | the AI operator: what a typed command plans and what a batch applies |
| `reports` | the Fleet Status Report and its print view, the Fleet Forecast, work time |
| `settings` | per-device settings: app mode, lite mode, map settings, roles, the shift clock, the page list |
| `shared` | small helpers with no area of their own: elapsed labels, hours typing, operational time, scroll lock, file sharing, time windows |

Six to ten areas is the right number. Splitting further produces directories
holding one file each, which tells a reader nothing the filename did not.

## Imports

`tsconfig.json` maps `@/*` to the repository root. Use it for anything crossing
out of the current directory:

```ts
import {statusForLocation} from "@/src/lib/fleet/smart-status";
import TrackerNav from "@/src/components/shared/tracker-nav";
```

**Inside `src/lib`, imports stay relative** (`../fleet/location-label.ts`, with
the extension). The suite imports those modules directly through Node's test
runner, which resolves neither tsconfig paths nor the alias — an aliased import
anywhere in `src/lib` breaks every test that reaches it. Tests import by
relative path for the same reason.

vinext reads the tsconfig `paths` field, so the alias works in `npm run dev`,
`npm run build` and `vinext start` without a `resolve.alias` entry in
`vite.config.ts`.

## Tests

`tests/rendered-html.test.mjs` was one 15,739-line file. It is now one file per
area — `storage`, `cloud-sync`, `fleet`, `defects`, `down-sheet`, `operator`,
`reports`, `settings`, `shared` and `app-shell` — with `tests/helpers/`
holding the shared setup: `modules.mjs` re-exports every project module the
suite asserts against, so the next module move edits one import list instead of
ten, and `setup.mjs` holds the in-memory LocalStorage stand-in, the
production-worker renderer and the HTML section slicer.

`npm test` builds first and then runs `node --test tests/*.test.mjs`, so a new
file in `tests/` is picked up without editing `package.json`.

Coverage for a change goes in the file for its area. `app-shell` is for what is
true of the rendered app rather than of one area: the pages, the stylesheets,
the service worker and the handoff files.

## Domain ownership

These boundaries are the reason the areas are drawn where they are. They are
copied from `PROJECT_HANDOFF.md`, which Codex owns and which remains the
authority if the two ever disagree.

- The Facility Map owns physical bus location and operating status. Repairs
  entered there must be explicitly routed to the Defect Log, Down Sheet, or
  both; the map must not maintain an ambiguous third defect log.
- The Down Sheet owns formal maintenance scheduling and active Down Sheet
  membership.
- The Defect Log owns records created directly from the Defect Log.
- Fixed Repairs reads completed structured defects from the fleet record and
  owns only their completion-detail edits; it is not a separate duplicate
  repair store.
- Fleet Campaigns owns independent working lists and must not mutate fleet,
  Down Sheet, Defect Log, or Fixed Repairs records. Its one read outside its own
  storage is the fleet, borrowed read-only so the Work Time panel can total
  Defect Log repair hours alongside campaign rows; the page never writes fleet
  storage back.
- Work time is an aggregation, not a store. It records nothing of its own: it
  reads hours already saved on campaign rows and on completed repairs, so a time
  total can never disagree with the record it came from.
- Repair and status changes may synchronize across surfaces; Down Sheet or
  Defect Log edits must not silently relocate a bus.
- A bus may have multiple independent repair records. The phone Defect Log
  groups them visually by bus but does not merge or discard the underlying
  records.

## What this layout does not change

Moving a file is not permission to change what it does. No LocalStorage key was
renamed, no exported constant was renamed, and no runtime behaviour moved with
any of these files. A location is still named through
`src/lib/fleet/location-label.ts` and never by a prefix. Catalog renames are
still read-time and nothing on disk is rewritten.
