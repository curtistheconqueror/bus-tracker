-- What the schema is supposed to guarantee, checked against a real Postgres.
--
-- Run against a scratch database with the migrations already applied:
--
--   psql -d scratch -v ON_ERROR_STOP=1 -f supabase/migrations/0001_cloud_backup.sql
--   psql -d scratch -v ON_ERROR_STOP=1 -f supabase/migrations/0002_shared_records.sql
--   psql -d scratch -v ON_ERROR_STOP=1 -f supabase/tests/schema.test.sql
--
-- Every check raises an exception on failure, so a clean run means everything
-- below held. The one piece of actual logic in these migrations is the
-- last-write-wins trigger, and it is the reason this file exists: an
-- out-of-order push silently keeping the older copy is a bug you would not
-- notice for weeks, and would then have to reconstruct from a mechanic saying
-- "I know I fixed that one."

\set ON_ERROR_STOP on
begin;

do $$
declare
  stored_location text;
  stored_synced   timestamptz;
begin
  -- --- a bus arrives -------------------------------------------------------
  insert into buses (fleet_number, location, status, updated_at, updated_by, device_label)
  values ('17549', 'BAY 12', 'shop', '2026-08-30T09:00:00Z', 'CJ', 'CJ phone');

  -- --- a NEWER push wins ---------------------------------------------------
  update buses set location = 'SOUTH LOT', updated_at = '2026-08-30T11:00:00Z', updated_by = 'RM'
   where fleet_number = '17549';
  select location into stored_location from buses where fleet_number = '17549';
  if stored_location <> 'SOUTH LOT' then
    raise exception 'newer write was rejected: location is %', stored_location;
  end if;

  -- --- an OLDER push is dropped, without erroring ---------------------------
  -- The phone that was in a basement all morning. It must not win, and it must
  -- not fail either, because there is nothing useful it could do about it.
  update buses set location = 'WASH RACK', updated_at = '2026-08-30T09:30:00Z', updated_by = 'DL'
   where fleet_number = '17549';
  select location, synced_at into stored_location, stored_synced
    from buses where fleet_number = '17549';
  if stored_location <> 'SOUTH LOT' then
    raise exception 'older write overwrote a newer one: location is %', stored_location;
  end if;

  -- --- an EQUAL timestamp is let through ------------------------------------
  -- Two edits in the same millisecond are simultaneous. Picking a loser by
  -- ceremony would be a lie, so the later arrival lands.
  update buses set location = 'BAY 3', updated_at = '2026-08-30T11:00:00Z', updated_by = 'CJ'
   where fleet_number = '17549';
  select location into stored_location from buses where fleet_number = '17549';
  if stored_location <> 'BAY 3' then
    raise exception 'equal-timestamp write was rejected: location is %', stored_location;
  end if;

  -- --- a device cannot forge the server's arrival time ----------------------
  -- `updated_at` is the device's clock and is trusted, because it is what
  -- last-write-wins compares. `synced_at` is the server's and is not: a device
  -- with a wrong clock, or one replaying an old queue, must not be able to
  -- claim it arrived at a time it did not. The trigger overwrites whatever was
  -- sent.
  --
  -- Note this is transaction time, not wall-clock time, so every row in one
  -- push shares a value. That is deliberate — a client sending fifty rows gets
  -- one arrival stamp for the batch — and it is why this checks the forged
  -- value was replaced rather than that the clock advanced.
  update buses set updated_at = '2026-08-30T12:00:00Z', updated_by = 'CJ',
         synced_at = '2099-01-01T00:00:00Z'
   where fleet_number = '17549';
  select synced_at into stored_synced from buses where fleet_number = '17549';
  if stored_synced <> now() then
    raise exception 'a device forged synced_at: stored %', stored_synced;
  end if;

  raise notice 'last-write-wins: newer wins, older dropped, equal allowed';
  raise notice 'synced_at is the server''s to set, not the device''s';
end;
$$;

