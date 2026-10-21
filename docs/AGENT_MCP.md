# Plugging an agent into the fleet — Phase 1, read-only

**Open security follow-up:** the reusable URL token has an unresolved
CodeRabbit Major finding. Curtis temporarily accepted it for the initial
single-user read-only connection on 2026-10-21. See
[the risk record, release protections, and closure criteria](MCP_SECURITY_FOLLOWUP.md).
That exception does not approve writes or waive reader isolation and secure
runtime configuration. The record takes precedence over safety claims below.

**Status: BUILT, READ-ONLY. Not configured until the five variables below are
set**, and the two halves fail differently:

- **No `MCP_TOKEN`** — every request, handshake included, answers **503**. There
  is no token to check a caller against, so nothing is served.
- **`MCP_TOKEN` set, the four Shop Cloud variables missing** — the handshake and
  `tools/list` work, and every tool call comes back with a message saying the
  records could not be reached. That half is deliberate; see *Why discovery
  works without credentials*.

So set `MCP_TOKEN` first if you want the curl below to tell you anything.

Curtis asked for this: *"get this MCP ready so that way I can plug in agents to
the site... it can basically navigate its way around the entire platform, log
defects on buses, update logs, locate buses, update down sheets with any photos
as provided to it, find discrepancies and mystery buses as far as what the down
sheet shows and what's actually on the map."* This is the **read** half. The
write half is Phase 2 and is a decision before it is a commit.

---

## What this is, and the one thing it is not

`POST /api/mcp` speaks the Model Context Protocol over JSON-RPC. An agent
connects, discovers five tools, and asks the Shop Cloud questions.

**It does not drive the app.** MCP hands an agent tools, not a browser. An agent
here is a **peer device with no screen** — it reads the same Shop Cloud a phone
syncs with. If you want something that literally taps FOCUS and opens drawers,
that is browser automation against one device, and a different piece of work.

**It cannot see the whole truth, by design.** The records live in each device's
LocalStorage; the Shop Cloud is a copy. So this reads what phones have pushed,
which is why every answer carries `asOf` (the newest moment a phone claims to
have acted) and `fetchedAt` (when the server read the cloud). The gap between
them is how stale the shop's own copy is.

**What never travels is invisible from here, and must stay that way.** A HOLD is
device-local because Curtis chose that — *"if someone is asked to hold a bus
then they should know. It doesn't need to show up on everybody's screen"* — and
so are FULL SWEEP, the roles, the shift hours, PATH TO REPAIR, the repair-hours
ledger and every undo ledger. An agent cannot read or set any of them.

**Fleet Campaigns are not here either.** Their three tables exist in the schema
and no app code syncs them yet (`docs/roadmap/supabase-next.md`, Part 2).

---

## The five tools

| Tool | Answers |
| --- | --- |
| `locate_bus` | Where one bus is, in the words the shop uses, plus its status, whether the Down Sheet has it, and how many defects are open |
| `bus_defects` | Every defect on one bus; open by default, completed on request |
| `down_sheet` | The sheet as the cloud has it, filterable by section and shift |
| `fleet_counts` | Downed, soft downed, the total, on-sheet and inspections — the printed Fleet Status Report's own numbers |
| `discrepancies` | Mystery buses: parked in a working area with nothing on the sheet behind them. Plus Bay 12 awareness |

A bus is addressed by **fleet number** and nothing else. A bus id is
device-local — two devices set up separately give the same bus different ids —
so it would mean nothing to an agent. The match is exact: a tool that guesses
which bus was meant eventually sends somebody to the wrong one.

---

## Setting it up

Five variables, in the Worker environment, the same place `OPENROUTER_API_KEY`
already lives:

| Variable | What it is |
| --- | --- |
| `MCP_TOKEN` | The bearer token an agent presents. Invent a long random one |
| `SUPABASE_URL` | The shop's project URL, same value Settings → SHOP CLOUD holds |
| `SUPABASE_ANON_KEY` | The shop's anon key, same value |
| `SHOP_EMAIL` | The shared shop login's email |
| `SHOP_PASSWORD` | Its password |

