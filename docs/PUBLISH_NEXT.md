# Publish next

**STATUS: PENDING — Sites Version 124 is validated and awaiting publication approval.**

This file always describes the next unpublished release, and it lives at this
exact path on `main` so nobody has to be told where to look. Curtis approves a
release by pointing Codex at this file rather than pasting a summary out of a
chat window.

- **Claude Code** keeps this file current with every push to `main`: the source
  commit, what changed, any migration, and what to check once it is live. Claude
  Code never publishes and never marks a version live.
- **Codex** publishes from here, then in the same follow-up commit updates
  `docs/RELEASES.md` and `PROJECT_HANDOFF.md` and replaces this file with the
  next handoff, or resets it to `STATUS: NONE PENDING`.
- **STATUS: NONE PENDING** means everything on `main` is already live and there
  is nothing to publish. Read the status line before anything else.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` for the lifecycle itself; this file
supplies only what that runbook asks for — the exact source, what changed, and
what to check once it is live.

---

## Source

| Field | Value |
| --- | --- |
| Release source | the current tip of `origin/main` |
| Last code-bearing commit | `925bf91` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 123, `f154686` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 925bf91..origin/main` that
nothing but `docs/` changed after `925bf91`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This was written while Version 123 was being published and was replayed
on top of it rather than merged over it.

Gate: 130 tests passing, ESLint clean, production build succeeds.

## What changed

### Exports go through the share sheet, not a link a phone cannot open

**This fixes a bug that is live right now, reported off a phone.** The Defect Log
export "said blob", and the link shared to an iPad came back **not found**. The
link was `https://<site>/8276995b-…` — a blob URL with the `blob:` scheme
stripped off, which names the bug exactly.

The export built a blob URL, hung it on a detached anchor and clicked it. On a
computer that downloads. On **iOS Safari, and a Home Screen app especially, that
is navigation**: the JSON opens with `blob:https://<site>/<uuid>` in the address
bar — which is what "it's saying blob" looks like from the floor. Sharing that
page then shares the URL rather than the file, and a blob URL is scoped to the
session that created it, so on the receiving device it resolves to a path that
has never existed. **It could never have worked.**

There were four hand-rolled copies of this and only two of them had the share
sheet, which is exactly why EXPORT ALL DATA moved between devices while the
Defect Log report did not. All five exports now use one function:

- the real `File` into `navigator.share`, guarded by `canShare`, because calling
  `share()` with files it will not accept is its own failure
- dismissing the sheet returns cancelled and does **not** fall through to a
  download nobody asked for
- the fallback anchor is placed in the document before it is clicked, which
  Safari has always needed

### The FIXED TODAY tile ran across the whole screen

Reported off an iPad: the tile spanned the screen and had to be held down and
moved out of the way. Not a wrapping problem — the tile's class name was
literally `fixed`, and this project ships Tailwind, whose **`.fixed` utility is
`position:fixed`**. The tile was lifted out of the summary grid and floated
across the viewport on top of the other four.

```
layer "utilities"   .fixed                position:fixed    <- winning
(unlayered)         .log-summary .fixed   position:static   <- only inside
                                                               @media(max-width:760px)
```

The reset that would have stopped it existed, and was even covered by a test,
but it sat in the phone media query — so it only ever protected phones. **Every
iPad and the computer had this**; the computer just hid it better.

Renamed to `fixed-today` rather than fought: a class the framework already owns
will keep winning. With the collision gone the position reset is unnecessary.

Measured after the fix at 1366, 1180, 1024, 820 and 768: five tiles, equal
width, one row, FIXED TODAY in the fifth column. The phone keeps its own design —
two columns with the last tile spanning the final row — but in flow now rather
than floating.

## Migration and data safety

Delivery and layout only. No LocalStorage key, stored record, file format or
payload changed. A file exported by Version 123 imports into Version 124 unchanged, and
the reverse is also true — this changes how a file leaves the device, not what
is in it.

## Validation

- Production build passed
- All 130 regression tests passed, including a new one asserting every export
  uses the shared helper and that none of them builds its own download link or
  blob URL, so a fifth copy cannot appear
- ESLint passed
- Drove the export both ways in a browser. With a share sheet present the file
  reaches it whole — `fleet-defect-log-2026-08-30.json`, `application/json`, 585
  bytes — and **zero blob links are clicked**, so nothing is left to strand on
  another device. With no share sheet the download still happens as before
- Re-ran the two-device transfer checks from Version 123: still unaffected
- Measured the Defect Log summary tiles at 1366, 1180, 1024, 820, 768 and 390:
  before the fix FIXED TODAY was at the full viewport width on the same row as
  the other four at every iPad size; after, all five are equal width in one row

## After it is live

1. **On the phone, press every export button and confirm the share sheet opens
   with a file in it** — EXPORT DEFECT LOG, EXPORT DOWN SHEET, EXPORT FLEET MAP,
   the three REPORT buttons, and EXPORT ALL DATA. If any of them opens a page
   showing raw JSON with `blob:` in the address bar, that one is still broken.
2. Send one of them to the iPad and confirm **it arrives as a file, not a link**.
   A link that opens "not found" means the share sheet was skipped.
3. On the computer, confirm the same buttons still save a file normally.
4. **On the iPad, open the Defect Log** and confirm the five summary tiles —
   ACTIVE DEFECTS, BUSES AFFECTED, IN PROGRESS, DOWNING, FIXED TODAY — sit in one
   row at the same size, and that FIXED TODAY no longer lies across the screen or
   needs moving out of the way. Check the phone still shows it as the full-width
   tile on its own last row.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 124 | Live | <published tip hash> | Every export delivered through the share sheet so a phone sends a real file instead of a blob link that opens "not found" on the receiving device, and the FIXED TODAY tile returned to the summary row instead of floating across the screen |
```
