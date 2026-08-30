# Supabase sync — handoff

Everything a new session needs to pick this up. Read this first; it is short on
purpose.

## Where it stands

| | |
| --- | --- |
| Schema | **APPLIED to the live Supabase project on 2026-08-30** and verified there. Also tested against a real Postgres 16. |
| Files | `supabase/migrations/0001_cloud_backup.sql`, `supabase/migrations/0002_shared_records.sql`, `supabase/tests/schema.test.sql`, `supabase/run-tests.sh` |
| Verify locally | `./supabase/run-tests.sh` — builds a throwaway cluster, applies every migration twice, runs 12 checks. No network, no Supabase account. |
| How it was applied | Pasted into the Supabase **SQL Editor** in the browser. That needs no MCP connector and no database password, and it is the route to use again. Do not wait on the connector, which reported `connected: true` with `enabledInChat: false` and never exposed a single tool. |
| Client | **Built.** `app/cloud-sync.ts` (pure logic), `app/cloud-client.ts` (the Supabase calls), `app/cloud-sync-control.tsx` (Settings → SHOP CLOUD). Syncs the map, the Defect Log and the Down Sheet. |
| Next | Each device is connected once by pasting its Project URL, anon key, sign-in email and the person's initials into Settings. Campaigns and the learned parts/findings have tables waiting but are not synced yet. |

### Verified in the live project on 2026-08-30

| Check | Result |
| --- | --- |
| All 8 tables present with the expected column counts | pass |
| Rows in every table | 0 |
| RLS policies | 23 — select/insert on `fleet_snapshots`, select/insert/update on the other seven, **no delete anywhere** |
| `keep_newest_write` triggers | 7, one per syncing table |
| `down` / `on_down_sheet` / `down_sheet_ready` on `buses` | absent, as designed |

Re-run those checks with the queries in "Checking the live project" at the end
of this file. A table can exist with the wrong columns and `create table if not
exists` will never correct it, so counting tables is not enough — check shapes.

### The MCP connector points somewhere else — do not apply anything through it

When the Supabase MCP tools finally became reachable on 2026-08-30, they showed
exactly one organization and one project, both named **keydenza**, containing
`profiles`, `pvp_matches`, `pvp_match_players`, `pvp_stats`, `pvp_rooms` and
`pvp_queue` — a different application entirely. **None of the bus-tracker tables
are in it.**

The bus tracker's own database is real and verified; it is simply not the
project this token can see. Curtis applied the migrations through the SQL Editor
while signed in to the account that holds it.

So: **never run `apply_migration` or any DDL through the MCP connector without
first calling `list_tables` and confirming the bus-tracker tables are the ones
there.** A session told to "finish the Supabase migration" that trusts the
connector will quietly install a fleet-maintenance schema into an unrelated
project. Use the SQL Editor, signed in as the account that owns the bus tracker.

### A warning worth keeping

Two Claude sessions were working on this at once and both wrote a schema. One of
them misread the other's commits as Codex's, and part of the schema was applied
from each. It came out consistent, but only because both were the same file, and
it was verified rather than assumed.

**Codex has not pushed to `main` since `8228c65` on 2026-08-29.** Check
`git log --format="%h %an %s"` before believing otherwise; every commit after
that one is Claude's. If a second session is active, agree who is writing to the
database before either of you runs DDL.

## The decisions already made

- **One shared shop login.** Three people now, eventually forty. Nobody outside
  the shop.
- **Initials on every row from day one.** A shared login means the database
  cannot tell you who did what, so `updated_by` carries the initials the app
  already collects. When per-person accounts arrive they add a column beside it
  and tighten the policies — no table is reshaped.
- **Offline first is not negotiable.** Every table is a copy of something that
  already lives on the device and still works with the wifi down. Supabase is
  where data syncs *to*. It is not where the data lives.
- **Phasing.** (1) cloud backup, push only — that is `0001`, already written.
  (2) pull and merge, reusing the merge rules that shipped in Versions 123–124 —
  that is `0002`. (3) live updates, only if still wanted after 2 is in use.

## What the schema enforces

The merge rules were argued out against real buses and one expensive bug. The
schema is shaped so they cannot be broken by accident:

- **A bus is found by fleet number, never by id.** Two devices never seeded from
  the same backup generate different ids for the same bus.
- **The map cannot say a bus is down.** There is no `down`, `on_down_sheet` or
  `down_sheet_ready` column on `buses`, on purpose. The Down Sheet is the source
  of truth for the badge and the map reads it back. This is the bug that stripped
  a badge off a bus whose entry was sitting right there; it is now structurally
  impossible. A test asserts the columns are absent.
- **Defects are rows, not an array on the bus.** Two mechanics logging two faults
  on one bus in one hour is an ordinary Tuesday and both must survive.
- **Categories and issues are stored exactly as written.** The catalog's renames
  are read-time by design; normalizing on the way in would throw away the one
  thing that makes them safe.
- **Nothing is deletable.** No DELETE policy on any table. Removal is setting
  `deleted_at`, which is an ordinary update — so a delete travels as data, and
  can be undone.
- **The older push loses, in the database.** With three devices pushing, no
  client can know whether it holds the newest row, so `keep_newest_write()`
  drops any update whose `updated_at` is older than what is stored. Silently:
  an out-of-order push is normal and the pushing device has nothing useful to do
  about it.

## Sign-in with no internet

**The login never gates the app.** This is the load-bearing rule; get it wrong
and a mechanic in a dead spot cannot see the board.

