/* Moving one section of the app between two devices.

   The full backup is all or nothing, and that is the wrong shape for the thing
   that actually happens: a phone with today's Defect Log and last week's map,
   an iPad with today's map and last week's log. Importing either whole backup
   throws away the half the other device did better, so in practice neither ever
   gets imported and both devices drift.

   The awkward part is that the Defect Log and the Fleet Map are not separate
   stores. They are different FIELDS on the same bus record — `defects` on one
   side, `l` and `s` and the rest on the other — so "send me only the defects"
   means merging field-wise into records the other device already has, not
   replacing a file. That is what this module does, and it is the whole reason
   a plain export/import pair could never have covered it.

   Nothing here replaces wholesale. Incoming wins where the two devices describe
   the same thing, and anything only the receiving device has is kept, because
   the alternative is a mechanic's afternoon disappearing on somebody else's
   import. */

export type TransferKind="defect-log"|"down-sheet"|"fleet-map";

export const TRANSFER_KINDS:Record<TransferKind,{payloadKind:string;label:string;filePrefix:string}>={
 "defect-log":{payloadKind:"pace-south-defect-log-transfer",label:"Defect Log",filePrefix:"defect-log"},
 "down-sheet":{payloadKind:"pace-south-down-sheet-transfer",label:"Down Sheet",filePrefix:"down-sheet"},
 "fleet-map":{payloadKind:"pace-south-fleet-map-transfer",label:"Fleet Map",filePrefix:"fleet-map"},
};

/* What belongs to the Defect Log and therefore travels with it. Everything else
   on a bus record is the map's, which is what keeps the two transfers from
   overwriting each other when both are sent. */
const DEFECT_FIELDS=["defects","pendingRepair"] as const;

/* And what belongs to the Down Sheet, which no transfer may assert.

   The Down Sheet is the source of truth for whether a bus is down. Entries get
   there off a photographed sheet or typed in by hand, and the map reads that
   membership back rather than deciding it: `reconcileDownSheetMembership` sets
   `down` from the active entries every time they change.

   A Fleet Map file carrying these fields breaks that. A map exported before a
   bus went on the sheet says down:false, and importing it stripped the badge
   off a bus whose Down Sheet entry was sitting right there untouched — the map
   page only re-reconciles when the entries change, and an import does not
   change them. So the map transfer does not carry them at all, and a merge
   keeps whatever the receiving device's own Down Sheet says. To move down
   status, move the Down Sheet. */
const DOWN_SHEET_FIELDS=["down","onDownSheet","downSheetReady"] as const;
const MAP_EXCLUDED=[...DEFECT_FIELDS,...DOWN_SHEET_FIELDS];

export type TransferBus={id?:string;n?:string;[key:string]:unknown};
export type TransferPayload={kind:string;version:number;exportedAt:string;buses?:TransferBus[];entries?:unknown[]};

function busKey(bus:{n?:unknown;id?:unknown}){
 const number=String(bus?.n??"").trim();
 return number?"n:"+number.toLowerCase():"id:"+String(bus?.id??"").trim();
}
/* Fleet number first, id second. Two devices that were never seeded from the
   same backup generate different ids for the same bus, and the number is what a
   person means when they say 17549. */
function indexBuses(buses:TransferBus[]){
 const byKey=new Map<string,number>();
 buses.forEach((bus,index)=>{
  const number=String(bus?.n??"").trim();
  if(number)byKey.set("n:"+number.toLowerCase(),index);
  const id=String(bus?.id??"").trim();
  if(id&&!byKey.has("id:"+id))byKey.set("id:"+id,index);
 });
 return byKey;
}
function matchIndex(index:Map<string,number>,bus:TransferBus){
 const number=String(bus?.n??"").trim();
 if(number&&index.has("n:"+number.toLowerCase()))return index.get("n:"+number.toLowerCase())!;
 const id=String(bus?.id??"").trim();
 if(id&&index.has("id:"+id))return index.get("id:"+id)!;
 return -1;
}
function pick<T extends object>(source:T,keys:readonly string[]){
 const out:Record<string,unknown>={};
 for(const key of keys)if(key in source)out[key]=(source as Record<string,unknown>)[key];
 return out;
}
function omit<T extends object>(source:T,keys:readonly string[]){
 const out:Record<string,unknown>={};
 for(const [key,value] of Object.entries(source))if(!keys.includes(key))out[key]=value;
 return out;
}