`MCP_TOKEN` has no issuer — it is a string you mint (`openssl rand -hex 32`),
set in the Worker environment, and give to a client. Rotating it means changing
it in both places.

Then point an agent at `https://<the site>/api/mcp`, with the token either as an
`Authorization: Bearer` header or as `?token=` on the URL. See *Connecting a
chat session* below for which clients take which.

Check it with a handshake, which needs no cloud at all:

```
curl -s -X POST https://<the site>/api/mcp \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Five tool names back means the endpoint and the token are right. A tool call
then tells you whether the cloud half is.

---

## Connecting a chat session

**One URL connects everything, and a header is the better option where a client
can send one.** Checked against each vendor's current documentation on
2026-10-21 and driven over HTTP against the dev server the same day; the vendor
pages move, so re-check them before concluding something is broken.

### Claude Code — one command

```
claude mcp add --transport http fleetstep \
  https://<the site>/api/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

`/mcp` inside a session shows whether it connected; `claude mcp list` says so
from a shell and names the failure when it did not. `--scope user` makes it
available in every project on that machine, `--scope project` writes a
`.mcp.json` the repository can carry.

A header is the better channel, and this is the one client that can always
send one.

### Everything else — the token rides in the URL

```
https://<the site>/api/mcp?token=<MCP_TOKEN>
```

That one line is the whole configuration for **claude.ai, ChatGPT, Grok, Codex
and Perplexity**, because each of them has a connector form that takes a URL and
nothing else.

**This is not a shortcut, it is the only way in.** claude.ai can attach a header
only where its **Request headers** beta is open to that organization, and
ChatGPT's connector form documents OAuth or no authentication at all. Without
`?token=`, neither can authenticate here and the endpoint is Claude-Code-only.
It is also what every hosted MCP server does — Unusual Whales, whose setup page
this was modelled on, says so in their own troubleshooting: *"For URL-based
clients (Claude connector, ChatGPT, Grok, Codex) the key rides along as
?token=YOUR_KEY."*

**The header wins when both are present**, which is deliberate rather than
incidental: a header does not land in a browser history, a connector's settings
screen or an access log, so the better channel must not be overridable by a
stale URL somebody pasted months ago. Driven over HTTP rather than reasoned
about — a good header with a wrong `?token=` returns the tool list, and a wrong
header with a good `?token=` returns 401.

**And that is the cost, stated rather than discovered.** A URL travels where a
header does not. It is the trade every hosted MCP server has made, it is
affordable here because the surface is read-only, and it is why rotating
`MCP_TOKEN` has to stay a one-line job. It would want re-deciding before any
tool here can write.

#### claude.ai

Customize → Connectors → **Add custom connector**, paste the URL above, **Add**.
Nothing else to fill in. Anthropic also publishes a deep link that pre-fills the
dialog:

```
https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=FLEETSTEP&connectorUrl=<the URL, percent-encoded>
```

It only fills the form — the person still reviews and confirms, and the link
grants nothing by itself. Team and Enterprise owners use
`admin-settings/connectors` in place of `customize/connectors`.

#### ChatGPT

Plugins → **+** → **Add custom MCP server**, the URL above under **Connection**.

One limit here is OpenAI's rather than ours, and no amount of code moves it:
**full MCP custom connectors are Business and Enterprise/Edu, web only.** On Pro
a custom server connects with **read/fetch permissions only** — which is every
tool Phase 1 has, so Pro should be enough today and would stop dead at Phase 2's
writes.

### Why there is no OAuth

It was scoped, and then dropped once `?token=` was measured working. OAuth's job
is to authenticate a **person**, and this app has no login to authenticate one
against — so an OAuth flow here would be a compatibility wrapper issuing tokens
for the same read-only surface, buying nothing the URL does not already buy, at
several times the code. Unusual Whales does run one, on a separate host, purely
so somebody can sign in with their Unusual Whales *account*. There is no
equivalent account here.

That changes if a login ever arrives. Per-person access is the login Curtis has
described as coming with the questionnaire, and the roles in
`src/lib/settings/roles.ts` are waiting on it — this endpoint is not the place
that decision gets made.

