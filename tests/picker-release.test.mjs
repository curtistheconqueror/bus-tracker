import assert from 'node:assert/strict';
import test from 'node:test';
import {searchBuses,exactBus} from '../src/lib/fleet/bus-search.ts';
import {blankRepairItem,combineRepairDrafts} from '../src/lib/down-sheet/down-sheet-repair-items.ts';

test('bus number lookup rejects letters, longer prefixes and duplicate identities',()=>{
 const fleet=[{id:'a',n:'17507',l:''},{id:'b',n:'175070',l:''},{id:'c',n:'18505',l:''}];
 for(const text of ['x17507','17507x','bus 18505','18505.0','abc']){
  assert.equal(exactBus(fleet,text),null,text);
  assert.deepEqual(searchBuses(fleet,text),[],text);
 }
 assert.equal(exactBus(fleet,'17507'),null,'a longer matching number blocks automatic choice');
 assert.equal(exactBus([...fleet,{...fleet[2],id:'d'}],'18505'),null);
 assert.equal(exactBus(fleet,'18505')?.id,'c');
});

test('existing-entry handoff retains complete old and new repairs without mutating either draft',()=>{
 const original={...blankRepairItem(),id:'same',category:'Brakes',repair:'Brake chamber leak',details:'original',done:true,actionTaken:'verified'};
 const drafted={...blankRepairItem(),id:'same',category:'Engine',repair:'Check engine light',details:'new work',finding:'code',diagnosticHours:2};
 const before=JSON.stringify([original,drafted]);
 const combined=combineRepairDrafts([original],[drafted,blankRepairItem()]);
 assert.equal(combined.duplicates,false);
 assert.equal(combined.repairItems.length,3,'two substantive repairs plus a fresh blank');
 assert.deepEqual(combined.repairItems[0],original);
 assert.deepEqual({...combined.repairItems[1],id:drafted.id},drafted);
 assert.notEqual(combined.repairItems[1].id,original.id,'card IDs cannot collide');
 assert.equal(combined.focusRepairId,combined.repairItems[1].id);
 assert.equal(JSON.stringify([original,drafted]),before);
});

test('a duplicate is reported without silently deleting either repair',()=>{
 const original={...blankRepairItem(),category:'Brakes',repair:'Brake chamber leak',details:'old'};
 const drafted={...blankRepairItem(),category:'Brakes',repair:'Brake chamber leak',details:'new'};
 const combined=combineRepairDrafts([original],[drafted]);
 assert.equal(combined.duplicates,true);
 assert.equal(combined.repairItems.length,3);
 assert.deepEqual(combined.repairItems.slice(0,2).map(item=>item.details),['old','new']);
});
