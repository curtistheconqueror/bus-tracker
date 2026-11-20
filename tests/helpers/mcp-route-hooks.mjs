/* RESOLVE HOOKS so `app/api/mcp/route.ts` can be RUN, not just read.

   The route's own comment says this file "cannot be run without a Worker", and
   for the two things that are genuinely Worker-shaped that is true — but both
   are DYNAMIC imports, so a resolver can put a stub in their place and the rest
   of the route is ordinary code. Three specifiers need answering:

     cloudflare:workers    -> the env stub, so a case can set MCP_TOKEN
     @supabase/supabase-js -> the recording fake, so nothing reaches a network
     @/...                 -> the repo root, which Node does not resolve itself

   This exists because the route's only authentication had no behavioural test:
   deleting the whole check left the suite green. A gate nothing drives is not a
   gate, and this is a security boundary. */
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

const SWAPS = new Map([
  ["cloudflare:workers", path.join(HERE, "mcp-stub-workers.mjs")],
  ["@supabase/supabase-js", path.join(HERE, "mcp-stub-supabase.mjs")],
]);

export async function resolve(specifier, context, nextResolve) {
  const swap = SWAPS.get(specifier);
  if (swap) return { url: pathToFileURL(swap).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    /* The alias is written without an extension, the way tsconfig paths let it
       be. Node resolves neither the alias nor the extension, so both are done
       here; `.ts` first, because that is what `src/lib` is. */
    const base = path.join(REPO, specifier.slice(2));
    const tried = [base, base + ".ts", base + ".tsx", path.join(base, "index.ts")];
    const found = tried.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!found) throw new Error("mcp-route-hooks could not resolve " + specifier + " under " + REPO);
    return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
