# Publish next

**STATUS: PENDING — Sites Version 116 is validated and awaiting publication approval.**

## Source

- Branch: `main`
- Release source: the current tip of `main`
- Previous live release: Sites Version 115 at `d0189f9`

## What changed

### Fleet Campaigns are now included in the full backup

`EXPORT / SHARE BACKUP` previously captured buses, settings, the Down Sheet, and learned parts but omitted `pace-bus-lists-v1` and `pace-bus-list-templates-v1`. Version 116 adds every Fleet Campaign, completed row, initials, timestamp, and billable hour to the full backup so Work Time history is not lost with the lists.

Import restores both campaign keys through the same normalizers used by Fleet Campaigns. Importing an older backup that predates a key leaves the device's existing campaigns in place instead of clearing them.

### Learned causes, remembered under the symptom where they were found

A cause typed into WHAT WAS FOUND is learned under that exact defect issue and offered nowhere else. Diagnose a check-engine light as a throttle-pedal reference-circuit fault, and the next check-engine diagnosis offers it as a chip; a brake defect does not.

- Matching ignores case, spacing, and trailing punctuation.
- The first recorded wording is retained.
- Defect Log and Fixed Repairs both learn and offer causes.
- Each chip can fill the field or be forgotten.
- New storage key `pace-findings-memory-v1`, capped at 600 least-recently-used entries.

Backup payload version 3 becomes version 5: campaigns, campaign templates, and learned causes. Older payloads stay readable.

### Parking-brake knob and rear air valves (added by Claude Code)

Bus Controls → Operating Controls gains four separate yellow parking-brake-knob failures beside the existing red-air-valve choice. Air System gains the treadle valve, R-12 relay valve (C/S rear), and R-14 relay valve (R/S rear). Brakes keeps its separate Parking brake entry for the brake itself.

### Interior body, seating, grab hardware, and stop-request pull cords (added by Codex)

Curtis identified these directly from field photos. Bodywork now has separate curbside and roadside choices for an interior advertising panel / ad card rack that is loose or hanging. It also adds passenger seats that are loose, missing, or damaged; a loose or broken passenger assist handle / hanging strap; and a loose or damaged passenger grab rail / stanchion.

Doors, Ramp and ADA → Stop Request now distinguishes a broken stop-request pull cord / line on the curbside from one on the roadside. Existing chime/tone and general stop-request choices remain unchanged.

### Dash lights named as reported, start faults named as faults

**Engine** now opens with the three reports a driver actually hands in, replacing *Check-engine diagnosis*, which described what the shop does rather than what came in:

- Check engine light
- Stop engine light
- Check engine and stop engine light

**Transmission and Drivetrain** gains *Check transmission light*, which had no entry at all.

**Battery, Starting and Charging**: *Only front start* / *Only rear start* become **Front start INOP** / **Rear start INOP**. Every other entry names the fault rather than the half that still works, and the catalog already reads INOP on the fuel gauge.

> **This rename is crossed, and it matters.** *Only front start* meant the front half worked, so the broken half is the rear one. It migrates to **Rear start INOP**, not Front start INOP. Mapping each old name to the similar-sounding new one would have silently inverted every record already logged. A test holds both directions.

Also in this change: *Stop engine light* leaves the check-engine symptom tick boxes, now that it is an entry of its own and half of the combined entry. The symptom picker follows all three dash-light entries rather than only one, so choosing the combined entry does not drop symptoms already ticked. The Down Sheet time estimate matches all three plus the old wording.

### Amerex told apart as two systems, and the states that down a bus

One faceplate, two systems that fail very differently. **Fire Suppression** is four heat sensors at the rear where the CNG lines run; it fires on its own with no operator input, so FIRE means the bottles have already gone off. **Gas Concentration** watches for escaping gas: amber Trace keeps running, red Significant normally puts the bus down.

Fire Suppression gains three entries, keeping the existing Mod codes so records logged under them still read:

- FIRE alarm (system discharged)
- Heat sensor communication fault
- Control head no power

Gas Concentration keeps the panel's own wording — a mechanic reads the faceplate, so the list says what the faceplate says.

**The picker now sets bus availability from the fault.** *Gas Concentration - Significant Leak* and *Fire Suppression - FIRE alarm (system discharged)* start on **Remove From Service**; Trace and a sensor fault stay on May Stay In Service. `defaultDefectOperability` grew from one hard-coded pair to a table now that it answers this for more than one category.

### A CNG group under Amerex

Every bus on the property runs compressed natural gas, so the gas equipment now sits beside the panel that watches it. The Gas Concentration side is already half a CNG system — it exists to smell escaping gas — and one place to look for anything gas beats scattering it through Fuel Delivery.

Amerex now has three groups: **Fire Suppression**, **Gas Concentration**, **CNG**. The CNG group holds:

- Check CNG valves light
- PRD cap missing
- PRD leaking — starts as **Remove From Service**
- Other CNG defect

