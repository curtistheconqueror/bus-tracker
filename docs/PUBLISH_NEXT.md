# Publish next

**STATUS: NONE PENDING**

Sites Version 117 was published from commit `ff62fa3` on 2026-08-28. Replace this file with the next complete pending-release handoff in the same push as the next contribution to `main`.

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
| Last published source | `ff62fa3` |
| Last code-bearing commit | `fde39c2` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Current live | Version 117, `ff62fa3` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. The tip is named rather than hard-coded because this handoff
cannot contain the hash of the commit that adds it; confirm with
`git log --oneline fde39c2..origin/main` that nothing but `docs/` changed after
`fde39c2`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed, so `origin/main` fast-forwards cleanly from Version 116.

Gate: 117 tests passing, ESLint clean, production build succeeds.

## What changed

### NVH added to Suspension and Steering

Noise, vibration and harshness is now the first choice in **Suspension and
Steering**, ahead of the components, because it is the complaint that arrives
before anyone knows which part is at fault — the same reason the dash lights lead
Engine and Transmission.

**One entry, not a dropdown of every combination.** Front, rear, curbside,
roadside, turning, straight and speed would swamp the category, and they are what
the description field is for. So the entry carries a defect note asking for them
at the moment the defect is chosen, which is the only moment somebody still
remembers:

> Say where and when in the description: front or rear, curbside or roadside,
> turning or straight, and at what speed. A vibration at 45 straight and a clunk
> on a left turn are different repairs, and the noise itself is rarely where the
> fault is.

Left to itself, "NVH" is a record nobody can act on later. This is the sixth
entry in the catalog to carry a note; the mechanism shipped in Version 116.

Also in this change: a hardcoded option count in the suspension test was replaced
with a duplicate check. The count broke on this addition and proved nothing about
the category merge it was written for — what that merge had to guarantee is that
no option arrived twice.

### The Down Sheet editor is usable on a phone

Curtis reported that scrolling the editor moved the page behind it, that the touch quality was poor, and that the repairs section sat in its own cramped window. Those were one problem with five causes, all found by measuring the page on a simulated iPhone rather than reading the CSS.

| Fault | Before | After |
| --- | --- | --- |
| Page scrolled behind the open editor | 610px of bleed | none |
| **Defect Log had the same bug** | 2,462px of bleed | none |
| Repairs box width on a 390px phone | 153px (43% of the form) | 318px (90%) |
| Form columns on a phone | 2, never collapsed at any width | 1 below 760px |
| Repairs box height | collapsed to a 20px sliver once widened | renders in full |
| Add Repair button | 34px | 44px |
| Estimate tick | 17px, pinned by an 18px grid track | 22px in a 22px track |

**The scroll lock never worked anywhere.** `<html>` is the scrolling element in this app, and both editors put `overflow:hidden` on `<body>`. The Defect Log has carried that dead rule since it was built. Both now share `app/scroll-lock.ts`, which classes both elements and restores the scroll position on close so a foreman does not lose their place in a long sheet.

**Two latent bugs surfaced on the way.** The repairs box is a `<fieldset>` and the span rule read `label.wide`, so it never spanned. Widening it then collapsed it: a `<fieldset>` with `overflow:hidden` is a scroll container, and a grid item that is a scroll container contributes no height, so the grid gave it a 20px row and clipped 577px of repairs inside. It had only ever rendered because the cell beside it propped the row open. The clipping existed to round the header, so the header rounds itself now.

The phone breakpoint moved from 600px to the 760px the rest of the app uses. 760 stays below an iPad's 768, and both iPad widths were checked: two columns intact, repairs box at 95–96% of the form.

**Not changed:** no path from the Down Sheet to Fixed Repairs, and no fix details captured at completion. That is the next piece of work and is still open.

## Migration and data safety

No storage migration, no LocalStorage key change, and no stored record rewritten.
This is one additive catalog entry, one additive note, and layout-only changes to the Down Sheet editor. Existing defects,
parts associations, filters, locations, Down Sheet records and user data are
untouched, and a Version 116 backup imports unchanged.

## Validation

- Production build passed
- All 117 regression tests passed
- ESLint passed
- Verified in a real browser at phone width: NVH is first in the category, the
  note renders directly under the picker at 436px in a 647px form, and a
  neighbouring entry shows no note

## After it is live

1. Open the Defect Log and choose **Suspension and Steering**.
2. Confirm **NVH (noise, vibration, harshness)** is the first choice.
3. Confirm an amber note appears directly under the picker asking for front or
   rear, turning or straight, and speed.
4. Choose *Air bag* and confirm no note appears — most entries carry none.
5. Open the **Down Sheet** on a phone and tap ADD DOWN BUS. Scroll inside the editor and confirm the page behind it does **not** move. Close it and confirm you are back where you were in the sheet.
6. Confirm the form is a single column, that REPAIRS & ESTIMATES fills the width, and that SPECIFIC REPAIR reads *Select category first* in full rather than being cut off.
7. Do the same in the **Defect Log** editor — its scroll lock was broken too and is now fixed.
8. On an iPad, confirm the Down Sheet editor is still two columns.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 117 | Live | <published tip hash> | NVH added to Suspension and Steering with a defect note asking for the details that make it actionable, and a phone-usable Down Sheet editor: working scroll locks on both editors, a single-column form, and a repairs section that fills the width instead of collapsing |
```
