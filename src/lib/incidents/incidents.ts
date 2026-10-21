/* INCIDENTS: what happened to a person, in a place, at a time.

   WHY THIS IS NOT A DEFECT, which is the whole reason it is a separate surface.
   A defect is about a BUS — it is attached to a fleet number, it is repaired,
   and it leaves when the repair is done. An incident is about a PLACE and a
   MOMENT. Curtis slipped on oil in the shop at night; no bus was involved, no
   bus number would have been honest, and filing it against one would have put
   a safety record into a maintenance history where nobody would look for it
   again. Curtis, on being asked whether it belonged in the Defect Log:
   "you're right it doesn't belong in defect".

   THE ONLY REQUIRED FIELD IS WHAT HAPPENED. Curtis asked for it in those words
   — "don't make any of the fields except for the ones that matter mandatory to
   save the incident" — and it is the right rule for a reason beyond
   convenience. The incident most worth having is filed by somebody who is
   shaken, sore, or halfway out the door at the end of a shift. A form that
   refuses to save because the witness box is empty does not collect a better
   report; it collects no report. Everything else here is optional, and an
   incident with four words in it still counts.

   The time it HAPPENED defaults to now and is editable, because plenty of these
   get written up an hour later or the next morning. The time it was FILED is
   stamped once and never moves, so the gap between the two is visible — that
   gap is itself a fact about how a report came to exist.

   IT IS DEVICE-LOCAL AND DOES NOT SYNC. Curtis chose that, for the reason a
   HOLD is device-local: an incident names a person and an injury, and this app
   has no login, so a synced incident would put "who got hurt and how" on every
   phone in the shop with nothing deciding who may read it. Sharing one is a
   deliberate act — an export, or telling a supervisor, which is the real
   reporting path anyway and which this never replaces.

   THE SHIFT IS RESOLVED ONCE AND STORED, never recomputed from the stamp. Same
   rule the swap ledger follows: if somebody edits the shift hours in six weeks,
   the shift an incident happened on must not silently move to a different crew.
   What shift it WAS is a fact about that night. */

import {shiftAt,type ShiftKey,type ShiftSettings} from "../settings/shift-clock.ts";

export const INCIDENTS_STORAGE_KEY="pace-incidents-v1";
export const INCIDENTS_STORAGE_VERSION=1;

/* What happened, in the categories a bus garage actually produces.

   NEAR MISS is on the list deliberately and is the one worth having most. It
   is the incident with no injury to force the paperwork, so it is the one that
   never gets written down — and it is the only kind that reports a hazard
   while there is still time to fix it for free. Curtis filed tonight's as a
   real fall; the version of tonight where he caught himself is the one this
   list has to make easy to record. */
export const INCIDENT_KINDS=[
 {key:"slip",label:"Slip, trip or fall"},
 {key:"struck",label:"Struck by or against something"},
 {key:"caught",label:"Caught in or between"},
 {key:"strain",label:"Lifting or strain"},
 {key:"burn",label:"Burn, fume or chemical exposure"},
 {key:"vehicle",label:"Vehicle contact or movement"},
 {key:"equipment",label:"Tool or equipment failure"},
 {key:"fire",label:"Fire or smoke"},
 {key:"near-miss",label:"Near miss — nobody hurt"},
 {key:"other",label:"Something else"},
] as const;

export type IncidentKind=(typeof INCIDENT_KINDS)[number]["key"];

/* Whether anybody sought care, which is the single field a supervisor asks
   about first and the one most likely to be left blank in a hurry. "" means
   not answered and is NOT the same as "none" — a blank box is a question
   nobody asked, and reading it as "no treatment needed" would be the app
   inventing a medical fact. */
export const CARE_LEVELS=[
 {key:"",label:"Not recorded"},
 {key:"none",label:"No care needed"},
 {key:"first-aid",label:"First aid on site"},
 {key:"clinic",label:"Clinic or urgent care"},
 {key:"hospital",label:"Hospital"},
 {key:"refused",label:"Care offered and declined"},
] as const;

export type CareLevel=(typeof CARE_LEVELS)[number]["key"];

export type Incident={
 id:string;
 /* When it HAPPENED. Defaults to now, editable, because reports get written
    after the fact. */
 at:string;
 /* When it was RECORDED. Stamped once, never editable, never moved by an edit. */
 filedAt:string;
 kind:IncidentKind;
 /* The one required field. */
 what:string;
 /* An area name from site-config, never a free-typed place and never a slot
    prefix — see location-label.ts for what prefix matching costs. "" is fine. */
 area:string;
 /* A FLEET NUMBER, never a bus id. Ids are device-local — section-transfer.ts
    says so in its own words — so an id here would mean nothing on the next
    phone, and this record never travels through a path that re-points it. */
 busNumber:string;
 people:string;
 injury:string;
 care:CareLevel;
 witnesses:string;
 reportedTo:string;
 followUp:string;
 /* Resolved once from the shift clock at filing time and then left alone. */
 shift:ShiftKey|null;
 /* Edits keep the record; they do not create a second one. An incident is a
    statement about one event, and a correction is still that same event. */
 editedAt?:string;
};

function text(value:unknown){return typeof value==="string"?value.trim():""}

function stamp(value:unknown,fallback:string){
 const raw=text(value);
 if(!raw)return fallback;
 const parsed=new Date(raw);
 return Number.isNaN(parsed.getTime())?fallback:parsed.toISOString();
}

