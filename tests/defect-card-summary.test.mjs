import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { defectLogRecords, groupDefectLogRecords, oldestActiveDefectLoggedAtByBus } from "../src/lib/defects/defect-log-sync.ts";

test("oldest active Defect Log stamp uses the original logged time before applying feed filters",()=>{
 const defect=(id,state,createdAt,extra={})=>({id,source:"defect-log",category:"Engine",issue:id,details:"",operability:"service",state,createdAt,updatedAt:createdAt,...extra});
 const fleet=[
  {id:"one",n:"10001",s:"defect",l:"garage-main",parkedAt:"2026-06-10T12:00:00Z",defects:[
   defect("new","open","2026-11-25T19:00:00Z"),
   defect("worked-later","in-progress","2026-09-01T12:00:00Z",{updatedAt:"2026-11-25T20:00:00Z"}),
   defect("old-held","deferred","2026-08-31T20:30:00-05:00",{updatedAt:"2026-11-25T21:00:00Z"}),
   defect("fixed","completed","2026-07-01T12:00:00Z"),
   defect("removed","open","2026-07-02T12:00:00Z",{defectLogHiddenAt:"2026-08-01T12:00:00Z"}),
   defect("unknown","open","",{updatedAt:"2026-07-03T12:00:00Z"}),
   defect("invalid","open","not-a-date"),
   defect("tracker-only","open","2026-07-04T12:00:00Z",{source:"tracker"}),
  ]},
  {id:"two",n:"10002",s:"defect",l:"garage-main",defects:[
   defect("other","open","2026-11-01T12:00:00Z"),defect("other-fixed","completed","2026-08-01T12:00:00Z"),
  ]},
  {id:"three",n:"10003",s:"service",l:"garage-main",defects:[defect("only-fixed","completed","2026-08-01T12:00:00Z")]},
  {id:"four",n:"10004",s:"defect",l:"garage-main",defects:[defect("only-undated","open","")]},
 ];
 const records=defectLogRecords(fleet,[]);
 const oldest=oldestActiveDefectLoggedAtByBus(records);
 const [visible]=groupDefectLogRecords(records.filter(({defect})=>defect.id==="new"));
 assert.equal(visible.updatedAt,"2026-11-25T19:00:00Z","the existing LATEST is still scoped to the visible group");
 assert.equal(oldest.get(visible.bus.id),"2026-08-31T20:30:00-05:00","the old active defect is outside the filtered view and edited later");
 assert.equal(oldest.get("two"),"2026-11-01T12:00:00Z");
 assert.equal(oldest.has("three"),false,"fixed-only bus has no active stamp");
 assert.equal(oldest.has("four"),false,"no made-up date for an undated active defect");
 const next=records.map(record=>record.defect.id==="old-held"?{...record,defect:{...record.defect,state:"completed"}}:record);
 assert.equal(oldestActiveDefectLoggedAtByBus(next).get("one"),"2026-09-01T12:00:00Z","completing it moves the stamp to the next active defect");
 const mixedOffsets=records.map(record=>record.defect.id==="worked-later"?{...record,defect:{...record.defect,createdAt:"2026-09-01T00:00:00Z"}}:record);
 assert.equal(oldestActiveDefectLoggedAtByBus(mixedOffsets).get("one"),"2026-09-01T00:00:00Z","compare instants rather than timestamp strings");
});


test("detailed bus header leaves issue descriptions to expanded rows while compact cards retain their preview",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const times=page.slice(page.indexOf('className="log-group-times"'),page.indexOf('className="group-toggle"',page.indexOf('className="log-group-times"')));
 assert.match(times,/\{latestStamp\}.*?OLDEST \{timeLabel\(oldestActiveAt\)\}/);
 const header=page.slice(page.indexOf('className="log-card-main log-group-header"'),page.indexOf('className="grouped-defect-list"'));
 assert.match(header,/className="log-repair"><b>[^<]+<\/b><\/span>/);
 assert.doesNotMatch(header,/\{preview\}|more defect/);
 assert.match(page,/className="compact-issue"><strong>\{preview\}<\/strong>/);
 assert.match(page,/className="grouped-defect-main"[^]*?<strong>\{defectLabel\(record\.defect\)\}<\/strong>/);
});
