# Supabase sync — handoff

Everything a new session needs to pick this up. Read this first; it is short on
purpose.

## Where it stands

| | |
| --- | --- |
| Schema | Written, applied and tested against a real Postgres 16. Nothing has touched Curtis's actual Supabase project. |
| Files | `supabase/migrations/0001_cloud_backup.sql`, `supabase/migrations/0002_shared_records.sql`, `supabase/tests/schema.test.sql`, `supabase/run-tests.sh` |
| Verify | `./supabase/run-tests.sh` — builds a throwaway cluster, applies every migration twice, runs 12 checks. No network, no Supabase account. |
| Blocked on | The Supabase MCP connector. It reports `connected: true` but `enabledInChat: false`, and no Supabase tools appear. Two re-toggles did not fix it. **A fresh session is needed before anything can be applied.** |
| Curtis has | Made a "bus tracker" organization in Supabase. The project itself still needs creating, or its connection details reading. |

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

## First steps for the next session

1. Confirm the Supabase MCP tools are actually available before promising
   anything — check that a Supabase tool appears, not just that the connector
   says "connected".
2. Read the project's connection details. Do not create a second project.
3. Apply `0001` and `0002`, in order. Both are safe to run twice.
4. Run Supabase's own linter and fix anything it flags before writing client
   code.
5. Only then start the client: sign-in in Settings, push on save, status line.
   Pull comes after push is proven.

Nothing here touches the publishing flow. Codex publishes; Claude does not.
