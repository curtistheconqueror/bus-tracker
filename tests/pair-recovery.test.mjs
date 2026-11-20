import test from 'node:test';
import assert from 'node:assert/strict';
import {PAIR_RECOVERY_KEY,makePairJournal,readPairJournal,beginPairJournal,resumePairJournal,sameRecoveryValue} from '../src/lib/down-sheet/pair-recovery.ts';
import {FLEET_STORAGE_KEY as F,DOWN_SHEET_STORAGE_KEY as S,serializeFleetPayload,serializeDownSheetPayload,readFleetStorage,readDownSheetStorage,writeFleetStorageResult,writeDownSheetStorageResult} from '../src/lib/storage/storage.ts';
import {applyDownEntryToFleet,bindDownEntryDefectIds} from '../src/lib/down-sheet/down-sheet-sync.ts';
import {normalizeRepairItems} from '../src/lib/down-sheet/down-sheet-repair-items.ts';
function setup(kind){
 const before={fleet:[{id:'b',n:'85001',l:'garage-1',s:'out',defects:[]},{id:'other',n:'86002',l:'garage-2',s:'service',defects:[]}],sheet:[{id:'e',busId:'b',workflow:'Scheduled'}]};
 const after=structuredClone(before);after.fleet[0].s='service';after.sheet[0].workflow='Completed';
 const values=new Map([[F,serializeFleetPayload(before.fleet)],[S,serializeDownSheetPayload(before.sheet)]]);let fail='',removeFail=false,writes=0;
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(k===fail)throw new DOMException('QA refusal','QuotaExceededError');values.set(k,v);if(k===F||k===S)writes++},removeItem(k){if(removeFail)throw Error('QA remove refusal');values.delete(k)}};
 const io={read:()=>({fleet:readFleetStorage(storage).buses,sheet:readDownSheetStorage(storage).entries}),write:{fleet:(rows,id)=>writeFleetStorageResult(storage,rows,{recoveryOperationId:id}),sheet:(rows,id)=>writeDownSheetStorageResult(storage,rows,{recoveryOperationId:id})}};
 const journal=makePairJournal(kind,'e','85001',before,after);
 return {before,after,storage,io,journal,values,fail:k=>{fail=k},removeFail:v=>{removeFail=v},writes:()=>writes};
}
for(const kind of ['save','restore'])for(const boundary of ['journal','first','second','finalization','cleanup'])test(kind+' recovers after '+boundary+' refusal and repeated reload/retry',()=>{
 const t=setup(kind),first=kind==='restore'?S:F,second=kind==='restore'?F:S;
 if(boundary==='journal')t.fail(PAIR_RECOVERY_KEY);
 const prepared=beginPairJournal(t.storage,t.journal);
 if(boundary==='journal'){assert.equal(prepared.ok,false);assert.deepEqual(t.io.read(),t.before);t.fail('');assert.equal(beginPairJournal(t.storage,t.journal).ok,true)}else assert.equal(prepared.ok,true);
 if(boundary==='first')t.fail(first);if(boundary==='second')t.fail(second);if(boundary==='cleanup')t.removeFail(true);
 const result=resumePairJournal(t.storage,t.io,()=>boundary!=='finalization');
 if(boundary!=='journal')assert.equal(result.ok,false);
 if(boundary!=='journal')assert.ok(readPairJournal(t.storage).journal,'durable intent survives failure/reload');
 t.fail('');t.removeFail(false);
 if(readPairJournal(t.storage).journal)assert.equal(resumePairJournal(t.storage,t.io).ok,true);
 assert.deepEqual(t.io.read(),t.after);assert.equal(t.storage.getItem(PAIR_RECOVERY_KEY),null);
 const writes=t.writes();assert.equal(resumePairJournal(t.storage,t.io).ok,false);assert.equal(t.writes(),writes,'completed operations do not reapply');
});
for(const kind of ['save','restore'])test(kind+' preserves unrelated changes but refuses touched-record conflicts',()=>{
 const t=setup(kind);beginPairJournal(t.storage,t.journal);t.fail(kind==='restore'?F:S);assert.equal(resumePairJournal(t.storage,t.io).ok,false);t.fail('');
 const rows=readFleetStorage(t.storage).buses;rows[1].notes='Concurrent unrelated work';t.values.set(F,serializeFleetPayload(rows));
 assert.equal(resumePairJournal(t.storage,t.io).ok,true);assert.equal(readFleetStorage(t.storage).buses[1].notes,'Concurrent unrelated work');
 const c=setup(kind);beginPairJournal(c.storage,c.journal);const changed=readFleetStorage(c.storage).buses;changed[0].notes='Conflicting same bus';c.values.set(F,serializeFleetPayload(changed));const before=c.writes();
 assert.equal(resumePairJournal(c.storage,c.io).reason,'record-conflict');assert.equal(c.writes(),before);assert.ok(readPairJournal(c.storage).journal);
});
test('journal covers both buses changed by a swap and protects pending intent',()=>{
 const t=setup('save');t.after.fleet[0].l='garage-2';t.after.fleet[1].l='garage-1';const j=makePairJournal('save','e','85001',t.before,t.after);assert.equal(j.changes.fleet.length,2);
 beginPairJournal(t.storage,j);assert.equal(beginPairJournal(t.storage,t.journal).reason,'pending-recovery');assert.equal(readPairJournal(t.storage).journal.id,j.id);
 assert.equal(resumePairJournal(t.storage,t.io).ok,true);assert.deepEqual(t.io.read(),t.after);
});
test('ordinary record writers refuse during recovery; only matching operation can write',()=>{
 const t=setup('save');beginPairJournal(t.storage,t.journal);
 assert.equal(writeFleetStorageResult(t.storage,t.after.fleet).reason,'pending-recovery');assert.equal(writeDownSheetStorageResult(t.storage,t.after.sheet).reason,'pending-recovery');
 assert.equal(writeFleetStorageResult(t.storage,t.after.fleet,{recoveryOperationId:'wrong'}).ok,false);
 assert.equal(resumePairJournal(t.storage,t.io).ok,true);
});
test('corrupt recovery is retained and blocks writes rather than inferred or replaced',()=>{
 const t=setup('save');t.values.set(PAIR_RECOVERY_KEY,'{bad');assert.equal(readPairJournal(t.storage).error,'unreadable-recovery');assert.equal(beginPairJournal(t.storage,t.journal).ok,false);assert.equal(writeDownSheetStorageResult(t.storage,t.after.sheet).ok,false);assert.equal(t.storage.getItem(PAIR_RECOVERY_KEY),'{bad');
});
test('adopted completed defect identity survives retry, persisted normalization and later save',()=>{
 const stamp='2026-11-20T00:00:00.000Z';const fleet=[{id:'b',n:'85001',l:'garage-1',s:'out',defects:[{id:'original',category:'Engine',issue:'Misfire',details:'',operability:'down',state:'open',createdAt:stamp,updatedAt:stamp}]}];
 const entry={id:'e',busId:'b',category:'Engine',repair:'Misfire',customReason:'',assignmentType:'Mechanic',assignedTo:'',workflow:'Completed',operationalStatus:'service',repairItems:[{id:'card',category:'Engine',repair:'Misfire',details:'',done:true,estimateEnabled:false,timeEstimate:{}}]};
 const bound=bindDownEntryDefectIds(entry,fleet[0].defects);assert.equal(bound.repairItems[0].defectId,'original');
 const once=applyDownEntryToFleet(fleet,bound,stamp);const reloaded={...bound,repairItems:normalizeRepairItems(JSON.parse(JSON.stringify(bound.repairItems)),{})};const twice=applyDownEntryToFleet(once,reloaded,stamp);
 assert.deepEqual(twice[0].defects.map(d=>d.id),['original']);
 const staleDraft=bindDownEntryDefectIds(entry,once[0].defects,bound);assert.equal(staleDraft.repairItems[0].defectId,'original');assert.deepEqual(applyDownEntryToFleet(once,staleDraft,stamp)[0].defects.map(d=>d.id),['original']);
 const newCard={...entry,id:'new',repairItems:[{...entry.repairItems[0],id:'fresh',repair:'Different fault'}]};const b=bindDownEntryDefectIds(newCard,fleet[0].defects);const first=applyDownEntryToFleet(fleet,b,stamp);assert.equal(applyDownEntryToFleet(first,b,stamp)[0].defects.length,2);
 assert.equal(sameRecoveryValue({a:1,b:undefined},{a:1}),true);
});

