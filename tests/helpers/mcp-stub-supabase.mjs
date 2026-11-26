/* Stands in for `@supabase/supabase-js`, and RECORDS what the route asks it to
   do. Nothing here reaches a network: if the route ever grew a write, or ever
   tried to sign in before checking the caller's token, that shows up as a call
   recorded on `globalThis.__MCP_TEST_CALLS__` rather than as a request nobody
   sees.

   The read half answers whatever `globalThis.__MCP_TEST_ROWS__` holds, keyed by
   table, so a case can hand the route an empty shop without a database. */
function recorder() {
  globalThis.__MCP_TEST_CALLS__ = globalThis.__MCP_TEST_CALLS__ || [];
  return globalThis.__MCP_TEST_CALLS__;
}

const WRITE_VERBS = ["insert", "update", "upsert", "delete", "rpc"];

/* The real chain is `.from(t).select("*").is(...)[.gt(key,after)].order(key).limit(n)`,
   and it KEYSET-pages until a page comes back empty.

   This has to page for real. A first version served the rows once and empty
   after, with the flag inside this factory — but `readLiveRows` calls
   `client.from(table)` again on every lap, so the flag was reborn each time and
   any NON-EMPTY table looped forever. It passed only because every table in
   these tests was empty. Honouring `gt` is both the fix and the real contract:
   each lap asks for rows after the last key it saw, so the walk ends by itself. */
/* A DEAD SESSION READS NOTHING, WHICHEVER ROWS EXIST. supabase-js does not
   error when a refresh fails — it falls back to the anon key, and RLS then
   returns no rows. So readability has to belong to the CLIENT, not to the
   table: only the client the last successful sign-in produced can see rows.
   Without this the stub served rows to any client, a stale one read fine, and
   "it recovered" was true of a test that never had anything to recover from. */
function live(id) {
  const required = globalThis.__MCP_TEST_LIVE_CLIENT__;
  return required === undefined || required === id;
}

function table(name, id) {
  let after;
  let key = "id";
  const api = {
    select() { recorder().push({ kind: "select", table: name }); return api; },
    is() { return api; },
    gt(column, value) { key = column; after = value; return api; },
    order(column) { key = column; return api; },
    limit(count) {
      const failing = globalThis.__MCP_TEST_FAIL_TABLE__;
      if (failing === name) return Promise.resolve({ data: null, error: { message: "permission denied for table " + name } });
      if (!live(id)) return Promise.resolve({ data: [], error: null });
      const all = ((globalThis.__MCP_TEST_ROWS__ || {})[name] || [])
        .slice()
        .sort((a, b) => (String(a[key]) < String(b[key]) ? -1 : String(a[key]) > String(b[key]) ? 1 : 0));
      const eligible = after === undefined ? all : all.filter((row) => String(row[key]) > String(after));
      return Promise.resolve({ data: eligible.slice(0, count), error: null });
    },
  };
  for (const verb of WRITE_VERBS) {
    api[verb] = (...args) => {
      recorder().push({ kind: verb, table: name, args });
      return api;
    };
  }
  return api;
}

let nextClientId = 0;

export function createClient(url, anonKey) {
  const id = ++nextClientId;
  recorder().push({ kind: "createClient", url, anonKey, id });
  return {
    from: (name) => table(name, id),
    auth: {
      signInWithPassword: async (credentials) => {
        recorder().push({ kind: "signIn", email: credentials && credentials.email, id });
        /* A fresh sign-in is what makes a client the live one — which is how a
           session that could not refresh is recovered, and only that way. */
        if (globalThis.__MCP_TEST_LIVE_CLIENT__ !== undefined) globalThis.__MCP_TEST_LIVE_CLIENT__ = id;
        return { data: { session: { access_token: "stub" } }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
    rpc: (...args) => { recorder().push({ kind: "rpc", args }); return table("rpc"); },
  };
}
