import {saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus} from "./defect-log-sync.ts";
import {defaultDefectOperability,type StructuredDefect} from "./repair-catalog.ts";
import {quickFilterDefects} from "./quick-filters.ts";
import {HEAT_CATEGORY,HEAT_ISSUE,localDay} from "./heat-check-import.ts";
import {readHeatChecks,recordHeatCheck,writeHeatChecks,type HeatLogProblem,type HeatResult} from "./heat-check-log.ts";
import {DOWN_SHEET_STORAGE_KEY,FLEET_STORAGE_KEY,readDownSheetPayload,readFleetPayload,writeDownSheetStorageResult,writeFleetStorageResult} from "../storage/storage.ts";

/* PUTTING A NO-HEAT RESULT ON A BUS, the one way, for both doors.

   There are two ways a heat check becomes a defect: a photographed sheet
   approved on the review screen, and a mechanic on heat duty tapping NO HEAT
   beside a bus. They are on two different pages, and CLAUDE.md is plain about
   what happens to a rule that lives in a page — so the rule is here, and each
   page hands it a board and writes back what it returns.

   WHAT IT FILES IS AN ORDINARY DEFECT. Curtis: "the heat sheet may not have
   details because someone just checked to make sure heat is working or not. So
   the defect itself has to be editable of course and be no different than
   logging one manually." So it goes through `saveDefectLogRecord`, the function
   the LOG DEFECT form saves through, and gets everything that function gives a
   hand-logged record: the bus's status, its summary line, its place off the
   Down Sheet. Nothing here writes a field of its own.

   That function also refuses the same OPEN repair logged twice on one bus
   inside a few days. It is not what keeps a heat check from duplicating — an
   open heat repair is "already tagged" long before it gets that far — but it
   is why two items for one bus in a single filing leave one record. A heat
   repair that was FINISHED yesterday does not stop today's: a bus that is cold
   again is a new fault, and the form would take it too. */

export type HeatFilingItem={busId:string;busNumber:string;defect:StructuredDefect};

export type HeatFilingResult={
 fleet:DefectLogFleetBus[];
 downEntries:DefectLogDownEntry[];
 filed:HeatFilingItem[];
 /* Refused by the Defect Log's own rules: the bus is gone, or the same repair
    was logged on it too recently to be a second fault. Reported, not retried. */
 skipped:HeatFilingItem[];
};

/* Each item is saved on top of the result of the one before, so two items for
   one bus cannot both be judged against the board as it was. Never onto the
   Down Sheet: Curtis — "they're not necessarily putting the buses with no heat
   on the down list because they're letting them roll every day". */
export function applyHeatFiling(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[],filing:HeatFilingItem[],now=new Date().toISOString()):HeatFilingResult{
 let nextFleet=fleet,nextDown=downEntries;
 const filed:HeatFilingItem[]=[],skipped:HeatFilingItem[]=[];
 for(const item of filing){
  const result=saveDefectLogRecord(nextFleet,nextDown,item.busId,item.defect,false,now);
  if(result.error){skipped.push(item);continue}
  nextFleet=result.fleet;nextDown=result.downEntries;filed.push(item);
 }
 return {fleet:nextFleet,downEntries:nextDown,filed,skipped};
}

/* The record a NO HEAT tap becomes.

   NOT a scan record: its id carries no scan prefix, because one tap is not a
   batch and SCAN BATCHES listing "a heat sheet scan of 1" for every bus
   somebody walked up to would bury the real scans. It is therefore corrected
   the way any hand-logged defect is — on the Defect Log, by whoever knows it
   was wrong — which is why the tap that makes one asks first.

   The details say only what is known — that somebody checked, when, and who —
   and the mechanic adds the rest in the editor like any other defect. */
export function heatTapDefect(by:string,now=new Date().toISOString(),note="",id="defect-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)):StructuredDefect{
 const day=localDay(now),initials=by.trim().toUpperCase();
 const [year,month,date]=day?day.split("-").map(Number):[0,0,0];
 const checked=["Heat check",day?"checked "+month+"/"+date+"/"+year:"",initials?"by "+initials:""].filter(Boolean).join(" · ").replace(" · by "," by ");
 const details=[note.trim(),checked].filter(Boolean).join(" — ");
 return {id,category:HEAT_CATEGORY,issue:HEAT_ISSUE,details,operability:defaultDefectOperability(HEAT_CATEGORY,HEAT_ISSUE),state:"open",createdAt:now,updatedAt:now,source:"defect-log",reportedBy:initials||undefined} as StructuredDefect;
}

export type HeatTapResult=
 /* The board now holds an open heat repair on this bus that it did not before. */
 |{ok:true;filed:true}
 /* Nothing was added, and that is the right answer: the board already holds an
    open heat repair on this bus. */
 |{ok:true;filed:false;why:"already-tagged"}
 |{ok:false;why:"no-bus"|"two-buses"|"unreadable"|"not-saved"};

/* ONE NO HEAT TAP, FROM THE BOARD ON DISK TO THE BOARD ON DISK.

   Fleet Campaigns borrows the fleet to draw counts and never held a copy it was
   safe to write back: its own comment said so, and the Defect Log can have
   saved a dozen records in another tab since this page read anything. So this
   takes STORAGE, not a fleet — it reads the board as it is at the moment of the
   tap, changes the one bus, and writes through the same two functions the
   Defect Log writes through, recovery snapshot and all. The page is handed the
   outcome and re-reads; it is never trusted with the board.

   A bus is found by FLEET NUMBER, and only when exactly one bus has it. A tap
   that could land on either of two buses lands on neither.

   The already-tagged answer is asked of No Heat Buses, the one rule — the tap
   and the scan must agree about what a tagged bus is, or a bus the scan left
   alone would get its duplicate from the list instead. */
