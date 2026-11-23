# Publish next

**STATUS: NONE PENDING.** Application release 206 is live as Sites Version 196,
deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`.
It carries releases 198–206. Releases 198–205 had already gone live together
as Sites 195 earlier that day; they were not nine unpublished releases.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 195 / application release 205 at `55812e1829f4a9469e901fb092980f3f86c5e536`.
PR39 MCP remains separately held and unmerged, excluded from this release.
No migration, storage-key rename, runtime environment or audience change.

The preserved queue and device checklist are in
[releases 198–206](archive/PUBLISH_RELEASE_198_206.md).
Publication evidence and limits are in [RELEASES.md](RELEASES.md).

## Remaining device checks

The exact production build passed the placeholder, selected-bus location-pill,
BUS LOCATION modal open/cancel, and unchanged Down Sheet label checks in cloud
Chromium. The live Defect Log placeholder also passed. The fresh live browser
had no device-local fleet, so no bus was added to exercise a live location
pill or populated Down Sheet field. No fleet records were changed.

On a phone with existing fleet data, open + LOG DEFECT: check the empty BUS
wording, select a bus, open its location pill and cancel the BUS LOCATION
window. On Down Sheet + ADD, check `Bus N · Place`. Only move a bus that is
really somewhere else. Physical phone/Safari/Home Screen, touch keyboard and
offline acceptance remain unverified. These are device follow-ups, not a
pending source release.
