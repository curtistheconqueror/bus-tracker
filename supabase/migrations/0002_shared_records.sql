-- Phase 2: the records themselves, so two devices can meet in the middle.
--
-- Phase 1 (0001) stores whole boards as opaque JSON. That answers "is the work
-- still somewhere" and nothing else: you cannot merge two snapshots, so a phone
-- and an iPad that both worked today still have to pick a winner.
--
-- These tables are the same split the device-to-device transfer already makes,
-- moved server side. Nothing new is invented here. The merge rules that shipped
-- in Versions 123 and 124 were argued out against real buses and one very
-- expensive bug, and they are the rules this schema is shaped to enforce:
--
--   * A bus is found by FLEET NUMBER, never by id. Two devices that were never
--     seeded from the same backup generate different ids for the same bus, and
--     17549 is what a person means when they say 17549.
--   * The MAP does not get to say whether a bus is down. Look for a `down`
--     column below and there isn't one, on purpose — see `buses`.
--   * Incoming wins where two devices describe the same thing; anything only
--     one device has is kept. Nothing is replaced wholesale, ever.
--
-- The app stays offline first. Every one of these tables is a copy of something
-- that already lives on the device and still works with the shop's wifi down.
-- Supabase is where data syncs TO. It is not where the data lives.
--
-- Applies on top of 0001. Safe to run twice.


-- ---------------------------------------------------------------------------
-- Who wrote it
-- ---------------------------------------------------------------------------
-- The shop signs in once, under one login, because three people do not need
-- three passwords. But one login means the database itself cannot tell you who
-- changed a bus, and at forty people that stops being acceptable — a shared
-- password cannot be revoked when somebody leaves, and `auth.uid()` would say
-- the same thing for all forty.
--
-- So attribution rides on the row, from the first day, as the initials the app
-- already collects. Every table below carries the same three columns:
--
--   updated_by     initials, e.g. "CJ" — who did it
--   device_label   which phone or iPad it came off
--   updated_at     when the DEVICE says it happened
--
-- When per-person accounts arrive, they add an `auth.uid()` column beside these
-- and tighten the policies. No table is reshaped and no history is lost, which
-- is the entire reason to carry attribution before it is strictly needed.
--
-- `updated_at` is the device's clock, not the server's, and deliberately has no
-- trigger keeping it current. It is the value last-write-wins compares, so a
-- server-side now() would make every push look like the newest one and the last
-- device to sync would always win regardless of who actually did the work.
-- `synced_at` is the server's clock and answers a different question: when did
-- this reach us.


-- ---------------------------------------------------------------------------
-- Skip the older write, in the database
-- ---------------------------------------------------------------------------
-- Three devices pushing means no client can know whether it holds the newest
-- copy of a row, so the check cannot live in the client. A push carrying an
-- older `updated_at` than what is already stored is dropped here instead.
--
-- Returning NULL from a BEFORE UPDATE skips the row silently. Silent is correct
-- for this: an out-of-order push is normal — a phone that was in a basement all
-- morning is not an error — and the pushing device has nothing useful to do
-- about it. It already has the older copy; it will get the newer one on its next
-- pull.
--
-- Equal timestamps let the write through. Two edits in the same millisecond are
-- effectively simultaneous and picking a loser by ceremony would be a lie.
--
-- The empty search_path is what Supabase's own linter asks for on any function
-- attached to a table. This one names no table and calls only `now()`, so it
-- costs nothing here, but a function that resolves names through a mutable
-- search path is a genuine way to get a trigger pointed at the wrong table
-- later, and the habit is worth keeping.
create or replace function keep_newest_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- buses — the Fleet Map, minus two things it is not allowed to say
-- ---------------------------------------------------------------------------
-- Look for `down`, `onDownSheet` or `downSheetReady` here and you will not find
-- them, and that is the point. The Down Sheet is the source of truth for whether
-- a bus is down: entries get there off a photographed sheet or typed by hand,
-- and the map READS that membership back rather than deciding it.
--
-- A map export carrying those fields already broke this once. A map exported
-- before a bus went on the sheet says down:false, and importing it stripped the
-- badge off a bus whose Down Sheet entry was sitting right there untouched —
-- the map only re-reconciles when entries change, and an import does not change
-- them. The fix in the transfer was to leave the fields out. Here it is stronger
-- than a rule: there is no column to write them to. To move down status, move
-- the Down Sheet.
--
-- `defects` is absent for the same kind of reason — it has its own table, so two
-- mechanics adding different defects to the same bus both keep theirs instead of
-- one overwriting a whole array.
--
-- Location and status get real columns because they are what you filter and
-- count by. Everything else the map holds — the flags, the timestamps, the
-- mechanic and foreman, whatever Curtis asks for next month — rides in
-- `map_fields` verbatim. That tail is not laziness: this record has gained a
-- field nearly every release, and a schema that needs a migration for
-- `bay12Watch` is a schema that will be out of date by the time it is applied.
create table if not exists buses (
  id            uuid primary key default gen_random_uuid(),
  fleet_number  text not null unique,
  location      text not null default '',
  status        text not null default 'unknown',
  -- The rest of the map's fields, exactly as the app writes them. Never the
  -- defect fields and never the down-sheet fields.
  map_fields    jsonb not null default '{}'::jsonb,
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now(),
  constraint buses_status_known check (
    status in ('service','defect','shop','out','decommissioned','unknown')
  )
);

