/* INCIDENTS and SHOP TALK: the two surfaces that are about a place and a
   person rather than about a bus.

   Written the night Curtis slipped on oil in the shop. The rules worth holding
   are mostly about REFUSING to lose a report: the one required field, the
   stamp that does not move, and the shift that must not migrate to another
   crew when somebody edits the hours months later. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
 CARE_LEVELS, INCIDENTS_STORAGE_KEY, INCIDENT_KINDS, createIncident, editIncident,
 incidentsSince, normalizeIncident, readIncidents, serializeIncidents, sortIncidents, writeIncidents,
 SHOP_TALK_KINDS, SHOP_TALK_STORAGE_KEY, createShopTalkNote, handleShopTalkNote, isHandled,
 normalizeShopTalkNote, openHazardCount, readShopTalk, reopenShopTalkNote, sortShopTalk, writeShopTalk,
 DEFAULT_SHIFT_SETTINGS,
} from "./helpers/modules.mjs";

function store(initial={}){
 const data={...initial};
 return {
  data,
  getItem:key=>key in data?data[key]:null,
  setItem:(key,value)=>{data[key]=String(value)},
 };
}

function failingStore(){
 return {getItem:()=>null,setItem:()=>{throw new Error("QuotaExceededError")}};
}

/* ---- the one rule that decides whether a report exists at all ---- */

/* Curtis: "don't make any of the fields except for the ones that matter
   mandatory to save the incident". The incident most worth having is filed by
   somebody shaken or halfway out the door, so everything but the description
   has to be optional. */
test("an incident saves with nothing but what happened",()=>{
 const incident=createIncident({what:"Slipped on oil by the pit"},DEFAULT_SHIFT_SETTINGS,new Date("2026-10-21T02:40:00.000Z"));
 assert.ok(incident,"a description alone must be enough to file");
 assert.equal(incident.what,"Slipped on oil by the pit");
 /* Every other field present and empty rather than missing, so a reader never
    has to tell "not asked" from "not stored". */
 for(const field of ["area","busNumber","people","injury","witnesses","reportedTo","followUp"]){
  assert.equal(incident[field],"",field+" must default to empty, not undefined");
 }
});

/* The only thing that can disqualify a record. A blank form is not an
   incident, and storing one would put an empty row on a safety page. */
test("an incident with no description is not an incident",()=>{
 assert.equal(createIncident({what:"   "},DEFAULT_SHIFT_SETTINGS),null);
 assert.equal(normalizeIncident({what:"",injury:"twisted ankle"}),null);
 assert.equal(normalizeIncident({}),null);
 assert.equal(normalizeIncident(null),null);
});

/* "" is not "none". A blank care box is a question nobody asked; reading it as
   "no treatment needed" would have the app inventing a medical fact. */
test("care not recorded is distinct from no care needed",()=>{
 assert.equal(createIncident({what:"x"},DEFAULT_SHIFT_SETTINGS).care,"");
 assert.equal(createIncident({what:"x",care:"none"},DEFAULT_SHIFT_SETTINGS).care,"none");
 /* An unknown value falls back to "not recorded" rather than to a treatment
    level, because guessing upward invents care that nobody gave. */
 assert.equal(createIncident({what:"x",care:"airlifted"},DEFAULT_SHIFT_SETTINGS).care,"");
 assert.ok(CARE_LEVELS.some(level=>level.key===""),"not recorded must be an offered option");
});

/* ---- the stamps, and why there are two ---- */

test("when it happened is editable; when it was filed is not",()=>{
 const filedAt=new Date("2026-10-21T03:10:00.000Z");
 const incident=createIncident({what:"Fell","at":"2026-10-21T02:40:00.000Z"},DEFAULT_SHIFT_SETTINGS,filedAt);
 assert.equal(incident.at,"2026-10-21T02:40:00.000Z","the time it happened is what was typed");
 assert.equal(incident.filedAt,"2026-10-21T03:10:00.000Z","the filing stamp is now");

 /* An edit may move `at` — people correct the time they wrote down — but the
    filing stamp is the record of when this entered the world and must not
    follow it. */
 const edited=editIncident(incident,{at:"2026-10-21T02:35:00.000Z"},"2026-10-22T09:00:00.000Z");
 assert.equal(edited.at,"2026-10-21T02:35:00.000Z");
 assert.equal(edited.filedAt,"2026-10-21T03:10:00.000Z","an edit must not move the filing stamp");
 assert.equal(edited.editedAt,"2026-10-22T09:00:00.000Z");
 assert.equal(edited.id,incident.id,"an edit is the same incident, not a new one");
});

/* A garbage timestamp must not produce an Invalid Date that sorts
   unpredictably and prints as nonsense on a safety record. */
