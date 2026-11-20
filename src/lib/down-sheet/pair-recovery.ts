/* Narrow durable recovery for Down Sheet save (fleet then sheet) and restore
   (sheet then fleet). Per-record patches retain unrelated current records.
   This is optimistic recovery, not an atomic cross-tab LocalStorage transaction. */
import {PAIR_RECOVERY_KEY} from "../storage/recovery-gate.mjs";
export {PAIR_RECOVERY_KEY};
type Row={id:string};
type Store="fleet"|"sheet";
export type PairData={fleet:Row[];sheet:Row[]};
type Change={id:string;before:Row|null;after:Row|null};
export type PairJournal={version:1;id:string;kind:"save"|"mark-fixed"|"restore";entryId:string;busNumber:string;order:Store[];changes:Record<Store,Change[]>};
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export type PairIO={read:()=>PairData;write:Record<Store,(rows:Row[],operationId:string)=>{ok:boolean;reason?:string}>};
export type PairResult={ok:boolean;reason:string;failedStore?:Store};
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
 return value;
}
export function sameRecoveryValue(a:unknown,b:unknown){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}
function rowsById(rows:Row[]){
 const map=new Map<string,Row>();
 for(const row of rows){if(!row||typeof row.id!=="string"||!row.id||map.has(row.id))throw Error("Invalid or duplicate record identity");map.set(row.id,row)}
 return map;
}
export function makePairJournal(kind:PairJournal["kind"],entryId:string,busNumber:string,before:PairData,after:PairData):PairJournal{
 const changes={} as PairJournal["changes"];
 for(const store of ["fleet","sheet"] as Store[]){
  const old=rowsById(before[store]),next=rowsById(after[store]);
  changes[store]=[...new Set([...old.keys(),...next.keys()])].flatMap(id=>{
   const a=old.get(id)||null,b=next.get(id)||null;return sameRecoveryValue(a,b)?[]:[{id,before:a,after:b}];
  });
 }
 return JSON.parse(JSON.stringify({version:1,id:Date.now()+"-"+Math.random().toString(36).slice(2),kind,entryId,busNumber,order:kind==="restore"?["sheet","fleet"]:["fleet","sheet"],changes}));
}
export function readPairJournal(storage:Pick<StorageLike,"getItem">):{journal:PairJournal|null;error:string}{
 try{
  const raw=storage.getItem(PAIR_RECOVERY_KEY);if(raw===null)return {journal:null,error:""};
  const j=JSON.parse(raw);
  if(j.version!==1||typeof j.id!=="string"||!j.id||!["save","mark-fixed","restore"].includes(j.kind)||typeof j.entryId!=="string"||typeof j.busNumber!=="string"||!sameRecoveryValue(j.order,j.kind==="restore"?["sheet","fleet"]:["fleet","sheet"]))throw Error("Invalid recovery header");
  for(const store of ["fleet","sheet"]){
   if(!Array.isArray(j.changes?.[store]))throw Error("Invalid recovery changes");
   const ids=new Set();for(const c of j.changes[store]){if(!c||typeof c.id!=="string"||!c.id||ids.has(c.id)||(!c.before&&!c.after)||![c.before,c.after].every(row=>row===null||(row&&row.id===c.id)))throw Error("Invalid recovery record");ids.add(c.id)}
  }
  return {journal:j,error:""};
 }catch{return {journal:null,error:"unreadable-recovery"}}
}
export function beginPairJournal(storage:StorageLike,journal:PairJournal,replaceId?:string):PairResult{
 const old=readPairJournal(storage);
 if(old.error)return {ok:false,reason:old.error};
 if(old.journal&&old.journal.id!==replaceId)return {ok:false,reason:"pending-recovery"};
 try{storage.setItem(PAIR_RECOVERY_KEY,JSON.stringify(journal));return {ok:true,reason:""}}catch{return {ok:false,reason:"recovery-not-saved"}}
}
function state(rows:Row[],changes:Change[]){
 const current=rowsById(rows);
 return changes.every(c=>sameRecoveryValue(current.get(c.id)||null,c.after))?"after":changes.every(c=>sameRecoveryValue(current.get(c.id)||null,c.before)||sameRecoveryValue(current.get(c.id)||null,c.after))?"ready":"conflict";
}
function patch(rows:Row[],changes:Change[]){
 const replacements=new Map(changes.map(c=>[c.id,c.after])),held=new Set(rows.map(r=>r.id));
 return [...rows.flatMap(row=>replacements.has(row.id)?(replacements.get(row.id)?[replacements.get(row.id)!]:[]):[row]),...changes.filter(c=>!held.has(c.id)&&c.after).map(c=>c.after!)];
}
export function resumePairJournal(storage:StorageLike,io:PairIO,finalize:(journal:PairJournal)=>boolean=()=>true):PairResult{
 const read=readPairJournal(storage);if(read.error||!read.journal)return {ok:false,reason:read.error||"no-recovery"};
 const j=read.journal;
 try{
  for(const store of j.order){
   if(readPairJournal(storage).journal?.id!==j.id)return {ok:false,reason:"recovery-changed"};
   const current=io.read();
   // Check both sides before every write, including unrelated changes retained below.
   if(j.order.some(s=>state(current[s],j.changes[s])==="conflict"))return {ok:false,reason:"record-conflict"};
   if(state(current[store],j.changes[store])==="after")continue;
   const written=io.write[store](patch(current[store],j.changes[store]),j.id);
   if(!written.ok)return {ok:false,reason:written.reason||"write-refused",failedStore:store};
  }
  const current=io.read();
  if(j.order.some(s=>state(current[s],j.changes[s])!=="after"))return {ok:false,reason:"record-conflict"};
  if(!finalize(j))return {ok:false,reason:"finalization-refused"};
  if(readPairJournal(storage).journal?.id!==j.id)return {ok:false,reason:"recovery-changed"};
  storage.removeItem(PAIR_RECOVERY_KEY);
  if(storage.getItem(PAIR_RECOVERY_KEY)!==null)return {ok:false,reason:"cleanup-refused"};
  return {ok:true,reason:""};
 }catch{return {ok:false,reason:"recovery-refused"}}
}
