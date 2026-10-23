/* SHOP TALK: the things people notice, before they become the things that
   happen to people.

   WHY IT EXISTS, and it is the same night as the incident surface. Curtis fell
   on oil in the shop. The oil was there before he fell, and somebody almost
   certainly walked past it first — the app had nowhere for that person to put
   it. Curtis: "suggestions and things that are noticed like a oily floor". A
   defect needs a bus; this needs nothing but somebody willing to say it out
   loud, which is why it is called SHOP TALK and not a log.

   THE RELATIONSHIP TO INCIDENTS IS THE POINT. A hazard here is the cheap
   version of an incident there. Every hazard cleared on this board is an
   incident that never got filed, and the board is worth keeping precisely
   because that saving is invisible — nobody can point at the fall that did not
   happen. So hazards sort to the top and stay visible until somebody marks
   them handled, rather than scrolling away under suggestions.

   ONE REQUIRED FIELD, the same rule the incident form follows and for the same
   reason: a note nobody can be bothered to finish is a note that does not get
   written. Say what you saw. Everything else is optional.

   IT DOES NOT SYNC YET, AND THAT IS A LIMITATION RATHER THAN A DECISION.
   A hazard board only pays for itself when the next person reads it, so this
   wants to travel in a way an incident deliberately does not. Carrying it
   through the Shop Cloud needs a schema migration — `shop_memory` is
   constrained to `kind in ('part','finding')` — and a write to the live
   database is Curtis's call, every time. Until then it rides MASTER EXPORT,
   and the screen says so where it is written rather than letting somebody
   assume the shop can see it. */

export const SHOP_TALK_STORAGE_KEY="pace-shop-talk-v1";
export const SHOP_TALK_STORAGE_VERSION=1;

/* HAZARD first because the list is drawn in this order and because it is the
   one with a clock on it. A suggestion keeps. */
export const SHOP_TALK_KINDS=[
 {key:"hazard",label:"Hazard",hint:"Something that could hurt somebody"},
 {key:"notice",label:"Heads up",hint:"Something worth knowing"},
 {key:"suggestion",label:"Suggestion",hint:"Something that could work better"},
] as const;

export type ShopTalkKind=(typeof SHOP_TALK_KINDS)[number]["key"];

export type ShopTalkNote={
 id:string;
 at:string;
 /* Initials, from the cloud config this device already holds. Optional: an
    unsigned hazard is still a hazard, and demanding a name is how you get
    nothing posted. */
 by:string;
 kind:ShopTalkKind;
 text:string;
 /* An area name from site-config, so a note posted in Trouble Bay 12 says
    Trouble Bay 12. That bay IS in the main garage — the distinction is that
    "Main Garage" here means bays 1-10, and somebody sent to find oil in "the
    main garage" has 84 spaces to walk. See location-label.ts. */
 area:string;
 handledAt?:string;
 handledBy?:string;
};

function text(value:unknown){return typeof value==="string"?value.trim():""}

function stamp(value:unknown,fallback:string){
 const raw=text(value);
 if(!raw)return fallback;
 const parsed=new Date(raw);
 return Number.isNaN(parsed.getTime())?fallback:parsed.toISOString();
}

function kindOf(value:unknown):ShopTalkKind{
 const raw=text(value);
 return SHOP_TALK_KINDS.some(kind=>kind.key===raw)?raw as ShopTalkKind:"notice";
}

export function shopTalkId(now=new Date()){
 return "talk-"+now.getTime().toString(36)+"-"+Math.random().toString(36).slice(2,8);
}

export function normalizeShopTalkNote(value:unknown,now=new Date().toISOString()):ShopTalkNote|null{
 if(!value||typeof value!=="object")return null;
 const raw=value as Record<string,unknown>;
 const body=text(raw.text);
 if(!body)return null;
 const at=stamp(raw.at,now);
 const note:ShopTalkNote={
  id:text(raw.id)||shopTalkId(new Date(at)),
  at,
  by:text(raw.by),
  kind:kindOf(raw.kind),
  text:body,
  area:text(raw.area),
 };
 const handledAt=text(raw.handledAt);
 /* `delete` semantics by omission, so `"handledAt" in note` is false for an
    open note rather than true-with-undefined. A hand-edited `handledAt:""`
    must not read as handled. */
 if(handledAt){
  note.handledAt=stamp(handledAt,at);
  note.handledBy=text(raw.handledBy);
 }
 return note;
}

export function isHandled(note:ShopTalkNote){return Boolean(note.handledAt)}

/* Open hazards, then everything else open, then handled — and newest first
   inside each band.

   The band matters more than the date: an open hazard from Tuesday outranks a
   suggestion posted a minute ago, because one of them can hurt somebody and
   the other cannot. Sorted on READ, so nothing on disk is rewritten to hold an
   order. */
export function sortShopTalk(notes:ShopTalkNote[]){
 const band=(note:ShopTalkNote)=>isHandled(note)?2:note.kind==="hazard"?0:1;
 return [...notes].sort((a,b)=>band(a)-band(b)||b.at.localeCompare(a.at));
}

export function readShopTalk(storage:Pick<Storage,"getItem">,now=new Date().toISOString()):ShopTalkNote[]{
 try{
  const raw=storage.getItem(SHOP_TALK_STORAGE_KEY);
  if(!raw)return [];
  const parsed=JSON.parse(raw) as {notes?:unknown};
  const list=Array.isArray(parsed?.notes)?parsed.notes:[];
  const seen=new Set<string>();
  const notes:ShopTalkNote[]=[];
  for(const entry of list){
   const note=normalizeShopTalkNote(entry,now);
   if(note&&!seen.has(note.id)){seen.add(note.id);notes.push(note)}
  }
  return sortShopTalk(notes);
 }catch{return []}
}

export function serializeShopTalk(notes:ShopTalkNote[]){
 return JSON.stringify({version:SHOP_TALK_STORAGE_VERSION,savedAt:new Date().toISOString(),notes:sortShopTalk(notes)});
}

export function writeShopTalk(storage:Pick<Storage,"setItem">,notes:ShopTalkNote[]){
 try{storage.setItem(SHOP_TALK_STORAGE_KEY,serializeShopTalk(notes));return true}
 catch{return false}
}

export function createShopTalkNote(draft:Partial<ShopTalkNote>,now=new Date()):ShopTalkNote|null{
 const at=now.toISOString();
 return normalizeShopTalkNote({...draft,id:draft.id||shopTalkId(now),at:draft.at||at},at);
}

/* Marking it handled KEEPS the note. Nothing here deletes, for the reason the
   repair history is never deleted: "the oil in bay 7 was reported four times
   this month" is a fact somebody needs, and it only exists if the first three
   are still there. */
export function handleShopTalkNote(note:ShopTalkNote,by:string,now=new Date().toISOString()):ShopTalkNote{
 return {...note,handledAt:now,handledBy:by.trim()};
}

export function reopenShopTalkNote(note:ShopTalkNote):ShopTalkNote{
 const next={...note};
 delete next.handledAt;
 delete next.handledBy;
 return next;
}

/* Open hazards — the number worth putting on a nav badge. Suggestions do not
   count: a badge that includes them stops meaning "go look now", and a badge
   that never means that gets ignored for the one time it does. */
export function openHazardCount(notes:ShopTalkNote[]){
 return notes.filter(note=>note.kind==="hazard"&&!isHandled(note)).length;
}