create index if not exists buses_by_location on buses (location) where deleted_at is null;
create index if not exists buses_changed      on buses (updated_at desc);

drop trigger if exists buses_keep_newest on buses;
create trigger buses_keep_newest before update on buses
  for each row execute function keep_newest_write();


-- ---------------------------------------------------------------------------
-- bus_defects — the Defect Log
-- ---------------------------------------------------------------------------
-- One row per defect rather than an array on the bus, because the Defect Log is
-- the most dynamic surface in the app and an array is a merge conflict waiting
-- to happen: two mechanics logging two different faults on the same bus in the
-- same hour is an ordinary Tuesday, and both must survive.
--
-- `defect_id` is the id the app already generates, so a defect pushed twice
-- lands on the same row instead of duplicating.
--
-- The category and issue are stored exactly as the device wrote them, NOT
-- normalized on the way in. The catalog's rename maps are read-time by design —
-- a record saved as `System Switches - C/S adjuster switch` still reads as
-- `Mirror adjuster switch - C/S` without anything on disk being rewritten — and
-- rewriting them here would throw away the one thing that makes those renames
-- safe. The database keeps what was written. The app decides what it means.
create table if not exists bus_defects (
  id            uuid primary key default gen_random_uuid(),
  defect_id     text not null unique,
  fleet_number  text not null,
  category      text not null default '',
  issue         text not null default '',
  -- 'reported' | 'in-progress' | 'completed' and whatever the app adds; left as
  -- free text so a new work state is not a migration.
  state         text not null default '',
  operability   text not null default '',
  details       text not null default '',
  reported_at   timestamptz,
  completed_at  timestamptz,
  completed_by  text not null default '',
  -- Work state stamps, repair and diagnostic hours, part number and name, the
  -- replaced count, the finding, shop notes. Everything the record carries that
  -- is not filtered on.
  detail        jsonb not null default '{}'::jsonb,
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now()
);

create index if not exists bus_defects_by_bus on bus_defects (fleet_number) where deleted_at is null;
create index if not exists bus_defects_open   on bus_defects (state) where deleted_at is null and completed_at is null;
create index if not exists bus_defects_changed on bus_defects (updated_at desc);

drop trigger if exists bus_defects_keep_newest on bus_defects;
create trigger bus_defects_keep_newest before update on bus_defects
  for each row execute function keep_newest_write();