type TapStorage=Pick<Storage,"getItem"|"setItem">;
export function fileHeatTap(storage:TapStorage,busNumber:string,by:string,now=new Date().toISOString(),note=""):HeatTapResult{
 const fleetPayload=readFleetPayload<DefectLogFleetBus>(storage.getItem(FLEET_STORAGE_KEY));
 const downPayload=readDownSheetPayload<DefectLogDownEntry>(storage.getItem(DOWN_SHEET_STORAGE_KEY));
 if(!fleetPayload.valid)return {ok:false,why:"unreadable"};
 /* A SHEET THAT CANNOT BE READ REFUSES THE TAP, the same as a board that
    cannot. It fell back to an empty sheet, and the save works out a bus's
    `down` flag from the sheet it is handed — so a bus that IS on the Down Sheet
    came back saying it was not, off a tap that was about its heater. */
 if(!downPayload.valid)return {ok:false,why:"unreadable"};
 const wanted=busNumber.replace(/\D/g,"");
 const matches=wanted?fleetPayload.buses.filter(bus=>String(bus.n??"").replace(/\D/g,"")===wanted):[];
 if(!matches.length)return {ok:false,why:"no-bus"};
 if(matches.length>1)return {ok:false,why:"two-buses"};
 const bus=matches[0];
 if(quickFilterDefects(bus,"no-cabin-heat",now).length)return {ok:true,filed:false,why:"already-tagged"};
 const downEntries=downPayload.entries;
 const result=applyHeatFiling(fleetPayload.buses,downEntries,[{busId:bus.id,busNumber:wanted,defect:heatTapDefect(by,now,note)}],now);
 /* The Defect Log's save turned it down. With the bus found and nothing open
    for heat there is no rule of its that should, so this is reported as the
    failure it is rather than dressed up as a duplicate. */
 if(!result.filed.length)return {ok:false,why:"not-saved"};
 if(!writeFleetStorageResult(storage,result.fleet).ok)return {ok:false,why:"not-saved"};
 /* The sheet is written only when filing changed it. A no-heat defect never
    joins the Down Sheet, so this is normally the same array and is left
    alone — rewriting an unchanged sheet would be a write with nothing in it. */
 if(result.downEntries!==downEntries&&!writeDownSheetStorageResult(storage,result.downEntries).ok)return {ok:false,why:"not-saved"};
 return {ok:true,filed:true};
}

export type HeatTapOutcome=
 /* The check is on the log. `checkId` is what UNDO takes back; `filed` says
    whether this tap also opened a defect, which UNDO does not take back. */
 |{ok:true;checkId:string;filed:boolean}
 |{ok:false;why:"no-initials"|"no-bus"|"two-buses"|"unreadable"|"not-saved"}
 /* THE ONE FAILURE THAT CAN LEAVE SOMETHING BEHIND. NO HEAT opens the defect
    first, so when the check then cannot be written, `filed` says whether the
    board now holds a defect this tap opened. The screen has to say that and
    re-read the board: it was told "nothing was changed" along with every other
    failure, about a bus that had just gained a defect. */
 |{ok:false;why:"check-not-saved";filed:boolean;log:HeatLogProblem};

/* ONE TAP ON THE HEAT LIST, WHOLE: who, the defect if there is one to open, and
   the check. Somebody is standing at a bus.

   This was the page's `checkHeat`, and the cold read that found it there also
   found what living there cost: nothing tested that HEAT OK never opens a
   defect, because the only thing that could be tested was the page's text.

   - INITIALS ARE REQUIRED. A check is "who looked at this bus", and an unsigned
     one is half of that.
   - HEAT OK FILES NOTHING, EVER. It records that somebody checked. It does not
     close a repair either: the board decides who is cold.
   - NO HEAT opens the defect FIRST, and the check is recorded only once the
     board has taken it — the order the scan uses, for the same reason. A
     no-heat check beside a board that never got the defect would put the bus
     under VERIFY with nothing to say why.
   - Both are read fresh from storage at the tap. A page's copy of the log can
     be minutes behind a scan filed in the next tab, and recording onto that
     would write the scan's checks back out of existence. */
export function recordHeatTap(storage:TapStorage,busNumber:string,result:HeatResult,by:string,now=new Date().toISOString(),idSeed=Math.random().toString(36).slice(2,8)):HeatTapOutcome{
 const initials=by.trim().toUpperCase();
 if(!initials)return {ok:false,why:"no-initials"};
 let filed=false;
 if(result==="no-heat"){
  const tap=fileHeatTap(storage,busNumber,initials,now);
  if(!tap.ok)return tap;
  filed=tap.filed;
 }
 const before=readHeatChecks(storage),next=recordHeatCheck(before,{busNumber,result,by:initials},now,idSeed);
 const made=next.find(check=>!before.some(old=>old.id===check.id));
 if(!made)return {ok:false,why:"no-bus"};
 const written=writeHeatChecks(storage,next);
 if(!written.ok)return {ok:false,why:"check-not-saved",filed,log:written.why};
 return {ok:true,checkId:made.id,filed};
}
