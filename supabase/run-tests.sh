#!/usr/bin/env bash
# Apply the migrations to a throwaway Postgres and run the schema checks.
#
#   supabase/run-tests.sh
#
# Touches nothing on Supabase. It builds a scratch cluster in a temp directory,
# applies every migration twice (a migration gets re-run exactly when something
# went wrong the first time, which is the worst moment for it to fail on a name
# that already exists), runs supabase/tests/schema.test.sql, and throws the
# cluster away.
set -euo pipefail

cd "$(dirname "$0")/.."

PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
[ -n "$PGBIN" ] && PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "no local postgres; install postgresql to run these"; exit 1; }

WORK=$(mktemp -d)
PGDATA="$WORK/data"
PORT=${PGPORT_TEST:-55432}
# initdb refuses to run as root, so drop to the postgres account when we are it.
AS_PG=""
if [ "$(id -u)" = "0" ]; then
  id -u postgres >/dev/null 2>&1 || useradd -m postgres
  chown -R postgres "$WORK"
  AS_PG="su postgres -c"
fi
run(){ if [ -n "$AS_PG" ]; then su postgres -c "PATH=$PATH $*"; else eval "$*"; fi; }

cleanup(){ run "pg_ctl -D $PGDATA -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

run "initdb -D $PGDATA -A trust -U postgres" >"$WORK/initdb.log" 2>&1
run "pg_ctl -D $PGDATA -o '-k $WORK -p $PORT -c listen_addresses=' -l $WORK/pg.log start -w" >/dev/null

PSQL="psql -h $WORK -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
# Supabase grants to this role; a plain cluster has never heard of it.
$PSQL -c "create role authenticated nologin" >/dev/null
$PSQL -c "create database bus_tracker_test" >/dev/null
DB="$PSQL -d bus_tracker_test"

for pass in first second; do
  for file in supabase/migrations/*.sql; do
    if ! $DB -f "$file" >"$WORK/out.log" 2>&1; then
      echo "FAILED ($pass apply): $file"; grep -i "^ERROR" "$WORK/out.log" || cat "$WORK/out.log"; exit 1
    fi
  done
  echo "migrations applied ($pass pass)"
done

if $DB -f supabase/tests/schema.test.sql 2>&1 | sed 's/^psql:[^ ]* //'; then
  echo "schema checks passed"
else
  echo "schema checks FAILED"; exit 1
fi
