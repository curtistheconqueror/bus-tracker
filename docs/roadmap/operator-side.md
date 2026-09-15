# The operator side — a sixth page

Curtis, 2026-09-15: *"when we start building the operator side of this. It's
gonna look a bit different. They're not gonna have the same interface. When
somebody selects that option they're gonna be sent to an entirely different
interface, but it will be the equivalent of adding a sixth page to what we have
already — it's just that the mechanics can see that sixth page but the drivers
cannot see the other five pages."*

**Not started.** This file exists so the forms survive; the photographs do not
live in this repository and the container they arrived in is thrown away.

---

## The shape

A sixth surface beside the Facility Map, Down Sheet, Defect Log, Fixed Repairs
and Fleet Campaigns — but **asymmetric visibility**, which nothing in the app
does yet:

- a **mechanic** sees all six
- an **operator** sees only the sixth

That is the first thing in this app that is a real permission rather than a
label, and it lands on the question `pace-role-v1` has been parked on since it
was built. The rule there still holds and matters more here than anywhere:

> This key is an unauthenticated string in LocalStorage that anybody holding the
> phone can change from the screen that set it, so it can be the label a login
> confirms and never the thing that decides.

An operator-only view whose gate is a LocalStorage string is not a gate. **The
sixth page needs the login Curtis has already named** — *"the distinction will
be made on a person's own login"* — before its visibility rule means anything.
Building the page first and the gate later is the order that ships a page every
driver can read their way out of.

---

## Form 1 — Pace TRIP CARD  (form 3012, rev 12_23)

Three-part carbonless: **WHITE – Dispatch · BLUE – Operator · MANILLA –
Maintenance.** The manilla copy is the one that reaches the shop, which is the
copy this app would be scanning.

**Header:** Bus No. · Date · `Bus Pre-Trip Check` checkbox · `Accident` checkbox
· a pre-printed serial.

**Damage diagram:** four bus outlines — two side views, a front and a rear —
under *"NOTE any damage on bus"*. Operators circle a spot and write beside it
("yellow paint on bumper", "damage"). Free-form ink on a picture; **not
OCR-able**, and any scanner has to say so rather than quietly drop it.

**IDOT EXPIRATION MONTH:** free text, `MM/YY`.

**CHECK LIST** — *"Check each item below if OK. Do NOT check defective item
below."* So **an unchecked box is the defect**, which is the inverse of how
every other form in this app reads and the single most important thing for a
scanner to get right.

| INSIDE | OUTSIDE |
| --- | --- |
| Steering Wheel - Play | Service Doors Locked |
| Horn | Tires |
| Parking Brake | Wheels, Lugs |
| Front & Rear Door Interlock / Acc. Interlock | Clearance Lights |
| Air Pressure Gauge | Reflectors |
| Low Air Warning | **FRONT** |
| Spring Brake Activation & Hold | Destination Sign/Light |
| Kneeler | Run No. Box |
| Lift/Ramp - Wheelchair Restraints | Headlights |
| **Farebox - Ventra MV/DT** | Turn Signal Lights |
| **Radio - P.A. System - IBS** | License Plate |
| 4-Ways Flasher | Bike Rack |
| Telltale Lights | **SIDES** |
| Heater - Defroster / A.C. | Entrance & Exit Doors |
| Fire Suppression System | Destination Signs/Light |
| Windshield Wiper & Washer | **REAR** |
| Mirrors | Tail Lights |
| Fire Extinguisher - Triangles | Stop Lights |
| All Lights | Turn Signal Lights |
| Windows | License Plate/Lights |
| Seats - Handrails | Destination Sign/Light |
| Hatches/Emergency Exits | |
| Video/Camera System | |
| Passenger Signal/Stop Request Light | |

**LIST DEFECTS BELOW:** three ruled lines of free text.
**Operator's Signature / Badge No.**

### What the sample card shows about real use

Operators **circle checklist items and write beside them** rather than only
using the defect lines — "don't work" against three separate Destination
Sign/Light rows, "keeps rebooting" against Farebox - Ventra MV/DT, "gotta use
force login" against Radio - P.A. System - IBS. **The marginalia carries the
diagnosis and the checkbox only carries that something is wrong.** A scanner
that reads boxes and ignores the handwriting beside them loses the useful half.

**Farebox - Ventra MV/DT and Radio - P.A. System - IBS are line items on the
operator's own checklist.** That is the upstream source of the Farebox / Ventra
/ CUBIC counts already built into the Fleet Status Report — the fault is named
by the driver hours before anybody writes a defect.

---

## Form 2 — IBS Inspection Report  (form 3012, rev 12_23)

Same form number, different card. Filled when the fault is the IBS equipment
itself. **Header:** Vehicle · Date · Run Number · Badge Number.

Four grouped sections, each a list of `CHECK IF APPLIES` boxes — the normal
polarity, unlike the trip card.

| MOBILE DATA TERMINAL | RADIO COMMUNICATIONS | ADVISORY LINE | OTHER EQUIPMENT |
| --- | --- | --- | --- |
| Blank Screen | PRTT/RTT Pending continuous | Resetting Radio | No Internal PA |
| Incorrect Time/Date | Poor Sound Quality | Cycle Wheelchair Constant | No External PA |
| Log-on Failed | Cannot Receive | Constant Off Course | No audio Page Tones |
| Other (comment below) | Cannot Transmit | EEProm Hardware Failure | Sign – Date/Time Incorrect |
| | Other (comment below) | EEProm Invalid Value | Sign – No stop Requested |
| | | Other (comment below) | Sign – Blank |
| | | | No Announcements Internal/External |
| | | | Other (comment below) |

**COMMENTS:** four ruled lines.

Every row here maps onto `Tech Services` in `app/repair-catalog.ts` — the CUBIC
Screen, IBS Screen and Ventra groups. A scanned IBS report is a structured
Tech Services defect with no wording to guess at, which makes it the **easier of
the two forms to build first**.

---

## Notes for whoever builds the scanner

1. **The trip card's polarity is inverted.** Unchecked = defective. Getting this
   backwards produces a bus with thirty defects and no fault at all.
2. **Read the marginalia.** The circles and the words beside them are where the
   diagnosis lives.
3. **The damage diagram is ink on a picture.** Surface it as an image for a
   person, or say it was not read. Never silently drop it.
4. **Badge numbers and signatures are employee-sensitive.** They identify a
   person, and `CLAUDE.md` forbids committing that. Whatever the scanner stores,
   the badge is not it — the operator's identity belongs to the login, not to a
   defect record.
5. **A trip card is a REPORT, not a Down Sheet entry.** It is a driver saying
   something is wrong; the Down Sheet owns what is down, and the DS badge rule
   applies here as everywhere. A scanned card should land in the Defect Log and
   let the sheet stay the sheet.
