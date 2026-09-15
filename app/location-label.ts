import {RELOCATION_AREAS} from "./facility-areas.ts";
import {siteAreaLabels,sitePrefixLabels} from "./site-config.ts";

/* WHERE A BUS IS, in the words a person uses out loud. One copy, because there
   were five — and they had already drifted: the Fixed Repairs copy had no
   entry for OFF PROPERTY at all, so a bus away at a vendor read as the raw
   "offsite-3", and the share export's SHOP WALL prefix was missing its hyphen.

   THE BUG THIS WAS WRITTEN FOR. Every one of those copies matched on the slot
   prefix, so all 84 garage spaces read "Main Garage" — including the two
   trouble bays. Curtis moved a bus to B12 from the Defect Log and the line
   under the bus number still said Main Garage: "it believes that it's in b
   twelve, which is in the main garage, but there is a distinction there."

   There is, and the app already knew it everywhere except here. The MOVE
   editor offers MAIN GARAGE (BAYS 1-10), TROUBLE BAY 11 and TROUBLE BAY 12 as
   three separate destinations, the AI operator is told in so many words that
   "Main Garage means bays 1-10 only; Trouble Bays 11 and 12 remain separate",
   and the map draws a divider down that column. Only the label disagreed, and
   a label that disagrees with the control that set it is worse than a missing
   one — the foreman did the right thing and the screen told him it had not
   taken.

   SO THE SLOT IS RESOLVED THROUGH RELOCATION_AREAS, the same table the move
   editor writes with, rather than through a prefix. That is the whole fix: the
   thing that names a location and the thing that changes it now read from one
   source, and a future section cannot be added to one without appearing in the
   other. */

/* The words, read from `site-config.ts` rather than kept as a second list.
   Issue #21, Phase 1 step 2. This file's own comment already says why one copy
   matters - there were five of these and they had drifted - so holding the
   labels here while the config also held them would have been the same mistake
   one level up. */
const AREA_LABELS:Record<string,string>=siteAreaLabels();

const SLOT_LABELS=new Map<string,string>();
for(const [area,slots] of Object.entries(RELOCATION_AREAS)){
 const label=AREA_LABELS[area];
 if(label)for(const slot of slots)SLOT_LABELS.set(slot,label);
}

/* THE PREFIX TABLE STAYS, as the fallback it always should have been. Not
   every location a bus can hold is a slot in a section: the CNG West overflow
   writes "west-overflow-2", and the East lot's ids skip two of every four
   because that grid is two columns wide inside a four-wide numbering. Those
   are real places a bus sits, and the section they belong to is still obvious
   from the prefix even though no area lists them.

   It is deliberately consulted SECOND. Reversing the two would put the bug
   straight back: "garage-11" starts with "garage-" and would answer Main
   Garage before anything looked at which bay it is. */
const PREFIX_LABELS:[string,string][]=sitePrefixLabels();

/* The label, or "" when this build cannot name the place. Callers that print a
   location into a report use this and leave the line out rather than printing
   a slot id at somebody who has never seen one. */
export function knownLocationLabel(location:string|undefined){
 const at=String(location??"").trim();
 if(!at)return "";
 return SLOT_LABELS.get(at)||PREFIX_LABELS.find(([prefix])=>at.startsWith(prefix))?.[1]||"";
}

/* On screen, an unrecognised slot id is shown as-is rather than swallowed. It
   is ugly and it is honest: the bus is somewhere, this build does not have a
   word for it, and hiding that would read as "no location recorded" for a bus
   that has one. */
export function locationLabel(location:string|undefined,fallback="Location not set"){
 const at=String(location??"").trim();
 return knownLocationLabel(at)||at||fallback;
}
