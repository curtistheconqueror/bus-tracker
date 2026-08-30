# Publish next

**STATUS: PENDING — Sites Version 122 is validated and approved for publication.**

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only to the existing Sites project and live URL.

## Source

| Field | Value |
| --- | --- |
| Release source | the current tip of `origin/main` |
| Last code-bearing commit | `6a26ef8` |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 121, `8ce3e5b` |

Resolve `origin/main` to a hash at publish time. Everything after `6a26ef8` must be documentation only.

Gate: 122 tests passing, ESLint clean, production build succeeds, and `git diff --check` passes.

## What changed

- **A/C and HVAC** gains **Operator A/C blower** directly under Blower motor.
- **Bus Controls → System Switches** gains **Mirror heater switch** and **C/S adjuster switch**.
- Confirmed air-bag leaks now have one authoritative home under **Air System**: **Leaking air bag - Front C/S**, **Front R/S**, or **Rear**. Those entries retain the AIR BAGS REPLACED count.
- **Bus leaning - C/S** and **Bus leaning - R/S** remain reportable symptoms under **Suspension and Steering**. Their helper note explains that a leaking air bag or leveling valve is a common cause and instructs the mechanic to edit the same defect to the confirmed repair, avoiding duplicates.

## Migration and data safety

No LocalStorage key is renamed and no stored record is rewritten. The duplicate **Front air bag leak** and **Rear air bag leak** Suspension and Steering choices are retired only from new pickers. Existing records with those words, or the older **Air bag** wording, retain their exact saved text and remain editable through the historical-option fallback.

## Validation

- Production build passed
- All 122 regression tests passed
- ESLint passed
- `git diff --check` passed
- Regression coverage verifies both Bus Controls picker structures, exact defect round trips, one Air System home for confirmed air-bag leaks, leaning helper notes, and preservation of historical air-bag wording

## After it is live

1. Confirm **A/C and HVAC** lists **Operator A/C blower** directly under **Blower motor**.
2. Confirm **Bus Controls → System Switches** ends with **Mirror heater switch** and **C/S adjuster switch**.
3. Confirm **Suspension and Steering** retains **Bus leaning - C/S** and **Bus leaning - R/S**, with the diagnostic helper note, but no longer offers separate front/rear air-bag leak choices.
4. Confirm **Air System** offers the three location-specific leaking-air-bag choices and the replacement-count control.

## Publishing constraints

- Do not create a replacement Sites project, change the live URL, or overwrite newer work with an older checkout.
- After deployment, update `README.md`, `docs/RELEASES.md`, and `PROJECT_HANDOFF.md`, then reset this file to `STATUS: NONE PENDING`.

Suggested release row:

```
| 122 | Live | <published tip hash> | Operator A/C blower and mirror switches added; confirmed air-bag repairs consolidated under Air System with counted replacements and leaning-diagnosis guidance |
```