function envelope(kind:TransferKind,body:Partial<TransferPayload>,now=new Date().toISOString()):TransferPayload{
 return {kind:TRANSFER_KINDS[kind].payloadKind,version:1,exportedAt:now,...body};
}

export function exportDefectLogPayload(buses:TransferBus[],now?:string){
 return envelope("defect-log",{buses:buses.map(bus=>({id:bus.id,n:bus.n,...pick(bus,DEFECT_FIELDS)}))},now);
}
export function exportFleetMapPayload(buses:TransferBus[],now?:string){
 return envelope("fleet-map",{buses:buses.map(bus=>omit(bus,MAP_EXCLUDED))},now);
}
export function exportDownSheetPayload(entries:unknown[],now?:string){
 return envelope("down-sheet",{entries},now);
}

export type TransferRead={ok:true;kind:TransferKind;payload:TransferPayload}|{ok:false;error:string};

/* Names the section it actually is, so a Down Sheet file dropped on the Defect
   Log says so rather than "not valid" — which is what a whole-backup import
   said to every one of these files before they existed. */
export function readTransferPayload(text:string,expected:TransferKind):TransferRead{
 let parsed:TransferPayload;
 try{parsed=JSON.parse(text) as TransferPayload}catch{return {ok:false,error:"That file is not readable. Send the exported file itself rather than a copy of the text."}}
 const kind=String(parsed?.kind??"");
 if(kind===TRANSFER_KINDS[expected].payloadKind)return {ok:true,kind:expected,payload:parsed};
 const other=(Object.keys(TRANSFER_KINDS) as TransferKind[]).find(key=>TRANSFER_KINDS[key].payloadKind===kind);
 if(other)return {ok:false,error:"That is a "+TRANSFER_KINDS[other].label+" file. Import it on the "+TRANSFER_KINDS[other].label+" page instead."};
 if(kind==="pace-south-fleet-board-backup")return {ok:false,error:"That is a full backup, not a "+TRANSFER_KINDS[expected].label+" transfer. Use IMPORT ALL DATA in Facility Map settings, which replaces everything on this device."};
 if(kind.startsWith("fleet-"))return {ok:false,error:"That is a report, not a transfer. Reports are for reading and cannot be imported. Use EXPORT "+TRANSFER_KINDS[expected].label.toUpperCase()+" on the other device instead."};
 return {ok:false,error:"That file is not a "+TRANSFER_KINDS[expected].label+" transfer, and nothing was changed."};
}

export type MergeReport={updated:number;added:number;unmatched:string[]};

/* Defects merge by their own id: the same defect edited on both devices takes
   the incoming version, and a defect only the receiving device has is kept. A
   bus the receiving device has never heard of is reported rather than invented,
   because giving it a home on the map is the map transfer's job and guessing
   one here would drop a bus into a parking space that may already be full. */
export function mergeDefectLog<T extends TransferBus>(local:T[],payload:TransferPayload){
 const incoming=Array.isArray(payload?.buses)?payload.buses:[];
 const index=indexBuses(local);
 const next=local.slice();
 const report:MergeReport={updated:0,added:0,unmatched:[]};
 for(const bus of incoming){
  const at=matchIndex(index,bus);
  if(at<0){report.unmatched.push(String(bus?.n??bus?.id??"unknown"));continue}
  const current=next[at] as TransferBus;
  const mine=Array.isArray(current.defects)?current.defects as {id?:string}[]:[];
  const theirs=Array.isArray(bus.defects)?bus.defects as {id?:string}[]:[];
  const merged=mine.slice();
  const positions=new Map(mine.map((defect,position)=>[String(defect?.id??""),position]));
  for(const defect of theirs){
   const id=String(defect?.id??"");
   const position=id?positions.get(id):undefined;
   if(position===undefined){merged.push(defect);positions.set(id,merged.length-1)}
   else merged[position]=defect;
  }
  next[at]={...current,defects:merged,...("pendingRepair" in bus?{pendingRepair:bus.pendingRepair}:{})} as T;
  report.updated++;
 }
 return {buses:next,report};
}

