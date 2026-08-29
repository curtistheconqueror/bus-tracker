# Publish next

**STATUS: NONE PENDING**

Sites Version 120 was published from commit 791b357 on 2026-08-29. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: 791b357
- Last code-bearing commit: fdb1c06
- Current live release: Sites Version 120 at 791b357

## What changed

The Quick Filter previously displayed **Potential No Cabin Heat** in its menu and **No Heat** after selection. Both labels now consistently read **No Heat Buses**. The surge-tank field note uses the same wording.

Curtis explicitly approved automatic validation and live publication for small, clearly scoped wording or catalog corrections. The publishing runbook records that standing rule without extending it to behavioral, storage, backend, or destructive changes.

## Migration and data safety

Display wording only. The stable filter key remains no-cabin-heat; its matching logic, LocalStorage, fleet records, repairs, locations, and user data are unchanged.

## Validation

- Production build passed
- All 121 regression tests passed
- ESLint passed
- git diff --check passed

## After it is live

1. Open QUICK FILTERS and confirm the menu says **No Heat Buses**.
2. Select it and confirm the active filter also says **No Heat Buses**.
3. Confirm it still returns heating-side or both-sides surge-tank defects and Heater / defroster defects, without adding overheating buses.