do $$
declare
  stored_location text;
  row_count       integer;
begin
  -- --- an UPSERT carrying an older copy must not error ----------------------
  -- This is how the client will actually push: one statement per row, conflict
  -- on the natural key. A device replaying yesterday's queue must be a no-op,
  -- not a failed sync that blocks everything behind it.
  insert into buses (fleet_number, location, status, updated_at, updated_by)
  values ('17549', 'FUEL ISLAND', 'service', '2026-08-30T08:00:00Z', 'DL')
  on conflict (fleet_number) do update
    set location = excluded.location,
        status = excluded.status,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  select location into stored_location from buses where fleet_number = '17549';
  if stored_location <> 'BAY 3' then
    raise exception 'stale upsert overwrote current data: location is %', stored_location;
  end if;

  select count(*) into row_count from buses where fleet_number = '17549';
  if row_count <> 1 then
    raise exception 'upsert duplicated a bus: % rows for 17549', row_count;
  end if;

  raise notice 'stale upsert is a silent no-op, not an error and not a duplicate';
end;
$$;

do $$
declare
  map_columns text;
begin
  -- --- the map cannot say a bus is down ------------------------------------
  -- Not a rule somebody has to remember: there is nowhere to write it. This is
  -- the bug that stripped a Down Sheet badge off a bus whose entry was sitting
  -- right there, and it is prevented here structurally.
  select string_agg(column_name, ', ') into map_columns
    from information_schema.columns
   where table_name = 'buses'
     and column_name in ('down', 'on_down_sheet', 'down_sheet_ready', 'defects');
  if map_columns is not null then
    raise exception 'buses must not carry down-sheet or defect fields, but has: %', map_columns;
  end if;

  raise notice 'buses carries no down-sheet or defect columns';
end;
$$;

do $$
declare
  badged text[];
begin
  -- --- the badge is derived from the Down Sheet and nowhere else ------------
  insert into down_sheet_entries (entry_id, fleet_number, category, repair, updated_at, updated_by)
  values ('entry-1', '17549', 'Engine', 'Overheat shutdown (235-240F)', '2026-08-30T10:00:00Z', 'CJ'),
         ('entry-2', '20505', 'Air Leak', 'Leaking air bag - rear', '2026-08-30T10:05:00Z', 'CJ');

  -- 20505 is on the sheet but has never been pushed to `buses`. It still counts:
  -- the sheet is the authority, so a bus the map has not heard of is still down.
  select array_agg(fleet_number order by fleet_number) into badged
    from down_sheet_entries
   where deleted_at is null and completed_at is null;
  if badged <> array['17549', '20505'] then
    raise exception 'badge query returned %', badged;
  end if;

  -- Completing an entry takes the badge off, without deleting the record.
  update down_sheet_entries
     set completed_at = '2026-08-30T14:00:00Z', updated_at = '2026-08-30T14:00:00Z', updated_by = 'RM'
   where entry_id = 'entry-1';

  select array_agg(fleet_number order by fleet_number) into badged
    from down_sheet_entries
   where deleted_at is null and completed_at is null;
  if badged <> array['20505'] then
    raise exception 'completing an entry did not drop the badge: %', badged;
  end if;

  if not exists (select 1 from down_sheet_entries where entry_id = 'entry-1') then
    raise exception 'completing an entry destroyed the record';
  end if;

  raise notice 'badge follows the Down Sheet; completing keeps the record';
end;
$$;

do $$
declare
  open_defects integer;
