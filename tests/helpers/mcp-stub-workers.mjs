/* Stands in for `cloudflare:workers`, which only exists inside a Worker.

   The route reads its configuration from this module's `env`, so this is the
   one thing between "the auth gate has no test" and a test that drives it. The
   values come off `globalThis` rather than being baked in, because each case
   needs a different environment — a good token, no token at all — and a module
   is loaded once per process. */
export const env = new Proxy(
  {},
  {
    get(_target, name) {
      const supplied = globalThis.__MCP_TEST_ENV__ || {};
      return supplied[name];
    },
    has(_target, name) {
      const supplied = globalThis.__MCP_TEST_ENV__ || {};
      return name in supplied;
    },
  },
);
