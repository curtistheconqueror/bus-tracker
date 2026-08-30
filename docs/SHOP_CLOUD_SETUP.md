# Shop Cloud — turning it on

How to connect the shop's devices so bus movements and defects appear on all of
them. Written to be followed in order, once, by one person.

**Nothing here is required.** With the shop cloud switched off, every device
works exactly as it does today. Turning it on adds sharing; it takes nothing
away.

---

## Before you start

You need three things from Supabase, all from the project that already has the
bus-tracker tables in it:

| What | Where to find it |
| --- | --- |
| Project URL | Supabase → Settings → API → **Project URL**. Ends in `.supabase.co` |
| Anon public key | Same page → **Project API keys** → the one labelled `anon` `public` |
| Shop sign-in | You create this in step 1 |

The anon key is meant to live in the app. It is not a password — it opens
nothing on its own. What actually protects the data is the shop sign-in plus the
row-level security already on every table.

---

## Step 1 — Create the one shop login

Supabase → **Authentication** → **Users** → **Add user** → *Create new user*.

- Email: something the shop owns, e.g. `shop@pacesouth.local`. It never
  receives mail.
- Password: pick one and write it down where the shop keeps such things.
- **Turn OFF "Auto Confirm User"?** No — leave auto-confirm **ON**, or the
  account cannot sign in until somebody clicks a link in an inbox that does not
  exist.

That is the whole shop's login. Three people now, forty later.

**Know what you are accepting:** one shared password cannot be taken away from
one person. When somebody leaves, the password changes for everyone — and
changing it does **not** kick existing devices off, because each device holds
its own session. To actually remove a device you revoke sessions in Supabase.
This is why every row records initials: the database cannot tell you who did
what, so the row has to.

---

## Step 2 — Connect the first device (do this one on shop wifi)

On that device: **Facility Map → SETTINGS → SHOP CLOUD → CONNECT TO SHOP CLOUD**

Fill in the six fields:

| Field | What goes in it |
| --- | --- |
| PROJECT URL | The Project URL from Supabase |
| ANON PUBLIC KEY | The anon public key |
| SHOP SIGN-IN EMAIL | The email from step 1 |
| YOUR INITIALS | **Whoever uses this device.** Required — every change this device sends is signed with them |
| THIS DEVICE | A name you would recognise, e.g. "Shop iPad" or "CJ phone" |
| SHOP PASSWORD | The password from step 1. Used to sign in and never stored |

Press **SAVE DETAILS**, then **SIGN IN**.

If a box is wrong, the app says which one and why before it tries. A bad URL,
a truncated key, or missing initials are all caught here rather than as a
failure you cannot act on.

When it works, the status line changes from **Not connected** to **Synced**
followed by a time.

**Sign in on wifi the first time.** After that the device holds its own session
and opens the same with no signal at all.

---

## Step 3 — Send the first device's board up

Press **SEND MY CHANGES**. The count next to it is how many records are waiting.

Give it a moment and the status line should read **Synced** with the time.

Check it landed: Supabase → **Table Editor** → `buses`. You should see one row
per bus, with `updated_by` showing that person's initials.

---

## Step 4 — Connect the second device and pull

Same as step 2 on the second device, with **that person's** initials.

Then press **GET THE SHOP'S COPY**. It asks first, because it changes the board.
It merges — it does not replace:

- A bus both devices know: the shop's copy wins for where it is and its status.
- A bus only this device has: kept, untouched.
- Defects: both devices' defects survive. Nobody's log is cleared by a sync.
- The **DS badge is never touched by a map sync.** The Down Sheet decides who
  is down, and only a Down Sheet sync moves that.

The app reloads when it finishes.

---

## Step 5 — Prove it with one bus

Do this before trusting it with a shift's work:

1. On device A, move a bus to a different space.
2. Wait for A's status line to read **Synced** (or press SEND MY CHANGES).
3. On device B, press **GET THE SHOP'S COPY**.
4. The bus should be in the new space on B.
5. Now check a bus that is on the Down Sheet still shows its **DS** badge on B.

If step 5 fails, stop and say so. That badge rule is the one thing the whole
design is built around.

---

## What it does on its own

Once a device is connected it checks about every 45 seconds, and also whenever
you switch back to the app or the network comes back. It sends only what
changed, so a quiet shop costs one small request that finds nothing.

**Pulling is deliberate.** Nothing arrives on a device without somebody pressing
GET THE SHOP'S COPY. That is on purpose for now: a merge changes the board and
should not happen while a mechanic is looking at it.

---

## Reading the status line

| It says | It means |
| --- | --- |
| **Not connected** | This device is not sharing. It works normally. |
| **Signed out** | Details are saved but the session ended. Sign in again. |
| **Synced 9:42a** | Everything on this device is also on the server. |
| **3 changes waiting** | It has work to send and is trying. |
| **Offline — 12 changes waiting** | It cannot reach the server. **The work is safe on the device** and goes up when it can. |
| **Syncing…** | A send or a merge is running. |

There is no OFFLINE/ONLINE switch and there never will be. A switch is a thing
somebody leaves in the wrong position — set to offline, a week of work quietly
stops syncing and nobody finds out until they need it. The app looks for itself
and tells you what it found.

**Offline is not an error.** A phone in a dead spot, a bus in the back lot, a
dropped wifi — the work is saved on the device the moment it is entered, exactly
as it always has been, and goes up on its own later.

---

## Cellular is the same as wifi

Nothing cares how a device reaches the internet. A mechanic on his own data plan
syncs exactly like one on Pace's wifi. Only changed records are sent, so this is
not a data-plan problem.

(Restricting some people to Pace's wifi only, later, is a server-side rule, not
a rebuild. The initials on every row are what that would key off.)

---

## If something goes wrong

**"That does not look like a Supabase Project URL"** — you pasted the dashboard
address. You want Settings → API → Project URL, ending in `.supabase.co`.

**Sign-in fails with the right password** — the user was created without
auto-confirm. Supabase → Authentication → Users → confirm the user.

**Status stuck on "Offline"** — the device cannot reach Supabase. Nothing is
lost. Check the device has internet at all; a shop wifi that is up but has no
route out looks online to the phone and is not.

**A bus lost its DS badge after a sync** — stop, and say so. That should be
impossible: the `buses` table has no column for down status. Do not work around
it.

**You want a device to stop sharing** — SIGN OUT. Its board stays put and keeps
working. Signing out is local to that device and does not affect anyone else.

---

## What is not shared yet

Fleet Campaigns and the learned parts and findings have tables waiting but are
not synced. The map, the Defect Log and the Down Sheet are.

Per-device settings — themes, colours, backup reminder interval, confirmation
prompts — are deliberately never shared. One person changing a preference on his
phone should not change it on everybody else's.

The local recovery snapshot stays local too. It exists to undo the last bad
write on **that** device within seconds, and a network round trip is both slower
and less reliable than the thing it protects against.
