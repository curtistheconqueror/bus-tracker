# Future Phase: Operator-Reported Defects

## Product intent

Create a small, installable operator-facing app that replaces the current three-part paper defect card. An operator reports symptoms observed while driving a bus; one submission becomes three synchronized views: an optional operator receipt, a maintenance review record, and a front-office/management record.

The operator app remains separate from the full facility tracker. Operators do not receive fleet locations, mechanic assignments, internal notes, other operators' reports, or administrative controls.

## Three-copy tear-away interaction

After a successful submission, present three stacked digital copies styled like the existing paper tear-away set:

- Operator Copy
- Maintenance Copy
- Front Office Copy

The operator can swipe the Maintenance and Front Office copies sideways or upward to send them away. The animation is confirmation feedback only: the backend creates all authorized records atomically before the animation begins. A failed submission must not show the copies as sent.

Personal-copy behavior is configurable:

- Basic mode: the operator receives a success receipt and the report does not remain on the device.
- Personal-copy mode: a signed-in operator retains their copy, sees active reports, and moves completed reports into Resolved History.

Reports are resolved or archived, not permanently deleted. This preserves the maintenance and management audit trail while keeping the operator's active list clean.

## Operator submission experience

The Home Screen app allows an operator to:

- enter or scan a fleet number,
- identify themselves through an approved account, badge, or employee identifier,
- record route, run, location, and timestamp when appropriate,
- choose a symptom category,
- describe the symptom in plain language,
- use voice dictation,
- optionally attach photographs,
- indicate whether the bus can continue operating, and
- submit once and receive a clear success receipt.

The form captures symptoms rather than asking an operator to diagnose a mechanical cause. Examples include an unusually bouncy ride, CNG or gas smell, cracked window, seat releasing under braking, failed interlock, unexpected door operation, ramp or kneeler malfunction, warning lights, unusual noise or vibration, smoke, loss of power, and no-start conditions.

The bus-number resolver follows the tracker's safe short-number behavior: a unique two-digit suffix may resolve automatically, while ambiguous suffixes require the complete fleet number.

## Tracker and down-sheet integration

Every submission creates an Operator-Reported Defect record linked to the bus. It appears in an Operator-Reported Defects review inbox, a separate Operator Reports section in the bus editor, the maintenance/down-sheet workflow when accepted, and the front-office/management log.

Maintenance users can acknowledge, review, classify, convert, merge, dismiss, or resolve a report. Converting a report creates one or more structured repair defects while retaining the operator's original wording unchanged. Conversion may also place the bus on the down sheet or change its operational status, subject to role permissions and confirmation.

Suggested workflow states:

- Submitted
- Acknowledged
- Under Review
- Converted to Maintenance Defect
- Duplicate/Merged
- No Defect Found
- Resolved

## Safety handling

Safety-sensitive symptoms require conspicuous escalation. Initial high-priority examples include CNG odor, smoke or fire, brakes, steering, unexpected door operation, interlocks, unsecured seats, and ADA ramp/kneeler failures.

The app preserves the operator's exact statement and directs personnel to existing Pace safety and emergency procedures. AI may suggest category or severity, but it must not silently rewrite the report, make an unreviewed diagnosis, or replace dispatch/maintenance authority.

## Data and permissions

This phase requires the shared backend and cannot rely on device-only browser storage.

Recommended core records include users and roles, buses, operator reports, report attachments, workflow events, structured maintenance defects, down-sheet entries, acknowledgements, and notifications.

Each report retains its identifier, bus identifier, reporter identity, submission time, route/run/location context, original symptom text, selected category, operability observation, safety flag, attachments, workflow status, linked maintenance defects, resolution summary, and complete event history.

Minimum roles:

- Operator: submit and optionally view only their own reports.
- Maintenance: review reports and convert them to repair work.
- Supervisor/Dispatcher: view operational and safety alerts.
- Administrator: manage configuration, permissions, retention, and audits.

## Connectivity and reliability

The operator app supports intermittent connectivity. When offline, it may queue an encrypted local draft and clearly label it Not Yet Submitted. It retries when connectivity returns without producing duplicates. Every submission uses an idempotency key, and the three authorized copies are created in one backend transaction.

## Suggested delivery stages

1. Shared backend foundation, identity, roles, and audit events.
2. Operator submission app with symptom-first reporting and safety escalation.
3. Maintenance review inbox plus bus-editor and down-sheet integration.
4. Optional operator copy, active/resolved history, and three-copy swipe-away interaction.
5. Notifications, offline queueing, attachments, and administrative reporting.
6. AI assistance for categorization, duplicate detection, summarization, and repair suggestions with human confirmation.

## Acceptance principles

- A successful submission appears on authorized maintenance and management screens without re-entry.
- Operators cannot access internal fleet-management information.
- The original report is immutable; corrections and status changes are recorded as events.
- Resolving a maintenance defect updates every linked view without destroying history.
- Safety-critical reports are unmistakable and cannot be silently downgraded by AI.
- Swipe-away animations never imply successful delivery before backend confirmation.
- Refreshes, retries, and intermittent connections cannot create duplicate reports.