-- ---------------------------------------------------------------------------
-- down_sheet_entries — the Down Sheet, which outranks everything else here
-- ---------------------------------------------------------------------------
-- Curtis put it plainly and it holds up against the code: no matter what is
-- imported or exported first or last, the Down Sheet is the final source of
-- truth for which buses carry the badge, because those entries are uploaded off
-- pictures or typed in by hand. As long as the sheet keeps that authority,
-- everything else falls into place.
--
-- So the badge is derived from these rows and stored nowhere else. A device
-- pulls the sheet, reconciles its own map from it, and the map's own sync never
-- contradicts it because it structurally cannot.
--
-- `fleet_number`, not `bus_id`: entries carry the SENDING device's bus id, which
-- means nothing on the receiving device. Re-pointing by fleet number on arrival
-- is what made the transfer order stop mattering, and the same applies here.
create table if not exists down_sheet_entries (
  id                 uuid primary key default gen_random_uuid(),
  entry_id           text not null unique,
  fleet_number       text not null,
  category           text not null default '',
  repair             text not null default '',
  section            text not null default '',
  workflow           text not null default '',
  shift              text not null default '',
  priority           text not null default 'Routine',
  operational_status text not null default 'unknown',
  assignment_type    text not null default '',
  assigned_to        text not null default '',
  entry_created_at   timestamptz,
  completed_at       timestamptz,
  -- The repair items, the seven-part time estimate, the custom reason, and the
  -- entry's own edit history.
  detail             jsonb not null default '{}'::jsonb,
  deleted_at         timestamptz,
  updated_at         timestamptz not null default now(),
  updated_by         text not null default '',
  device_label       text not null default '',
  synced_at          timestamptz not null default now()
);

-- The badge query: every bus currently on the sheet, in one index scan.
create index if not exists down_sheet_active on down_sheet_entries (fleet_number)
  where deleted_at is null and completed_at is null;
create index if not exists down_sheet_changed on down_sheet_entries (updated_at desc);

drop trigger if exists down_sheet_entries_keep_newest on down_sheet_entries;
create trigger down_sheet_entries_keep_newest before update on down_sheet_entries
  for each row execute function keep_newest_write();


-- ---------------------------------------------------------------------------
-- bus_lists / bus_list_entries — Fleet Campaigns
-- ---------------------------------------------------------------------------
-- A campaign is the one surface where sharing pays off immediately: a farebox
-- sweep is four hundred buses, three people work it at once, and today each of
-- them is ticking off a copy nobody else can see. Rows are their own table so
-- two people ticking two different buses do not overwrite each other.
create table if not exists bus_lists (
  id            uuid primary key default gen_random_uuid(),
  list_id       text not null unique,
  name          text not null default '',
  source        text not null default '',
  -- The list's own column headings, in order. Up to seven; empty means the rows
  -- are free-form notes.
  columns       jsonb not null default '[]'::jsonb,
  list_created_at timestamptz,
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now()
);

create table if not exists bus_list_entries (
  id            uuid primary key default gen_random_uuid(),
  entry_id      text not null unique,
  list_id       text not null references bus_lists (list_id) on delete restrict,
  fleet_number  text not null default '',
  -- One cell per column, in the list's column order. Cells past the current
  -- column count are kept rather than dropped, so narrowing the columns and
  -- widening them again loses nothing.
  cells         jsonb not null default '[]'::jsonb,
  done          boolean not null default false,
  done_at       timestamptz,
  done_by       text not null default '',
  hours         numeric(6,2),
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now()
);

create index if not exists bus_list_entries_by_list on bus_list_entries (list_id) where deleted_at is null;
create index if not exists bus_list_entries_remaining on bus_list_entries (list_id)
  where deleted_at is null and done = false;

-- Templates are shared on purpose: one person works out the columns a report
-- arrives in and the whole shop gets them.
create table if not exists bus_list_templates (
  id            uuid primary key default gen_random_uuid(),
  template_id   text not null unique,
  name          text not null default '',
  columns       jsonb not null default '[]'::jsonb,
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now()
);

drop trigger if exists bus_lists_keep_newest on bus_lists;
create trigger bus_lists_keep_newest before update on bus_lists
  for each row execute function keep_newest_write();
drop trigger if exists bus_list_entries_keep_newest on bus_list_entries;
create trigger bus_list_entries_keep_newest before update on bus_list_entries
  for each row execute function keep_newest_write();