**No OFFLINE/ONLINE selector.** A switch is a thing somebody leaves in the wrong
position — set to OFFLINE, a week of work quietly stops syncing and nobody
notices; set to ONLINE with no signal, every action stalls on a timeout. The app
detects it instead, and reports rather than asks.

How it actually works, and why this is safe:

1. Signing in exchanges the shared password for an **access token** (about an
   hour) and a **refresh token** (long-lived). The Supabase client stores both on
   the device and restores the session on launch **with no network call at all**.
2. So the device signs in **once, on the shop wifi**. After that it opens
   straight to the Facility Map whether or not there is internet — the same as
   today, because the board is read from LocalStorage, not from Supabase.
3. Sync is a background activity that either succeeds or queues. When it cannot
   reach the server the work is still saved locally and goes up on the next
   connection.
4. The honest indicator is a **status line, not a switch**: "Synced 9:42a" or
   "Offline — 12 changes waiting". Read-only.

Two things to know:

- **Detect with the last request's outcome, not just `navigator.onLine`.** That
  flag only says the wifi is associated. A shop wifi that is up but has no route
  to the internet reports `true`, and a sync built on that flag will insist it is
  online while every push fails.
- **A brand-new device with no internet cannot sign in.** It has nothing to lose
  — it behaves exactly like a fresh offline board does today and picks up the
  shop's data the first time it has wifi. The fix is procedural: **set a new
  phone up on the shop wifi before it goes out on the floor.**

Sign-in belongs in Settings next to the export controls, as a one-time
"CONNECT TO SHOP CLOUD". It must never be a launch screen.

## Flag to Curtis before forty people

A single shared password is fine for three and a real liability at forty:

- It cannot be revoked when somebody leaves without changing it for everyone.
- Changing it does **not** kick existing devices off. Their refresh tokens keep
  working until sessions are explicitly revoked in Supabase. Removing someone
  means revoking sessions, not just changing the password.
- The database has no record of who did what. Initials on the row are the
  mitigation, and they are only as good as the person typing them.

None of this blocks starting. It is the reason attribution is on every row now.

## What is deliberately not synced

Per-device settings — backup reminder interval, default initials, confirmation
preferences, badge view — stay on their device. Syncing them means one person
changing a preference on his phone and silently changing everyone else's.

The recovery snapshot (`pace-board-recovery-v1`) also stays local. It exists to
undo the last bad write on *that* device within seconds; a network round trip is
both slower and less reliable than the thing it protects against.

## Checking the live project

Paste into the Supabase SQL Editor. All read-only. Run each on its own — the
editor shows the result of the last statement only, so two at once loses the
first one's answer.

Shapes, not just names. One row, expecting `ALL 8 TABLES MATCH`:

```sql
with expected(t,n) as (values ('fleet_snapshots',7),('buses',10),('bus_defects',17),('down_sheet_entries',20),('bus_lists',11),('bus_list_entries',14),('bus_list_templates',9),('shop_memory',12)), actual as (select table_name t, count(*) n from information_schema.columns where table_schema='public' group by table_name) select coalesce(string_agg(e.t||': expected '||e.n||' columns, found '||coalesce(a.n,0), '; '), 'ALL 8 TABLES MATCH') as result from expected e left join actual a on a.t=e.t where coalesce(a.n,0) <> e.n;
```

Emptiness, policies and triggers. One row, expecting `0`, `23`, `7`:

```sql
select (select count(*) from buses)+(select count(*) from bus_defects)+(select count(*) from down_sheet_entries)+(select count(*) from bus_lists)+(select count(*) from bus_list_entries)+(select count(*) from bus_list_templates)+(select count(*) from shop_memory)+(select count(*) from fleet_snapshots) as total_rows, (select count(*) from pg_policies where schemaname='public') as policies, (select count(*) from pg_trigger where tgname like '%keep_newest%') as triggers;
```

## First steps for the next session

The database and the client are both done. What is left is turning it on and
watching it, which needs a person.

1. **Create the shop login.** Supabase → Authentication → Users → Add user. One
   email and password for the whole shop, email confirmation off. Nobody outside
   the shop gets it.
2. **Connect the first two devices.** Settings → SHOP CLOUD → CONNECT TO SHOP
   CLOUD, then paste the Project URL and the anon public key (Supabase →
   Settings → API), the sign-in email, and that person's initials. Sign in once
   **on wifi**; after that the device opens the same with no signal.
3. **Watch one bus move between them.** Move a bus on device A, wait for the
   status line to read "Synced", then GET THE SHOP'S COPY on device B. The bus
   should move. Then confirm a bus on the Down Sheet keeps its DS badge on B.
4. **Then run Supabase's own linter** and fix anything it flags.

Only after that is worth doing: syncing Fleet Campaigns and the learned
parts/findings (tables already exist), and live updates if still wanted.

### Things not to undo

- The login does not gate the board, and there is no OFFLINE/ONLINE switch.
  Tests assert both. See "Sign-in with no internet" above for why.
- Push reads LocalStorage, not React state. `writeFleetStorage` refuses writes
  it judges destructive and the map's save effect discards that boolean, so
  pushing from state would upload work the device itself declined to keep.
- Pull builds a transfer-file payload and reuses `mergeFleetMap`,
  `mergeDefectLog` and `mergeDownSheet`. Do not write cloud-specific merge
  rules; two sets that must agree forever will not.
- Connection details are typed into Settings, never baked into the build. A
  client-side `process.env` read that was not inlined throws a ReferenceError
  rather than returning undefined, so an unset build value is a white screen.

Nothing here touches the publishing flow. Codex publishes; Claude does not.
