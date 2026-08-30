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
| Last code-bearing commit | `2c4838f` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 123, `f154686` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 2c4838f..origin/main` that
nothing but `docs/` changed after `2c4838f`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This was written while Version 123 was being published and was replayed
on top of it rather than merged over it.

Gate: 129 tests passing, ESLint clean, production build succeeds.

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

## Migration and data safety

Delivery only. No LocalStorage key, stored record, file format or payload
changed. A file exported by Version 123 imports into Version 124 unchanged, and
the reverse is also true — this changes how a file leaves the device, not what
is in it.

## Validation

- Production build passed
- All 129 regression tests passed, including a new one asserting every export
  uses the shared helper and that none of them builds its own download link or
  blob URL, so a fifth copy cannot appear
- ESLint passed
- Drove the export both ways in a browser. With a share sheet present the file
  reaches it whole — `fleet-defect-log-2026-08-30.json`, `application/json`, 585
  bytes — and **zero blob links are clicked**, so nothing is left to strand on
  another device. With no share sheet the download still happens as before
- Re-ran the two-device transfer checks from Version 123: still unaffected

## After it is live

1. **On the phone, press every export button and confirm the share sheet opens
   with a file in it** — EXPORT DEFECT LOG, EXPORT DOWN SHEET, EXPORT FLEET MAP,
   the three REPORT buttons, and EXPORT ALL DATA. If any of them opens a page
   showing raw JSON with `blob:` in the address bar, that one is still broken.
2. Send one of them to the iPad and confirm **it arrives as a file, not a link**.
   A link that opens "not found" means the share sheet was skipped.
3. On the computer, confirm the same buttons still save a file normally.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 124 | Live | <published tip hash> | Every export delivered through the share sheet so a phone sends a real file instead of a blob link that opens "not found" on the receiving device |
```
