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

function table(name) {
  const api = {
    select() { recorder().push({ kind: "select", table: name }); return api; },
    order() { return api; },
    gt() { return api; },
    limit() { return api; },
    then(resolve) {
      const rows = (globalThis.__MCP_TEST_ROWS__ || {})[name] || [];
      return Promise.resolve({ data: rows, error: null }).then(resolve);
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

export function createClient(url, anonKey) {
  recorder().push({ kind: "createClient", url, anonKey });
  return {
    from: (name) => table(name),
    auth: {
      signInWithPassword: async (credentials) => {
        recorder().push({ kind: "signIn", email: credentials && credentials.email });
        return { data: { session: { access_token: "stub" } }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
    rpc: (...args) => { recorder().push({ kind: "rpc", args }); return table("rpc"); },
  };
}