---

## The security model, stated plainly

Two layers, and neither is the other's job:

- **An agent authenticates to this route** with `MCP_TOKEN`.
- **The route authenticates to Supabase** with the shop's own login.

So **an agent never holds a database credential.** That is the whole reason to
put a server in the middle: a leaked agent token can do only what the tool list
allows, and the tool list is five read questions.

**Read-only here means there is no write code path, not that a policy forbids
it.** The shop's login *can* write — RLS grants insert and update to anything
authenticated — so the boundary is the absence of code, and a test reads the
route's own source to assert it contains no `.insert(`, `.upsert(`, `.update(`,
`.delete(` or `.rpc(`.

Rotating `MCP_TOKEN` revokes every agent at once. That is coarse, and it is also
exactly what you want in an emergency.

## Why discovery works without credentials

`initialize` and `tools/list` touch no data and succeed whatever state the cloud
is in. An agent that cannot complete a handshake cannot tell its user anything
useful — it just fails to connect. A missing or wrong credential instead
surfaces as a **tool result** saying the records could not be reached, which a
model can read, reason about and report. The same principle as a refused read,
one step earlier.

---

## What Phase 2 would need, and why it is not here

Writes — logging a defect, relocating a bus, adding a sheet row — need two
things that are decisions rather than code:

1. **Per-agent credentials**, so one agent can be revoked without killing the
   rest and so `updated_by` says which bot did it. A small `agent_keys` table:
   purely additive, nothing else references it, near-zero risk.
2. **A scoped Supabase user**, so a leaked agent credential cannot do what a
   mechanic's can. This is the expensive half, and it is expensive for a
   specific reason: RLS permissive policies are combined with **OR**, so the
   existing `using (true)` already covers any new user and you cannot restrict
   an agent by *adding* a policy. Narrowing what forty phones write through is
   the only way, and **a narrowed UPDATE policy returns zero rows and looks like
   success** — the shape of the bug that kept tombstones out of the cloud for a
   week. Rehearse any such change with `./supabase/run-tests.sh` first.

Whatever is chosen, an agent's writes must stamp `updated_by` with something
unmistakable — `AGENT`, or `BOT-DISPATCH` — and never a person's initials.

**Photos into the Down Sheet** is closer than it looks: `app/api/down-sheet-scan/route.ts`
already turns photographs into rows under a strict schema. But a scanned sheet
**replaces** the live one and the undo snapshot is device-local, so an
agent-performed replace would have no undo on anybody's phone. That path should
*propose* and let a person apply, the way `planBackfill` / `applyBackfill`
already do for old sheets.

---

## What was verified

- 34 tests. Mutation-tested every round: each key assertion was checked by
  breaking the code it guards and confirming the test went red.
- The map **cannot** put a bus on the Down Sheet: a bus row whose `map_fields`
  claim `down`, `onDownSheet` and `downSheetReady`, with nothing on the sheet,
  still reads as not on the sheet. The Down Sheet owns that badge.
- A trouble bay is named "Trouble Bay 12", not "Main Garage".
- `asOf` comes off the rows, not off the clock.
- A table larger than one page is read to the end — PostgREST's row cap is
  silent, and a truncated read would have an agent describing part of the shop.
- The walk cannot shift under a phone that writes mid-read. It resumes after
  the last key it actually saw, so a soft delete or an insert behind it loses
  no live row and duplicates none — both of which an offset walk does while
  reporting success. Its two tests mutate the table between pages rather than
  restating the implementation.
- One unreadable table fails the whole board: "nothing is down" because the
  `buses` read was refused is wrong in the worst direction.
- Driven over HTTP against the dev server: handshake, discovery, batching,
  notifications answered with 202 and no body, malformed JSON as `-32700`, an
  unknown method as `-32601`, a wrong bearer as 401, and a tool call with
  unusable credentials degrading to a tool-level error rather than a 500.

**Not verified: a read against the live Supabase project.** It needs the real
credentials, and reading the shop's records is Curtis's to authorise. The
sign-in path does execute — its failure branch was exercised on purpose — but
the first successful read will be the first time that seam runs for real.
