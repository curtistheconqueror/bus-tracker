import assert from "node:assert/strict";
import test from "node:test";
import {recentDefectDuplicate,saveDefectLogRecord,searchCatalogForCategory} from "./helpers/modules.mjs";

test("the Brakes picker exposes both service-brake pull directions as distinct defects",()=>{
 const roadside="Pulls to R/S when service brakes are applied";
 const curbside="Pulls to C/S when service brakes are applied";
 const expected=[roadside,curbside];
 for(const query of ["","pulls service brakes"]){
  const {inCategory}=searchCatalogForCategory(query,"Brakes");
  const pulls=inCategory.filter(row=>row.value.startsWith("Pulls to "));
  assert.deepEqual(pulls.map(({category,value,label})=>[category,value,label]),
   expected.map(issue=>["Brakes",issue,issue]));
 }
 const now="2026-11-25T20:15:00.000Z";
 const record={id:"roadside",category:"Brakes",issue:roadside,details:"",operability:"down",state:"open",
  source:"defect-log",createdAt:now,updatedAt:now};
 const bus={id:"bus-1",n:"17501",s:"defect",l:"road-1",defects:[record]};
 assert.equal(recentDefectDuplicate(bus,{...record,id:"another"},now)?.id,"roadside");
 const result=saveDefectLogRecord([bus],[],"bus-1",{...record,id:"curbside",issue:curbside},false,now);
 assert.equal(result.error,null);
 assert.deepEqual(result.fleet[0].defects.map(defect=>defect.issue).sort(),[...expected].sort());
});
