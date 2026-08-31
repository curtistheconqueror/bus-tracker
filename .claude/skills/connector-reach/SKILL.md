---
name: connector-reach
description: Use this whenever a connector or MCP listing comes back empty, short, or missing something the user says is there - list_projects, list_repos, list_organizations, list_files, search results - and especially before telling a user that something is inaccessible, not connected, not authorized, or does not exist. An empty listing is evidence about the listing, not about access. Trigger this for Supabase, GitHub, Google Drive, Slack, or any connector where you are about to say "I cannot see it" or "the connector is pointed somewhere else". Also use it when a user pushes back with "you should be able to access that" or "try a different way" - they are usually right.
---

# Reaching a connector when the listing says you cannot

## The rule

**An enumeration returning nothing tells you the enumeration returned nothing. It does not tell you what you can reach.**

These are three different facts and they get collapsed into one constantly:

1. The resource does not exist.
2. The resource exists and this token cannot touch it.
3. The resource exists, this token *can* touch it, and the listing did not mention it.

The third is common and is the one that gets missed, because the first two are
what an empty list looks like. Saying "I don't have access" when the truth is
(3) wastes the user's time and — worse — teaches them the integration is broken
when it is working.

## Why listings lie

Enumeration and access are separate permissions and separate code paths:

- **Org and project scoping.** A token may enumerate one organization while
  being able to address resources in another.
- **Pagination.** The first page is not the set. A short page is only the end if
  you asked for the next one.
- **Different permission for `list` than for `get`.** Plenty of APIs let you
  fetch by id something they will not include in an index.
- **Filters and defaults.** Archived, paused, private, or non-default-branch
  items are often excluded silently.
- **Eventual consistency.** A resource created minutes ago may not be indexed.

None of these mean "denied". They mean "not listed".

## What to do, in order

Work down this ladder. Stop as soon as something works.

**1. Ask for the identifier.** This is the highest-value move and the most
underused, because it feels like an admission. It is not — it is the fastest
path. The user almost always has it on screen:

- A URL bar. `supabase.com/dashboard/project/<ref>/sql`, `github.com/<owner>/<repo>`,
  `docs.google.com/document/d/<id>`. One screenshot or paste resolves it.
- A settings page showing an ID, ref, or slug.

Ask for the specific string and say what you will do with it.

**2. Address it directly.** Pass the identifier to the tool that takes one —
`get_*`, `execute_*`, or a call with an explicit `project_id` / `repo` / `path`.
Do this **even when the listing did not include it.** That is the whole point.

**3. Widen the query you already ran.** Before concluding anything:
- Ask for other schemas, other scopes, other states (archived, paused, private).
- Request the next page.
- Drop filters you added, including ones you thought were harmless.

**4. Try a sibling tool.** A different endpoint may have different scoping.
`execute_sql` may reach a project `list_projects` omitted. A direct file read may
reach a path that search did not return.

**5. Only now, report.** And report precisely — see below.

## Saying it accurately when you truly cannot reach it

Distinguish what you observed from what you concluded. The difference matters to
someone deciding whether to go re-authorize something:

> `list_projects` returns one project, `keydenza`, and a direct query against
> ref `abc123` fails with *not authorized*. I've tried the ref directly and it's
> refused, so this looks like scope rather than a listing gap.

Not:

> I don't have access to that project.

And never turn a listing gap into a claim about the user's world. "The tables
don't exist" and "I can't see the tables" are different sentences, and only one
of them is supported by an empty result.

## When the user pushes back

If a user says *"you should be able to reach that"* or *"try a different way"*,
treat it as information rather than pressure. They can see their own account and
you cannot. Go back to step 1 and get the identifier. Being wrong here is cheap;
insisting is expensive.

When you do turn out to be wrong, say which specific claim was wrong and why —
"the token could reach it, the listing just didn't enumerate it" — rather than a
general apology. The user needs to know whether to trust the *next* thing you
say about access.

## Before any write, confirm you are in the right place

Reaching further raises the stakes: it becomes possible to write to the wrong
account. Before DDL, a push, a delete, or anything else that changes state,
confirm the target is what you think it is — list the tables, read the repo
name, check the document title. A schema installed into someone's unrelated
project is a worse outcome than an hour of not having access.

## Worked example

A Supabase schema had been applied and verified by the user in the SQL Editor.
`list_projects` returned one project containing an unrelated game's tables;
`list_organizations` returned one org. Direct SQL against that project found
none of the expected tables, across every schema. The conclusion drawn was that
the connector was scoped to a different account and could not reach the real
project — and, explicitly, that "no call I make can reach outside that token's
scope."

That last part was wrong. The user sent a screenshot of the SQL Editor; the URL
contained the project ref. Passing that ref straight to `execute_sql` worked on
the first attempt and returned exactly the expected schema.

The token had access the entire time. Only the enumeration was incomplete. The
cost of the mistake was a long detour and a user being told the backend might be
unfinished when it was already done.

**The check that would have caught it:** having a resource the user says exists
and a listing that omits it is not a contradiction to be argued about — it is a
prompt to ask for the identifier and address it directly.
