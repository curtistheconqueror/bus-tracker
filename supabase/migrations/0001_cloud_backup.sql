-- Phase 1: a copy of each device's board, off the device.
--
-- This table is deliberately dumb. It stores whole snapshots as JSON and knows
-- nothing about buses or defects, so it cannot corrupt anything, cannot lose a
-- field the app adds next month, and needs no migration when the app's shape
-- changes. It exists to answer one question: if a phone goes in a puddle, is
-- the work still somewhere.
--
-- Push only. Nothing reads these back into the app automatically; restoring is
-- a deliberate act, the same as IMPORT ALL DATA is today.

create table if not exists fleet_snapshots (
  id            uuid primary key default gen_random_uuid(),
  -- Which device this came from. Free text the shop sets once, like
  -- "CJ phone" or "shop iPad", so a restore can be taken from the right one.
  device_label  text not null,
  taken_at      timestamptz not null default now(),
  -- Counts pulled out of the payload so the newest good snapshot can be found
  -- without parsing megabytes of JSON.
  bus_count     integer not null default 0,
  defect_count  integer not null default 0,
  entry_count   integer not null default 0,
  -- The whole EXPORT ALL DATA payload, exactly as the app already writes it.
  payload       jsonb not null
);

create index if not exists fleet_snapshots_recent
  on fleet_snapshots (device_label, taken_at desc);

alter table fleet_snapshots enable row level security;

-- One shared shop login. Anyone signed in may write a snapshot and read them
-- back; nobody may edit or delete one, because a backup somebody can quietly
-- change or remove is not a backup.
--
-- Dropped first so this file can be run again. A migration is re-run exactly
-- when something went wrong the first time, which is the worst moment for it to
-- fail on a name that already exists.
drop policy if exists "shop reads snapshots"  on fleet_snapshots;
create policy "shop reads snapshots"  on fleet_snapshots for select
  to authenticated using (true);
drop policy if exists "shop writes snapshots" on fleet_snapshots;
create policy "shop writes snapshots" on fleet_snapshots for insert
  to authenticated with check (true);