drop trigger if exists bus_list_templates_keep_newest on bus_list_templates;
create trigger bus_list_templates_keep_newest before update on bus_list_templates
  for each row execute function keep_newest_write();


-- ---------------------------------------------------------------------------
-- shop_memory — the learned parts and the learned causes
-- ---------------------------------------------------------------------------
-- Both memories have the same shape — a key, a remembered value, a use count —
-- and both get dramatically better shared. Right now every mechanic teaches his
-- own phone the same part number for the same fault. One table, told apart by
-- `kind`, because two tables that differ only in a column name is one table.
--
-- `memory_key` is the key the app already computes, which runs through the
-- catalog's rename maps first. A mapping learned under a retired category still
-- matches after a restructure.
--
-- `uses` is summed on merge rather than overwritten: a count is how often the
-- SHOP reached for something, and taking the higher of two devices would throw
-- away everybody else's evidence. This is the one field last-write-wins is
-- wrong for, which is why it is called out here and handled by the client that
-- writes it.
create table if not exists shop_memory (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,
  memory_key    text not null,
  category      text not null default '',
  issue         text not null default '',
  -- Parts: the part number and name. Findings: the cause, in the words it was
  -- first written in, since matching already ignores case and spacing.
  value         jsonb not null default '{}'::jsonb,
  uses          integer not null default 1,
  deleted_at    timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default '',
  device_label  text not null default '',
  synced_at     timestamptz not null default now(),
  constraint shop_memory_kind_known check (kind in ('part','finding')),
  constraint shop_memory_unique unique (kind, memory_key)
);

create index if not exists shop_memory_by_issue on shop_memory (kind, category, issue)
  where deleted_at is null;

drop trigger if exists shop_memory_keep_newest on shop_memory;
create trigger shop_memory_keep_newest before update on shop_memory
  for each row execute function keep_newest_write();


-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- One shared shop login. Everyone signed in reads everything and writes
-- everything; nobody outside the shop sees any of it. That is the whole policy
-- today, and it matches how three people in one building actually work.
--
-- Nothing may be DELETEd. Not by anyone, not ever, through this API. Removal is
-- setting `deleted_at`, which is an ordinary update and therefore subject to the
-- same last-write-wins rule as any other change — so a delete propagates as
-- data instead of as an absence, and can be undone by clearing the column. A
-- repair record is not deleted to tidy up the screen; the app has never worked
-- that way and neither does this.
--
-- These policies are the piece to revisit when per-person accounts arrive.
-- Reading stays open to the shop; writing narrows to the person who owns the
-- row, or to a foreman. The tables do not change for that — only what is below.
do $$
declare
  shared_table text;
begin
  foreach shared_table in array array[
    'buses','bus_defects','down_sheet_entries',
    'bus_lists','bus_list_entries','bus_list_templates','shop_memory'
  ] loop
    execute format('alter table %I enable row level security', shared_table);

    execute format('drop policy if exists "shop reads %s" on %I', shared_table, shared_table);
    execute format(
      'create policy "shop reads %s" on %I for select to authenticated using (true)',
      shared_table, shared_table);

    execute format('drop policy if exists "shop writes %s" on %I', shared_table, shared_table);
    execute format(
      'create policy "shop writes %s" on %I for insert to authenticated with check (true)',
      shared_table, shared_table);

    execute format('drop policy if exists "shop edits %s" on %I', shared_table, shared_table);
    execute format(
      'create policy "shop edits %s" on %I for update to authenticated using (true) with check (true)',
      shared_table, shared_table);
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- What is deliberately NOT here
-- ---------------------------------------------------------------------------
-- Per-device settings — the backup reminder interval, default initials, the
-- confirmation preferences, the badge view — stay on the device they belong to.
-- Syncing them would mean one person changing a preference on his phone and
-- silently changing it on everybody else's, which is not sharing, it is
-- interference.
--
-- The recovery snapshot (`pace-board-recovery-v1`) also stays local. It exists
-- to undo the last bad write on THAT device within seconds. Round-tripping it
-- through a network is both slower and less reliable than the thing it protects
-- against.