/* The map is where a bus lives, so a bus the receiving device does not have is
   added rather than skipped: the incoming record carries a location, which is
   the one thing a new bus needs. Its defects arrive empty and stay empty until
   a Defect Log transfer brings them. */
export function mergeFleetMap<T extends TransferBus>(local:T[],payload:TransferPayload){
 const incoming=Array.isArray(payload?.buses)?payload.buses:[];
 const index=indexBuses(local);
 const next=local.slice();
 const report:MergeReport={updated:0,added:0,unmatched:[]};
 for(const bus of incoming){
  const at=matchIndex(index,bus);
  /* Stripped on the way in as well as on the way out, so a file written by an
     older version, or edited by hand, still cannot assert down status. */
  const mapFields=omit(bus,MAP_EXCLUDED);
  if(at<0){
   /* pendingRepair is a defect field, so a map transfer never carries one. A
      bus arriving without it needs the empty string rather than nothing, for
      the same reason. */
   /* A bus arriving with the map is not on this device's Down Sheet, because
      this device's Down Sheet has never heard of it. It gets its badge when a
      Down Sheet transfer brings the entry. */
   next.push({...mapFields,defects:[],pendingRepair:"",down:false,onDownSheet:false} as unknown as T);
   index.set(busKey(bus),next.length-1);
   report.added++;
   continue;
  }
  const current=next[at] as TransferBus;
  /* The receiving device's defects survive untouched. Sending a map must never
     be a way of quietly clearing somebody's Defect Log.

     Copied with `pick`, which only carries keys that are actually there.
     Writing them back unconditionally set `pendingRepair` to undefined on any
     bus that had never had one, and the Facility Map calls .trim() on it while
     filtering — so importing a map crashed the page rather than moving a bus. */
  next[at]={...current,...mapFields,...pick(current,MAP_EXCLUDED)} as T;
  report.updated++;
 }
 return {buses:next,report};
}

/* Entries merge by id, incoming wins, and an entry only this device has stays
   on the sheet. A bus scheduled here and not there is still scheduled here. */
export function mergeDownSheet<T extends {id?:string}>(local:T[],payload:TransferPayload){
 const incoming=Array.isArray(payload?.entries)?payload.entries as T[]:[];
 const next=local.slice();
 const positions=new Map(local.map((entry,position)=>[String(entry?.id??""),position]));
 const report:MergeReport={updated:0,added:0,unmatched:[]};
 for(const entry of incoming){
  const id=String(entry?.id??"");
  const position=id?positions.get(id):undefined;
  if(position===undefined){next.push(entry);positions.set(id,next.length-1);report.added++}
  else {next[position]=entry;report.updated++}
 }
 return {entries:next,report};
}

export function transferFilename(kind:TransferKind,now=new Date()){
 return "pace-"+TRANSFER_KINDS[kind].filePrefix+"-"+now.toISOString().slice(0,10)+".json";
}

export function mergeSummary(kind:TransferKind,report:MergeReport){
 const label=TRANSFER_KINDS[kind].label;
 const parts=[report.updated+" updated"];
 if(report.added)parts.push(report.added+" added");
 const lines=[label+" imported: "+parts.join(", ")+"."];
 if(report.unmatched.length)lines.push("Not on this device, so skipped: "+report.unmatched.slice(0,12).join(", ")+(report.unmatched.length>12?" and "+(report.unmatched.length-12)+" more":"")+". Import the Fleet Map first to add them.");
 return lines.join("\n");
}