begin
  -- --- two mechanics, two defects, same bus, same hour ----------------------
  -- The array-on-the-bus version of this loses one of them. That is the whole
  -- reason defects have their own table.
  insert into bus_defects (defect_id, fleet_number, category, issue, state, updated_at, updated_by)
  values ('defect-a', '17549', 'Engine', 'Engine runs hot (207F+)', 'reported', '2026-08-30T10:00:00Z', 'CJ'),
         ('defect-b', '17549', 'Air Leak', 'Leaking air bag - front C/S', 'reported', '2026-08-30T10:00:00Z', 'RM');

  select count(*) into open_defects
    from bus_defects where fleet_number = '17549' and deleted_at is null;
  if open_defects <> 2 then
    raise exception 'expected both defects to survive, found %', open_defects;
  end if;

  -- --- a category stored under old wording is kept verbatim -----------------
  -- The catalog's renames are read-time by design. Normalizing on the way in
  -- would throw away the one thing that makes them safe.
  insert into bus_defects (defect_id, fleet_number, category, issue, updated_at, updated_by)
  values ('defect-old', '17549', 'System Switches', 'C/S adjuster switch', '2026-08-30T10:00:00Z', 'CJ');

  if not exists (
    select 1 from bus_defects
     where defect_id = 'defect-old' and issue = 'C/S adjuster switch'
  ) then
    raise exception 'the database rewrote a stored defect issue';
  end if;

  raise notice 'defects merge per record and are stored exactly as written';
end;
$$;

do $$
declare
  remaining integer;
begin
  -- --- a campaign three people work at once ---------------------------------
  insert into bus_lists (list_id, name, source, columns, updated_at, updated_by)
  values ('list-1', 'Farebox Bypass', 'Farebox report 8-27-26',
          '["Location","Farebox ID","Last Probed Time","Bypass Alarm"]'::jsonb,
          '2026-08-30T08:00:00Z', 'CJ');

  insert into bus_list_entries (entry_id, list_id, fleet_number, cells, updated_at, updated_by)
  values ('row-1', 'list-1', '17549', '["BAY 12","F-1102","",""]'::jsonb, '2026-08-30T08:00:00Z', 'CJ'),
         ('row-2', 'list-1', '20505', '["SOUTH LOT","F-2231","",""]'::jsonb, '2026-08-30T08:00:00Z', 'CJ'),
         ('row-3', 'list-1', '18220', '["WASH RACK","F-1877","",""]'::jsonb, '2026-08-30T08:00:00Z', 'CJ');

  -- Two people tick two different rows. Both stick.
  update bus_list_entries set done = true, done_by = 'RM', done_at = '2026-08-30T09:00:00Z',
         updated_at = '2026-08-30T09:00:00Z', updated_by = 'RM'
   where entry_id = 'row-1';
  update bus_list_entries set done = true, done_by = 'DL', done_at = '2026-08-30T09:01:00Z',
         updated_at = '2026-08-30T09:01:00Z', updated_by = 'DL'
   where entry_id = 'row-2';

  select count(*) into remaining
    from bus_list_entries where list_id = 'list-1' and done = false and deleted_at is null;
  if remaining <> 1 then
    raise exception 'expected 1 row left on the sweep, found %', remaining;
  end if;

  raise notice 'two people ticking two rows keep both ticks';
end;
$$;

do $$
begin
  -- --- a list cannot be dropped out from under its rows ---------------------
  begin
    delete from bus_lists where list_id = 'list-1';
    raise exception 'deleting a list with rows should have been refused';
  exception when foreign_key_violation then
    null;
  end;

  raise notice 'a campaign with rows cannot be deleted out from under them';
end;
$$;

do $$
declare
  memory_uses integer;