### Defect notes: what the entry does not say on its own

A missing PRD cap is not a cap to replace. It is a reason to test for a leak, because gas may have been venting past it. The editor now shows a short amber note directly under the defect just chosen, so that reaches whoever is standing at the bus rather than living in one person's head.

Deliberately rare — five entries carry one. A note on every entry is a wall of text nobody reads, which is worse than none. These are the few where the obvious repair is not the whole job, or where what looks like a fix is really a way of moving the bus:

| Entry | What the note says |
| --- | --- |
| CNG - PRD cap missing | Fit a balloon over the vent and watch whether it inflates; if it does, log *PRD leaking* as well |
| CNG - PRD leaking | Confirmed gas escaping from a pressure relief device |
| Gas Concentration - Significant Leak | Holding Relay Reset moves the bus under its own power, it does not clear the fault |
| Gas Concentration - Trace | Amber: the system can smell something and the bus keeps running |
| Fire Suppression - FIRE alarm | The bottles have already gone off; the bus does not move until recharged and inspected |

Notes are looked up through the same catalog migration as everything else, so one written for an entry that is later renamed does not quietly stop appearing.

*Check CNG valves light* moves out of Fuel Delivery, where it sat for exactly one unpublished release, so no migration is needed and no record can exist under that identity.

The Amerex group placeholder named its two systems in a literal string, which a third group would have turned into a lie. It reads the group names now.

## Migration and data safety

No LocalStorage key is renamed and no stored record is rewritten. The catalog renames are read-time only, through the same `migrateRepairIdentity` path the earlier category merges use: an existing *Only front start* record opens as *Rear start INOP*, and an existing *Check-engine diagnosis* record as *Check engine light*, without either being written back. Both were confirmed in a browser against seeded old records. Backup export/import expands backward-compatibly to payload version 5, while all repair choices are additive catalog entries. Existing version 3 backups and all stored repair records remain readable.

## Validation

- Production build passed
- All 116 regression tests passed
- ESLint passed
- `git diff --check` passed

## After it is live

1. Export a full backup and confirm version 5 contains `busLists`, `busListTemplates`, and `findingsMemory`.
2. Verify an import round trip restores a campaign with its initials and hours.
3. Save a cause under one check-engine diagnosis and confirm it appears as a chip on another check-engine diagnosis.
4. Open a brake defect and confirm the learned check-engine cause does not appear.
5. Confirm the Engine quick-select list remains unchanged.
6. Under Bus Controls, confirm four Parking brake knob choices follow Red air valve hard to turn.
7. Under Air System, confirm the treadle valve plus R-12 C/S and R-14 R/S relay valves.
8. Under Bodywork, confirm advertising-panel choices for C/S and R/S plus the passenger-seat and grab-hardware choices.
9. Under Doors, Ramp and ADA → Stop Request, confirm broken pull-cord / line choices for curbside and roadside.

Claude browser-verified the learned-cause, parking-brake-knob, and air-valve flows before pushing them. The field-photo additions are covered by the shared catalog regression tests and remain for live verification after publication.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only after Curtis explicitly approves the release, including the shorthand **publishing approved**.

### Checks added by the catalog wording changes

8. Under **Engine**, confirm the first three choices are *Check engine light*, *Stop engine light*, *Check engine and stop engine light*, and that picking any of the three still offers the Misfire / Loss of power symptom boxes.
9. Under **Transmission and Drivetrain**, confirm *Check transmission light* is first.
10. Under **Battery, Starting and Charging**, confirm *Front start INOP* and *Rear start INOP*, with no *Only ...* entries left.
11. Open any bus that already had an *Only front start* defect and confirm it now reads **Rear start INOP**. If it reads *Front start INOP*, the migration is inverted and the release must be pulled.

### Checks added by the Amerex work

12. Under **Amerex**, confirm Fire Suppression lists FIRE alarm (system discharged), Heat sensor communication fault, both Mod codes, Control head no power and Other.
13. Choose *Gas Concentration - Significant Leak* and confirm BUS AVAILABILITY reads **Remove From Service** without touching it. Choose *Trace* and confirm it reads May Stay In Service. All four combinations were confirmed in a browser before the change was pushed.
14. Under **Amerex**, confirm three groups: Fire Suppression, Gas Concentration and **CNG**, and that the group prompt reads "Choose Fire Suppression, Gas Concentration or CNG" rather than naming only two.
15. Under Amerex → CNG, confirm *Check CNG valves light*, *PRD cap missing*, *PRD leaking* and *Other CNG defect*, and that Fuel Delivery no longer lists a CNG entry.
16. Choose *CNG - PRD cap missing* and confirm an amber note appears directly under the picker telling you to fit a balloon over the vent. Choose *CNG - PRD leaking* and confirm BUS AVAILABILITY reads **Remove From Service**. Choose a Mod code and confirm no note appears — most entries carry none.