function kindOf(value:unknown):IncidentKind{
 const raw=text(value);
 return INCIDENT_KINDS.some(kind=>kind.key===raw)?raw as IncidentKind:"other";
}

function careOf(value:unknown):CareLevel{
 const raw=text(value);
 return CARE_LEVELS.some(level=>level.key===raw)?raw as CareLevel:"";
}

/* A random tail, for the reason the swap ledger's ids carry one: two devices
   filing in the same millisecond must not mint the same id, because a MASTER
   IMPORT that merged them would silently keep one and drop the other. */
export function incidentId(now=new Date()){
 return "inc-"+now.getTime().toString(36)+"-"+Math.random().toString(36).slice(2,8);
}

export function normalizeIncident(value:unknown,now=new Date().toISOString()):Incident|null{
 if(!value||typeof value!=="object")return null;
 const raw=value as Record<string,unknown>;
 const what=text(raw.what);
 /* A record with nothing written in it is not an incident. This is the only
    thing that can disqualify one. */
 if(!what)return null;
 const filedAt=stamp(raw.filedAt,now);
 const incident:Incident={
  id:text(raw.id)||incidentId(new Date(filedAt)),
  at:stamp(raw.at,filedAt),
  filedAt,
  kind:kindOf(raw.kind),
  what,
  area:text(raw.area),
  busNumber:text(raw.busNumber),
  people:text(raw.people),
  injury:text(raw.injury),
  care:careOf(raw.care),
  witnesses:text(raw.witnesses),
  reportedTo:text(raw.reportedTo),
  followUp:text(raw.followUp),
  shift:raw.shift==="1st"||raw.shift==="2nd"||raw.shift==="3rd"?raw.shift:null,
 };
 const editedAt=text(raw.editedAt);
 /* `delete` rather than `undefined`, the spelling setBusHold uses, so
    `"editedAt" in incident` answers honestly. */
 if(editedAt)incident.editedAt=stamp(editedAt,filedAt);
 return incident;
}

/* Newest first: the reason anybody opens this page is the thing that just
   happened. Sorted on READ so a hand-edited or imported file lands in order
   without anything being rewritten on disk. */
export function sortIncidents(incidents:Incident[]){
 return [...incidents].sort((a,b)=>b.at.localeCompare(a.at));
}

export function readIncidents(storage:Pick<Storage,"getItem">,now=new Date().toISOString()):Incident[]{
 try{
  const raw=storage.getItem(INCIDENTS_STORAGE_KEY);
  if(!raw)return [];
  const parsed=JSON.parse(raw) as {incidents?:unknown};
  const list=Array.isArray(parsed?.incidents)?parsed.incidents:[];
  const seen=new Set<string>();
  const incidents:Incident[]=[];
  for(const entry of list){
   const incident=normalizeIncident(entry,now);
   /* Deduped by id so a file imported twice does not double-count, the same
      rule the swap ledger follows for the same reason. */
   if(incident&&!seen.has(incident.id)){seen.add(incident.id);incidents.push(incident)}
  }
  return sortIncidents(incidents);
 }catch{return []}
}

export function serializeIncidents(incidents:Incident[]){
 return JSON.stringify({version:INCIDENTS_STORAGE_VERSION,savedAt:new Date().toISOString(),incidents:sortIncidents(incidents)});
}

/* The write REPORTS whether it happened. A quota-full LocalStorage throws, and
   an incident form that cleared itself on a write that was refused would lose
   the report while looking like it saved — the shape of failure this whole
   module exists to avoid. */
export function writeIncidents(storage:Pick<Storage,"setItem">,incidents:Incident[]){
 try{storage.setItem(INCIDENTS_STORAGE_KEY,serializeIncidents(incidents));return true}
 catch{return false}
}

/* A new incident from what the form holds. The shift is resolved HERE, once,
   against the settings passed in, and stored on the record. */
export function createIncident(
 draft:Partial<Incident>,
 settings:ShiftSettings,
 now=new Date(),
):Incident|null{
 const filedAt=now.toISOString();
 const at=stamp(draft.at,filedAt);
 const incident=normalizeIncident({...draft,id:draft.id||incidentId(now),at,filedAt},filedAt);
 if(!incident)return null;
 /* Resolved from when it HAPPENED rather than when it was filed: a fall at
    23:50 written up at 00:20 belongs to the night crew who were on the floor,
    not to the shift that had just come in while somebody typed. */
 incident.shift=shiftAt(at,settings);
 return incident;
}

/* An edit keeps the record and its filing stamp, and records that it changed.
   Nothing here deletes: a correction to an incident is still that incident. */
export function editIncident(incident:Incident,changes:Partial<Incident>,now=new Date().toISOString()):Incident|null{
 const next=normalizeIncident({...incident,...changes,id:incident.id,filedAt:incident.filedAt},incident.filedAt);
 if(!next)return null;
 next.editedAt=now;
 return next;
}

/* How many were filed in a window, for the count on the nav. Open-ended on
   purpose: "in the last N days" is the only question a badge can answer
   honestly without implying somebody has triaged them. */
export function incidentsSince(incidents:Incident[],sinceIso:string){
 return incidents.filter(incident=>incident.at>=sinceIso);
}
