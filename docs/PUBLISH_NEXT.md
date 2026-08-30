# Publish next

**STATUS: PENDING — Sites Version 122 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `95f4c82` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 121, `8ce3e5b` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 95f4c82..origin/main` that
nothing but `docs/` changed after `95f4c82`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This work was written before Versions 119, 120 and 121 landed and was
replayed on top of them rather than merged over them, so nothing published is
disturbed.

Gate: 122 tests passing, ESLint clean, production build succeeds.

## What changed

Three catalog entries, each splitting a choice that could not say which part was
actually being reported.

**A/C and HVAC** gains **Operator A/C blower**, directly under Blower motor. One
entry could not say whether the cabin blower or the driver's own was out, and
those are different parts in different places on the bus.

**Bus Controls** gains **Mirror heater switch** and **C/S adjuster switch**, at
the end of **System Switches** and next to each other so they read as a pair.
The switch belongs here while the mirror itself stays in Lights and Fixtures —
the same split the catalog already makes between the turn signal lamps and the
stalk that works them.

## Migration and data safety

No LocalStorage key renamed, no stored record rewritten, and nothing retired.
This release only adds choices.

Bus Controls is a **grouped** category, which means each entry exists twice:
prefixed in `REPAIR_OPTIONS`, which is what gets stored on a record, and bare in
`REPAIR_OPTION_GROUPS`, which is what the picker draws. An entry added to one and
not the other shows in the picker but stores wrong, or the reverse, and neither
failure is visible by reading the diff. Both new switches are in both structures,
and a test asserts it.

## Validation

- Production build passed
- All 122 regression tests passed, including a round trip proving a defect saved
  under `System Switches - Mirror heater switch` reads back with that exact
  stored name
- ESLint passed
- Verified in a browser at phone width: **Operator A/C blower** renders directly
  under Blower motor; both switches render at the end of the System Switches
  group; saving one produced the record
  `Bus Controls — System Switches - C/S adjuster switch`

## After it is live

1. Confirm **A/C and HVAC** lists **Operator A/C blower** directly under
   **Blower motor**.
2. In **Bus Controls → System Switches**, confirm **Mirror heater switch** and
   **C/S adjuster switch** appear at the end of that group.
3. Save one of the switches to a bus and confirm the record reads
   `Bus Controls — System Switches - Mirror heater switch`. A blank category or
   a bare issue name here means the two Bus Controls structures disagree.

## Open question carried into this release, not resolved by it

Version 121 replaced the vague **Air bag** choice under **Suspension and
Steering** with **Front air bag leak** and **Rear air bag leak**. Version 119 had
already added **Leaking air bag - Front C/S / Front R/S / Rear** under **Air
System**, each carrying an AIR BAGS REPLACED count.

The picker therefore now offers **five** ways to log the same fault across two
categories, and only three of them ask how many bags went on:

```
Suspension and Steering   Front air bag leak            no count field
                          Rear air bag leak             no count field
Air System                Leaking air bag - Front C/S   AIR BAGS REPLACED
                          Leaking air bag - Front R/S   AIR BAGS REPLACED
                          Leaking air bag - Rear        AIR BAGS REPLACED
```

Nothing is broken and no record is at risk — both sets store and read correctly.
But two mechanics logging the same leaking bag will file it in two different
categories, and only one will be asked for the count, so the counts and the
repair history both end up split in half.

**This needs Curtis to choose which category owns air bags.** It is deliberately
left alone until he does, and it should not be resolved as part of publishing.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 122 | Live | <published tip hash> | Operator A/C blower separated from the cabin blower motor, and mirror heater and C/S adjuster switches added to the Bus Controls system switches |
```