begin
  -- --- learned parts and causes share one table, told apart by kind ---------
  insert into shop_memory (kind, memory_key, category, issue, value, uses, updated_at, updated_by)
  values ('part', 'issue::engine::water pump belt', 'Engine', 'Water pump belt',
          '{"partNumber":"3288790","partName":"Belt, water pump"}'::jsonb, 3,
          '2026-08-30T08:00:00Z', 'CJ');

  -- The same key under the other kind is a different fact, not a conflict.
  insert into shop_memory (kind, memory_key, category, issue, value, uses, updated_at, updated_by)
  values ('finding', 'issue::engine::water pump belt', 'Engine', 'Water pump belt',
          '{"finding":"idler bearing seized"}'::jsonb, 1,
          '2026-08-30T08:00:00Z', 'RM');

  select uses into memory_uses
    from shop_memory where kind = 'part' and memory_key = 'issue::engine::water pump belt';
  if memory_uses <> 3 then
    raise exception 'part memory use count is %', memory_uses;
  end if;

  -- Pushing the same memory again must land on the same row, and the use count
  -- is SUMMED rather than replaced: a count is how often the shop reached for
  -- something, and taking one device's number would discard everyone else's.
  insert into shop_memory (kind, memory_key, category, issue, value, uses, updated_at, updated_by)
  values ('part', 'issue::engine::water pump belt', 'Engine', 'Water pump belt',
          '{"partNumber":"3288790","partName":"Belt, water pump"}'::jsonb, 2,
          '2026-08-30T12:00:00Z', 'DL')
  on conflict (kind, memory_key) do update
    set uses = shop_memory.uses + excluded.uses,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  select uses into memory_uses
    from shop_memory where kind = 'part' and memory_key = 'issue::engine::water pump belt';
  if memory_uses <> 5 then
    raise exception 'use counts should sum to 5 across devices, got %', memory_uses;
  end if;

  raise notice 'memory keys are per kind and use counts sum across devices';
end;
$$;

do $$
begin
  begin
    insert into shop_memory (kind, memory_key, updated_at)
    values ('guess', 'x', now());
    raise exception 'an unknown memory kind should have been refused';
  exception when check_violation then
    null;
  end;

  begin
    insert into buses (fleet_number, status, updated_at)
    values ('99999', 'parked', now());
    raise exception 'an unknown bus status should have been refused';
  exception when check_violation then
    null;
  end;

  raise notice 'unknown kinds and statuses are refused at the column';
end;
$$;

do $$
declare
  writable text;
begin
  -- --- nothing is deletable through the API --------------------------------
  -- Removal is setting deleted_at, which is an ordinary update and therefore
  -- subject to the same last-write-wins rule as any other change. A repair
  -- record is not deleted to tidy up a screen.
  select string_agg(tablename, ', ') into writable
    from pg_policies
   where schemaname = 'public' and cmd = 'DELETE';
  if writable is not null then
    raise exception 'these tables grant DELETE and should not: %', writable;
  end if;

  -- And row level security is actually on, not merely declared.
  select string_agg(relname, ', ') into writable
    from pg_class
   where relnamespace = 'public'::regnamespace
     and relkind = 'r'
     and not relrowsecurity;
  if writable is not null then
    raise exception 'row level security is off on: %', writable;
  end if;

  raise notice 'no DELETE policy anywhere; row level security on every table';
end;
$$;

do $$
declare
  hidden integer;
begin
  -- --- a tombstone hides a row without destroying it ------------------------
  update bus_defects set deleted_at = '2026-08-30T15:00:00Z',
         updated_at = '2026-08-30T15:00:00Z', updated_by = 'CJ'
   where defect_id = 'defect-old';

  select count(*) into hidden
    from bus_defects where fleet_number = '17549' and deleted_at is null;
  if hidden <> 2 then
    raise exception 'expected 2 live defects after a tombstone, found %', hidden;
  end if;

  if not exists (select 1 from bus_defects where defect_id = 'defect-old') then
    raise exception 'a tombstone destroyed the record it was supposed to preserve';
  end if;

  -- And it is undoable, which is the point of a tombstone over a delete.
  update bus_defects set deleted_at = null,
         updated_at = '2026-08-30T15:05:00Z', updated_by = 'CJ'
   where defect_id = 'defect-old';

  select count(*) into hidden
    from bus_defects where fleet_number = '17549' and deleted_at is null;
  if hidden <> 3 then
    raise exception 'clearing a tombstone did not bring the record back: %', hidden;
  end if;

  raise notice 'tombstones hide, preserve, and can be undone';
end;
$$;

rollback;
