# Security

## Reporting a vulnerability

Report privately, not in a public issue. Open a draft security advisory through
GitHub's **Security → Report a vulnerability** on this repository, or contact
the repository owner, [@curtistheconqueror](https://github.com/curtistheconqueror),
directly.

Include what you found, how to reproduce it, and what an attacker could reach
with it. Please do not include real fleet data, photographs of Down Sheets, or
anything with an employee's name on it — describe the shape of the problem
instead.

This is a single-garage application maintained by one working foreman. Expect a
human answer rather than a service-level agreement, and expect it to be read
between shifts.

## What is and is not a secret here

**The Supabase anon key is public by design, and publishing it is not a
vulnerability.** It is a browser key: it ships inside every client that talks to
the Shop Cloud, and it identifies the project rather than the person. What
protects the shop's records is **Row Level Security** on the Supabase side —
every table is policy-guarded and the anon key reaches only what those policies
allow. A finding that the anon key is visible is not a report; a finding that a
policy lets it reach something it should not is, and is worth sending.

The service role key is a different thing entirely and is never in this
repository, never in a client bundle, and never in a build artifact. The
Supabase project ref is deliberately not written down here either.

**No credentials live in this repository.** Not API keys, not runtime
credentials, not Sites credentials, not `.env` files — those are ignored and
stay on the machine that needs them. If you find something that looks like a
live credential in the tree or in its history, report it through the channel
above rather than opening an issue, and say where it is rather than pasting the
value.

## What the app stores, and where

The app is offline-first. The fleet, the Down Sheet, the Defect Log and every
per-device setting live in that device's **LocalStorage** and work with the
garage wifi down. The Shop Cloud is a copy going somewhere else; it is never
where the data lives.

That means a lost or shared phone is the realistic exposure, not the network.
Nothing in LocalStorage is encrypted, and it is readable by anything with access
to that browser profile. The records are maintenance records — bus numbers,
locations, repairs and the initials of whoever entered them.

Some things deliberately never leave the device: a HOLD on a bus, a FULL SWEEP,
the shift hours, and every view-state key. That is a privacy decision as much as
a sync one, and it is documented in `CLAUDE.md`.

## Scope

In scope: this repository, the client application, the API routes under
`app/api/`, the Cloudflare worker, and the Supabase schema and policies under
`supabase/`.

Out of scope: the hosting provider's own infrastructure, and any report whose
only content is that the anon key is visible.