test('cloud push and pull pause before client/network work during pending recovery',async()=>{
 const {cloudPush,cloudPull}=await import('../src/lib/cloud/cloud-client.ts');
 const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key===PAIR_RECOVERY_KEY?'pending':null}});
 try{
  const pushed=await cloudPush({buses:[],entries:[],config:{},now:'',sent:{}});assert.equal(pushed.ok,false);assert.match(pushed.message,/recovery/);
  const pulled=await cloudPull({},'');assert.equal(pulled.ok,false);assert.equal(pulled.map,null);assert.match(pulled.message,/recovery/);
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else delete globalThis.localStorage}
});

test('deferred cloud batches stop at the next mutation boundary when recovery begins',async()=>{
 const {executePushPlan}=await import('../src/lib/cloud/cloud-client.ts');
 const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let pending=false,calls=0;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>pending?'pending':null}});
 try{
  const client={from:()=>({upsert:async()=>{calls++;pending=true;return {error:null}},update:()=>{throw Error('must not send another mutation')}})};
  const result=await executePushPlan(client,[{table:'buses',conflict:'fleet_number',upserts:Array.from({length:201},(_,i)=>({fleet_number:String(i)})),updates:[]}]);
  assert.match(result.message,/recovery/);assert.equal(calls,1);
  calls=0;assert.match((await executePushPlan(client,[{table:'buses',conflict:'fleet_number',upserts:[{}],updates:[]}])).message,/recovery/);assert.equal(calls,0);
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else delete globalThis.localStorage}
});
test('generic data-key writes cannot bypass pending recovery and Map mutations gate before bookkeeping',async()=>{
 const {writeSetting}=await import('../src/lib/storage/storage.ts');const t=setup('save');beginPairJournal(t.storage,t.journal);
 assert.equal(writeSetting(t.storage,F,'[]').reason,'pending-recovery');assert.equal(writeSetting(t.storage,S,'[]').reason,'pending-recovery');assert.deepEqual(t.io.read(),t.before);
 const {readFile}=await import('node:fs/promises');const map=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(map,/const executeOperator=[^\n]+\n if\(browserPairRecoveryPending\(\)\)return/);
});
