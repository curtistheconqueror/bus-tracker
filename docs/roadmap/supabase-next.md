# Supabase next

**Say "Supabase next" and this is the file.** Two separate pieces of work, both
deferred, and they are worth keeping apart because one needs Curtis's permission
and the other does not.

Curtis, 2026-09-14, on the ledger archive: *"Device only. Right now."* The swap
ledger stays in LocalStorage and stays the thing the forecast reads. Nothing
below is started.

---

## Part 1 — the swap ledger archive  (needs a migration, so needs Curtis)

**Why it will be wanted.** `SHEET_LEDGER_LIMIT` is forty swaps and it drops the
OLDEST first. That is correct for tempo — the mix on the sheet in June says
nothing about how fast September clears — and wrong for an archive. The 8/26 to
9/14 baseline, transcribed by hand off photographs, is the first thing out the
door. At the shop's stated eight-or-more sheets a fortnight that is roughly ten
weeks; at one sheet per shift it is under two.

**A NEW TABLE, NOT `shop_memory`.** `CLAUDE.md` used to say this "would need a
schema migration — `shop_memory` is constrained to `kind in ('part','finding')`",
which points at relaxing that constraint. That is the wrong fix:

| | `shop_memory` | a swap |
| --- | --- | --- |
| shape | key to value, with a `uses` counter | an event carrying a row array |
| on conflict | `shop_memory_keep_newest` overwrites | must never be overwritten |
| identity | `unique (kind, memory_key)` | two devices, two swaps, same minute |

Events in a last-write-wins table are events that get eaten. And adding a table
cannot break anything the shop is currently running, where altering a live
constraint can.

**Shape.** Append-only, keyed on the swap id so the existing dedupe rule carries
over unchanged: `id` (the swap id), `at`, `shift`, `rows` jsonb, `off` jsonb,
`gap` boolean, `device_label`, `created_at`. No update path, no delete path —
the same shape as the road-call events and for the same reason.

**The split it buys.** The device keeps its rolling forty; the cloud keeps
everything. The cap stops being a data-loss risk and becomes a working-set size.

**And the seasonal question.** The A/C half of Curtis's "AC and check engine
stay the longest" could not be confirmed off eighteen days in late August — six
A/C spells is not enough to call it either way. A year of swaps would settle it,
and July is when it would show.

---

## Part 2 — the five dormant tables  (no migration, no permission)

`0002_shared_records.sql` is applied and five of its tables have no app code
pointing at them at all:

| table | intent | status |
| --- | --- | --- |
| `bus_lists`, `bus_list_entries`, `bus_list_templates` | Fleet Campaigns | schema only |
| `shop_memory` | learned parts, learned causes | schema only |
| `fleet_snapshots` (`0001`) | whole-board JSON backups | **zero references in `app/`** |

`fleet_snapshots` is the one worth noticing. It was built to answer "if a phone
goes in a puddle, is the work still somewhere", and nothing has ever written a
row to it. The only durable backup path today is MASTER EXPORT to a file.

**This half needs no migration** — the tables are already there. It is app code
only, which makes it the cheaper and safer of the two, and a reasonable thing to
do first whenever it comes up.

---

## What is NOT deferred

The ledger already travels, manually: the **Down Sheet section transfer** carries
it and **MASTER EXPORT** carries it, and a master import MERGES it rather than
replacing. That is a real multi-device path and it works today. What is deferred
is making it automatic and making it permanent.