test("an unreadable time falls back rather than storing a broken date",()=>{
 const incident=createIncident({what:"x",at:"last tuesday-ish"},DEFAULT_SHIFT_SETTINGS,new Date("2026-10-21T03:00:00.000Z"));
 assert.equal(incident.at,"2026-10-21T03:00:00.000Z");
 assert.ok(!Number.isNaN(new Date(incident.at).getTime()));
});

/* ---- neither form may empty itself over a write that was refused ---- */

test("a refused write never clears the box on either surface",async()=>{
 /* The failure this pins is silent and costs the whole report: the page says
    NOT SAVED and has ALREADY emptied the textarea, so the only copy of what
    somebody typed is gone. On a hazard board that is the hazard; on the
    incident form it is somebody's record of being hurt.

    It shipped on the Shop Talk board while the incident form beside it did it
    correctly — both written in the same change, which is precisely when an
    inconsistency between two files is hardest to see from the inside. Pinned
    by reading the source because the bug lives in a React handler, and the
    repo already asserts handler shape this way elsewhere. */
 const talk=await readFile(new URL("../app/shop-talk/page.tsx",import.meta.url),"utf8");
 const incidents=await readFile(new URL("../app/incidents/page.tsx",import.meta.url),"utf8");

 for(const [name,source] of [["Shop Talk",talk],["Incidents",incidents]]){
  assert.match(source,/function persist\([\s\S]*?return false;/,
   name+"'s persist must REPORT a refused write, not return undefined");
  assert.match(source,/function persist\([\s\S]*?return true;/,
   name+"'s persist must report a successful write");
 }

 /* The clear has to be GATED on that report rather than merely sitting after
    it. The mutant worth catching is the sequential pair. */
 assert.match(talk,/if\(persist\(.*\)\)setText\(""\)/,
  "the Shop Talk box may only empty when persist reported success");
 assert.doesNotMatch(talk,/persist\([^\n]*\);\s*\n\s*setText\(""\)/,
  "an unguarded setText beside persist is exactly the bug this test exists for");
 assert.match(incidents,/if\(persist\([\s\S]{0,160}?setDraft\(\{\.\.\.EMPTY\}\)/,
  "the incident draft may only reset when persist reported success");
}); 

/* ---- the shift, which is the trap ---- */

/* shiftAt reads LOCAL wall-clock hours on purpose: a shift is a fact about the
   building somebody is standing in. So these timestamps have to be BUILT from
   local parts. Written as UTC literals they asserted "02:40Z is 3rd shift",
   which is true on a UTC runner and false in America/Chicago, where that
   instant is 21:40 the previous evening and belongs to 2nd. The suite would
   have stayed green in CI and failed on the machine of anybody sitting in the
   shop's own timezone — the worst shape for a test to fail in. */
const localIso=(year,month,day,hour,minute)=>new Date(year,month-1,day,hour,minute).toISOString();

/* Same rule the swap ledger follows: resolved once and STORED. If somebody
   edits the garage's hours in six weeks, the shift this fall happened on must
   not silently move to a different crew. What shift it WAS is a fact. */
test("the shift is stored, not recomputed from the stamp",()=>{
 /* 02:40 is 3rd shift under the shop's real hours (22:00-06:30). */
 const incident=createIncident({what:"Fell",at:localIso(2026,10,21,2,40)},DEFAULT_SHIFT_SETTINGS,new Date(localIso(2026,10,21,2,45)));
 assert.equal(incident.shift,"3rd");

 /* Re-read through normalize with NO settings in sight: the stored value has
    to survive, because nothing downstream may recompute it. */
 const round=normalizeIncident(JSON.parse(JSON.stringify(incident)));
 assert.equal(round.shift,"3rd","the stored shift must survive a round trip unchanged");
});

/* The crew who were on the floor, not the crew who had just clocked in while
   somebody typed it up. */
test("the shift comes from when it happened, not when it was filed",()=>{
 const incident=createIncident(
  {what:"Fell at the end of nights",at:localIso(2026,10,21,5,50)},
  DEFAULT_SHIFT_SETTINGS,
  /* Filed in 1st shift, local, so the contrast the test is about survives in
     any timezone rather than only on a UTC runner. */
  new Date(localIso(2026,10,21,8,30)),
 );
 assert.equal(incident.shift,"3rd","05:50 belongs to the night crew who were there");
});

/* ---- storage ---- */

test("incidents round-trip through storage, newest first",()=>{
 const storage=store();
 const a=createIncident({what:"First",at:"2026-10-19T10:00:00.000Z"},DEFAULT_SHIFT_SETTINGS,new Date("2026-10-19T10:00:00.000Z"));
 const b=createIncident({what:"Second",at:"2026-10-21T02:40:00.000Z"},DEFAULT_SHIFT_SETTINGS,new Date("2026-10-21T02:40:00.000Z"));
 assert.equal(writeIncidents(storage,[a,b]),true);
 const read=readIncidents(storage);
 assert.equal(read.length,2);
 assert.equal(read[0].what,"Second","the newest incident reads first");
 assert.equal(read[1].what,"First");
});

/* A file imported twice must not double-count, the rule the swap ledger
   follows. Ids carry a random tail precisely so two devices filing in the same
   millisecond cannot collide. */
test("a duplicated id is read once",()=>{
 const incident=createIncident({what:"Fell"},DEFAULT_SHIFT_SETTINGS);
 const storage=store({[INCIDENTS_STORAGE_KEY]:JSON.stringify({version:1,incidents:[incident,incident]})});
 assert.equal(readIncidents(storage).length,1);
});

/* A corrupt file must read as "no incidents" rather than throwing on a page
   somebody opened because they are hurt. */
test("unreadable storage reads as empty rather than throwing",()=>{
 assert.deepEqual(readIncidents(store({[INCIDENTS_STORAGE_KEY]:"{not json"})),[]);
 assert.deepEqual(readIncidents(store({[INCIDENTS_STORAGE_KEY]:JSON.stringify({incidents:"nope"})})),[]);
 assert.deepEqual(readIncidents(store()),[]);
});

/* The write REPORTS. A form that cleared itself on a refused write would lose
   the report while looking like it saved. */
test("a refused write says so instead of claiming success",()=>{
 assert.equal(writeIncidents(failingStore(),[createIncident({what:"Fell"},DEFAULT_SHIFT_SETTINGS)]),false);
});

test("a record too broken to be an incident is dropped on read, not kept empty",()=>{
 const good=createIncident({what:"Real"},DEFAULT_SHIFT_SETTINGS);
 const storage=store({[INCIDENTS_STORAGE_KEY]:JSON.stringify({version:1,incidents:[good,{id:"x",what:""},null,42]})});
 const read=readIncidents(storage);
 assert.equal(read.length,1);
 assert.equal(read[0].what,"Real");
});

test("incidentsSince counts a window without triaging anything",()=>{
 const list=[
  createIncident({what:"Old",at:"2026-10-01T10:00:00.000Z"},DEFAULT_SHIFT_SETTINGS),
  createIncident({what:"Recent",at:"2026-10-21T02:40:00.000Z"},DEFAULT_SHIFT_SETTINGS),
 ];
 assert.equal(incidentsSince(list,"2026-10-14T00:00:00.000Z").length,1);
});

/* ---- SHOP TALK ---- */

test("a note saves with nothing but what was noticed",()=>{
 const note=createShopTalkNote({text:"Oil all over the floor by the pit"});
 assert.ok(note);
 assert.equal(note.by,"","an unsigned hazard is still a hazard");
 assert.equal(note.area,"");
 assert.equal(note.kind,"notice","an unstated kind is a heads up, not a hazard");
});

test("an empty note is not a note",()=>{
 assert.equal(createShopTalkNote({text:"  "}),null);
 assert.equal(normalizeShopTalkNote({kind:"hazard"}),null);
});

/* The band outranks the date: an open hazard from Tuesday sits above a
   suggestion posted a minute ago, because one of them can hurt somebody. */
test("open hazards sort above everything, handled notes sink",()=>{
 const oldHazard=createShopTalkNote({text:"Oil by the pit",kind:"hazard",at:"2026-10-18T10:00:00.000Z"});
 const newSuggestion=createShopTalkNote({text:"Move the parts bin",kind:"suggestion",at:"2026-10-21T02:00:00.000Z"});
 const newNotice=createShopTalkNote({text:"Bay 3 light is out",kind:"notice",at:"2026-10-21T02:30:00.000Z"});
 const handledHazard=handleShopTalkNote(
  createShopTalkNote({text:"Coolant spill",kind:"hazard",at:"2026-10-21T02:45:00.000Z"}),"CJ");

 const sorted=sortShopTalk([newSuggestion,handledHazard,newNotice,oldHazard]);
 assert.equal(sorted[0].text,"Oil by the pit","the open hazard leads even though it is the oldest");
 assert.equal(sorted[1].text,"Bay 3 light is out","then open notes, newest first");
 assert.equal(sorted[2].text,"Move the parts bin");
 assert.equal(sorted[3].text,"Coolant spill","a handled hazard sinks below open suggestions");
});

/* Nothing here deletes. "The oil in bay 7 was reported four times this month"
   is a fact somebody needs, and it only exists if the first three are kept. */
test("handling a note keeps it, and it can be reopened",()=>{
 const note=createShopTalkNote({text:"Oil by the pit",kind:"hazard"});
 assert.equal(isHandled(note),false);

 const handled=handleShopTalkNote(note,"CJ","2026-10-21T03:00:00.000Z");
 assert.equal(isHandled(handled),true);
 assert.equal(handled.handledBy,"CJ");
 assert.equal(handled.text,note.text,"handling must not alter what was said");
 assert.equal(handled.id,note.id,"handling is the same note");

 const reopened=reopenShopTalkNote(handled);
 assert.equal(isHandled(reopened),false);
 /* Deleted rather than set to undefined, the spelling setBusHold uses, so the
    key is genuinely absent. */
 assert.equal("handledAt" in reopened,false);
 assert.equal("handledBy" in reopened,false);
});

/* A hand-edited `handledAt:""` must not read as handled — the same trap the
   swap ledger's `gap` field was normalized against. */
test("an empty handled stamp does not read as handled",()=>{
 const note=normalizeShopTalkNote({text:"Oil",kind:"hazard",handledAt:"",handledBy:"CJ"});
 assert.equal(isHandled(note),false);
 assert.equal("handledAt" in note,false);
});

/* A badge that counts suggestions stops meaning "go look now", and a badge
   that never means that is ignored the one time it does. */
test("the badge counts open hazards only",()=>{
 const notes=[
  createShopTalkNote({text:"Oil",kind:"hazard"}),
  createShopTalkNote({text:"Idea",kind:"suggestion"}),
  createShopTalkNote({text:"FYI",kind:"notice"}),
  handleShopTalkNote(createShopTalkNote({text:"Cleaned",kind:"hazard"}),"CJ"),
 ];
 assert.equal(openHazardCount(notes),1);
});

test("shop talk round-trips and survives a corrupt file",()=>{
 const storage=store();
 assert.equal(writeShopTalk(storage,[createShopTalkNote({text:"Oil by the pit",kind:"hazard"})]),true);
 assert.equal(readShopTalk(storage).length,1);
 assert.deepEqual(readShopTalk(store({[SHOP_TALK_STORAGE_KEY]:"{broken"})),[]);
 assert.equal(writeShopTalk(failingStore(),[createShopTalkNote({text:"Oil"})]),false);
});

/* ---- what these two surfaces must NOT do ---- */

/* Curtis chose device-local for the reason a HOLD is device-local: an incident
   names a person and an injury, and this app has no login, so a synced one
   would put that on every phone with nothing deciding who may read it.
   Asserted against the source, because "it does not sync" is the absence of a
   code path and absence is exactly what a behavioural test cannot see. */
test("neither surface can reach the cloud or the fleet board",async()=>{
 for(const path of ["../src/lib/incidents/incidents.ts","../src/lib/shop-talk/shop-talk.ts"]){
  const source=await readFile(new URL(path,import.meta.url),"utf8");
  for(const forbidden of ["cloud-sync","cloud-client","cloud-live","supabase","pace-board-v1","pace-down-sheet-v1"]){
   assert.ok(!source.includes(forbidden),path+" must not name "+forbidden);
  }
 }
});

/* A location is named through site-config's areas, never by matching a slot
   prefix. Matching "garage-" gets you "Main Garage" for all 84 spaces,
   including the two trouble bays the move editor treats as separate
   destinations. Five copies of that table existed and all five had the bug. */
test("neither surface carries its own location table",async()=>{
 for(const path of ["../src/lib/incidents/incidents.ts","../src/lib/shop-talk/shop-talk.ts"]){
  const source=await readFile(new URL(path,import.meta.url),"utf8");
  assert.ok(!/startsWith\(["']garage/.test(source),path+" must not match a location by prefix");
  assert.ok(!/Main Garage["']\s*[,:\]]/.test(source),path+" must not hold its own area labels");
 }
});

test("the incident kinds include the one nobody files",()=>{
 assert.ok(INCIDENT_KINDS.some(kind=>kind.key==="near-miss"),
  "near miss is the only kind that reports a hazard while it is still free to fix");
 assert.ok(SHOP_TALK_KINDS[0].key==="hazard","hazard leads the list it is drawn from");
});

/* A fleet number, never a bus id: ids are device-local, and nothing re-points
   one on this path. */
test("a bus is remembered by fleet number",()=>{
 const incident=createIncident({what:"Struck the mirror",busNumber:"17549"},DEFAULT_SHIFT_SETTINGS);
 assert.equal(incident.busNumber,"17549");
 assert.equal("busId" in incident,false,"a device-local id must never be stored here");
});

test("serialize writes a version and keeps the sort",()=>{
 const payload=JSON.parse(serializeIncidents([
  createIncident({what:"Older",at:"2026-10-01T00:00:00.000Z"},DEFAULT_SHIFT_SETTINGS),
  createIncident({what:"Newer",at:"2026-10-21T00:00:00.000Z"},DEFAULT_SHIFT_SETTINGS),
 ]));
 assert.equal(payload.version,1);
 assert.equal(payload.incidents[0].what,"Newer");
 assert.equal(sortIncidents([]).length,0);
});
