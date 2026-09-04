"use client";

/* One Settings page for the whole app.

   Every page used to keep its own settings behind its own gear: the Facility
   Map's modal held fifteen sections, the Down Sheet's held five, the Defect
   Log's eight, and Fixed Repairs re-read the Defect Log's key to show three of
   those again. Finding "the setting for X" meant knowing which page owned it.
   Now the gear is a page, in the nav beside the other five, and it holds one
   large section per page.

   Each section renders that page's OWN panel, inline - the same component the
   gear used to open as a modal, with the shade and the close button switched
   off. That is deliberate: a copy of each panel would be a second thing to
   keep right, and these panels are already right.

   The sections collapse. Open, all four together ran to fourteen phone
   screens, which is not a settings page anybody scrolls; the map's alone is
   eleven sections. FACILITY MAP starts open and the other three start closed,
   and a section's title row is the thing you press to open it. A closed
   section stays mounted, only hidden, so its panel's storage listeners keep
   running and its state is where you left it when you open it again.

   What this page does not take is the Facility Map's four ACTIONS - backup and
   transfer, repair cleanup, creating a bus, renumbering one. Those act on the
   board rather than describe it, and they stay on the map. */

import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import TrackerNav from "../tracker-nav";
/* Every page's own stylesheet, so each panel here looks exactly as it did
   behind that page's gear. settings.css comes LAST: all three of these, and
   globals.css before them, style html, body, header and nav, and the last word
   on the page shell has to be this page's. */
import "../defect-log/defect-log.css";
import "../down-sheet/down-sheet.css";
import "../fixed-repairs/fixed-repairs.css";
import "./settings.css";
import MapSettingsPanel from "../map-settings-panel";
import {BOARD_SETTINGS_KEY,readBoardSettings,writeBoardSettings} from "../map-settings";
import DownSheetSettings from "../down-sheet/down-sheet-settings";
import {DOWN_SHEET_SETTINGS_KEY,readDownSheetSettings,writeDownSheetSettings} from "../down-sheet/down-sheet-settings-store";
import LogSettingsModal from "../defect-log/defect-log-settings-modal";
import {FONT_STACKS,SETTINGS_KEY as LOG_SETTINGS_KEY,readSettings as readLogSettings,type LogSettings} from "../defect-log/defect-log-settings";
import {FixedAppearanceModal,type FixedAppearanceSettings} from "../fixed-repairs/fixed-repairs-settings";
import {defectLogRecords,locationLabel,type DefectLogDownEntry,type DefectLogFleetBus} from "../defect-log/defect-log-sync";
import {normalizeDefects} from "../repair-catalog";
import {mergeDuplicateDefects} from "../duplicate-defects";
import {readMergedAway,writeMergedAway,type MergedAwayDefects} from "../cloud-sync";
import {reconcileDownSheetMembership} from "../down-sheet-counter";
import SectionTransferControls from "../section-transfer-controls";
import {exportDefectLogPayload,exportDownSheetPayload,mergeDefectLog,mergeDownSheet,mergeSummary} from "../section-transfer";
import {shareOrDownloadFile} from "../share-file";
import {exportFleetBoardBackup} from "../fleet-backup";
import SaveAlert from "../save-alert";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetPayload,readFleetPayload,writeDownSheetStorageResult,writeFleetStorageResult,writeSetting,type FleetWriteOptions,type FleetWriteReason,type StorageWriteResult} from "../storage";

/* The map's duty-cycle average reads two histories the Defect Log's bus type
   never needed to know about. */
type SettingsBus=DefectLogFleetBus&{odometerReadings?:unknown;engineHourReadings?:unknown};
/* mergedAway is the tombstone ledger as it stood BEFORE the merge, so undoing
   also stops this device tombstoning records it has just put back. */
type MergeUndo={fleet:SettingsBus[];downEntries:DefectLogDownEntry[];mergedAway:MergedAwayDefects;label:string};

type SectionKey="map"|"down"|"log"|"fixed";
/* The map first because it is the page the app opens on; the rest closed so
   the page is four title rows long until somebody asks for more. */
const DEFAULT_OPEN:Record<SectionKey,boolean>={map:true,down:false,log:false,fixed:false};

function readFleet(raw:string|null):SettingsBus[]{const payload=readFleetPayload<SettingsBus>(raw);return payload.valid?payload.buses.map(bus=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}
function readDown(raw:string|null):DefectLogDownEntry[]{const payload=readDownSheetPayload<DefectLogDownEntry>(raw);return payload.valid?payload.entries:[]}
/* The Defect Log writes its settings object whole, and so does this - over
   whatever the key holds, in case a later release adds a field this page has
   not heard of. */
function writeLogSettings(storage:Storage,next:LogSettings){
 let current:Record<string,unknown>={};
 try{current=JSON.parse(storage.getItem(LOG_SETTINGS_KEY)||"{}")||{}}catch{current={}}
 return writeSetting(storage,LOG_SETTINGS_KEY,JSON.stringify({...current,...next}));
}
function noop(){}

/* One stored value: read once after mount, re-read when another tab writes
   the key, and written back through `write` on every change.

   The latest copy lives in a ref as well as in state, because a panel can
   call update twice in one tick - "set the theme to custom, then set this one
   colour" is exactly what the map's colour fields do - and the second call
   must build on the first, not on the render both came from. Built on state
   alone, the second write put the old theme back over the first. */
function useStoredSettings<T extends object>(key:string,read:(raw:string|null)=>T,write:(storage:Storage,next:T)=>StorageWriteResult,report:(result:StorageWriteResult)=>void){
 const [value,setValue]=useState<T>(()=>read(null));
 const latest=useRef<T|null>(null);
 useEffect(()=>{
  const load=(raw:string|null)=>{const next=read(raw);latest.current=next;setValue(next)};
  load(localStorage.getItem(key));
  const receive=(event:StorageEvent)=>{if(event.key===key)load(event.newValue)};
  window.addEventListener("storage",receive);
  return()=>window.removeEventListener("storage",receive);
 },[key,read]);
 const update=(patch:Partial<T>)=>{const next={...(latest.current??value),...patch};latest.current=next;setValue(next);report(write(localStorage,next))};
 return [value,update] as const;
}

/* A section's title row, which is also the control that opens and closes it.
   One button, the whole width, so the target is the row and not a chevron
   somebody has to aim for; the chevron only says which way it will go. */
function SectionHead({id,kicker,title,open,onToggle}:{id:string;kicker:string;title:string;open:boolean;onToggle:()=>void}){
 return <h2 className="settings-section-head" id={id+"-heading"}>
  <button type="button" className="settings-section-toggle" aria-expanded={open} aria-controls={id+"-body"} onClick={onToggle}>
   <span className="settings-section-kicker">{kicker}</span>
   <span className="settings-section-title">{title}</span>
   <span className="settings-section-chevron" aria-hidden="true">&#9662;</span>
  </button>
 </h2>;
}

/* The body is hidden rather than unmounted when closed, on purpose - see the
   file comment. `hidden` is the attribute, so the browser handles it; the
   stylesheet only has to not defeat it. */
function SectionBody({id,open,children}:{id:string;open:boolean;children:ReactNode}){
 return <div id={id+"-body"} className="settings-section-body" hidden={!open}>{children}</div>;
}

export default function SettingsPage(){
 const [saveProblem,setSaveProblem]=useState<FleetWriteReason|"">("");
 const report=(result:StorageWriteResult)=>setSaveProblem(result.reason||"");
 const [board,updateBoard]=useStoredSettings(BOARD_SETTINGS_KEY,readBoardSettings,writeBoardSettings,report);
 const [down,updateDown]=useStoredSettings(DOWN_SHEET_SETTINGS_KEY,readDownSheetSettings,writeDownSheetSettings,report);
 const [log,updateLog]=useStoredSettings(LOG_SETTINGS_KEY,readLogSettings,writeLogSettings,report);

 const [open,setOpen]=useState<Record<SectionKey,boolean>>(DEFAULT_OPEN);
 const toggle=(key:SectionKey)=>setOpen(current=>({...current,[key]:!current[key]}));
 /* A jump link opens what it jumps to. Landing on a closed title row and
    having to press it again is the kind of thing that reads as broken. */
 const reveal=(key:SectionKey)=>setOpen(current=>current[key]?current:{...current,[key]:true});

 /* The board and the sheet, for the parts of this page that act on records:
    the section transfers, the log report, and MERGE DUPES. */
 const [fleet,setFleet]=useState<SettingsBus[]>([]);
 const [downEntries,setDownEntries]=useState<DefectLogDownEntry[]>([]);
 const [mergeUndo,setMergeUndo]=useState<MergeUndo|null>(null);
 useEffect(()=>{
  setFleet(readFleet(localStorage.getItem(FLEET_KEY)));setDownEntries(readDown(localStorage.getItem(DOWN_KEY)));
  const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue));if(event.key===DOWN_KEY)setDownEntries(readDown(event.newValue))};
  window.addEventListener("storage",receive);
  return()=>window.removeEventListener("storage",receive);
 },[]);

 /* Returns the fleet write's result so a caller can tell whether anything was
    actually stored. The state is not advanced on a refusal, on purpose: the
    screen keeps showing what is stored rather than a change that did not land. */
 const persist=(nextFleet:SettingsBus[],nextDown:DefectLogDownEntry[],options:FleetWriteOptions={}):StorageWriteResult=>{
  const written=writeFleetStorageResult(localStorage,nextFleet,options);
  setSaveProblem(written.reason||"");
  if(!written.ok)return written;
  setFleet(nextFleet);setDownEntries(nextDown);
  const sheet=writeDownSheetStorageResult(localStorage,nextDown);
  if(!sheet.ok)setSaveProblem(sheet.reason||"");
  return written;
 };
 const refused="Nothing was imported: this device refused the write. The notice at the top of the page says why.";

 /* How many open repairs are recorded more than once, from the same function
    that does the merging - so the number on the button is by construction the
    number the button will act on, rather than a second count that can disagree
    with it. */
 const duplicateCount=useMemo(()=>mergeDuplicateDefects(fleet,downEntries).removed,[fleet,downEntries]);
 /* Fold exact repeats into one record each.

    Explicit, and pressed by a person. Never automatic on load: everything else
    that runs at read time in this app rearranges what is SHOWN, while this
    changes stored repair records, and a board that silently rewrites those the
    moment it opens is one nobody can audit. */
 const mergeDuplicates=()=>{
  /* Recomputed rather than read off the button. The button is a render behind
     whatever just changed, and this decides what gets written. */
  const preview=mergeDuplicateDefects(fleet,downEntries);
  if(!preview.removed){alert("No duplicate defects were found. Every open repair on this board is recorded once.");return}
  const buses=preview.busesAffected;
  if(!confirm("Merge "+preview.removed+" duplicate record"+(preview.removed===1?"":"s")+" on "+buses+" bus"+(buses===1?"":"es")+"?\n\nOnly exact repeats are merged — same category, same symptom, same details. Everything written on the copies is kept on the record that stays, along with the earliest reported date. Nothing is merged across buses, and UNDO MERGE reverses it until you leave this page."))return;
  const now=new Date().toISOString();
  const result=mergeDuplicateDefects(fleet,downEntries,now);
  const before=readMergedAway(localStorage);
  /* allowBulkDefectLoss, and only here.

     The safety stop refuses any write that drops five or more records, which
     is exactly right for a sync or a bug and exactly wrong for this: folding
     21 duplicates is a deliberate, confirmed cleanup whose entire point is to
     end with fewer records, and the count was shown in the prompt before
     anybody agreed to it. Left guarded, the merge silently did nothing - the
     board kept all 42 records, the button kept saying 21, and the alert below
     still claimed success. Measured, not guessed: 42 defects before, 42
     after, with the safety stop firing behind a success message.

     The recovery snapshot is deliberately NOT skipped, so the pre-merge board
     is still written to pace-board-recovery-v1 before anything changes. That
     plus the confirm count, UNDO MERGE, and merge rules that provably keep
     every field is the safety net here - not the blanket record-count guard,
     which cannot tell a cleanup from a catastrophe. */
  const written=persist(result.buses,result.entries,{allowBulkDefectLoss:true});
  /* Nothing below may run on a write that did not happen. Claiming a merge
     that was refused is how somebody stops trusting the number, and the
     tombstones are worse than cosmetic: they would tell the Shop Cloud to
     drop records this device still holds. */
  if(!written.ok)return;
  setMergeUndo({fleet,downEntries,mergedAway:before,label:"Merged "+result.removed+" duplicate record"+(result.removed===1?"":"s")});
  /* A push only sends what a bus still carries, so a folded record is not
     removed anywhere by merging alone: it stays live on the server, comes back
     on the next GET THE SHOP'S COPY, and the merge undoes itself. Writing the
     ids down is what makes the cleanup survive a sync - this device refuses
     them on the way in, and tombstones them on the way out. */
  writeMergedAway(localStorage,{...before,
   ...Object.fromEntries(result.groups.flatMap(group=>group.droppedIds.map(id=>[id,now])))});
  alert(result.removed+" duplicate record"+(result.removed===1?"":"s")+" merged on "+result.busesAffected+" bus"+(result.busesAffected===1?"":"es")+". Nothing was deleted — each fault is now on one record.");
 };
 const undoMerge=()=>{
  if(!mergeUndo)return;
  if(!persist(mergeUndo.fleet,mergeUndo.downEntries).ok)return;
  writeMergedAway(localStorage,mergeUndo.mergedAway);
  setMergeUndo(null);
 };

 /* A snapshot to read or send to somebody; it cannot be imported back. */
 const exportLog=()=>{const records=defectLogRecords(fleet,downEntries),payload={kind:"fleet-real-time-defect-log",version:1,exportedAt:new Date().toISOString(),records:records.map(record=>({busNumber:record.bus.n,busStatus:record.bus.s,location:locationLabel(record.bus.l),...record.defect,onDownSheet:record.onDownSheet}))},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),filename="fleet-defect-log-"+new Date().toISOString().slice(0,10)+".json";void shareOrDownloadFile(blob,filename,"Defect Log report")};

 const logTransfer=<SectionTransferControls kind="defect-log" buildPayload={()=>exportDefectLogPayload(fleet)} applyPayload={payload=>{const {buses,report:merged}=mergeDefectLog(fleet,payload);return persist(buses as SettingsBus[],downEntries).ok?mergeSummary("defect-log",merged):refused}}/>;
 const downTransfer=<SectionTransferControls kind="down-sheet" buildPayload={()=>exportDownSheetPayload(downEntries)} applyPayload={payload=>{
  const {entries,report:merged}=mergeDownSheet(downEntries,payload,fleet);
  /* Entries are stored as they arrive. The Down Sheet normalizes every entry
     it reads - at hydration and on the storage event - so a field another
     device never wrote is filled in there, the way it always has been.

     What cannot wait for the sheet to open is membership. The map draws its DS
     badges from each bus's down flag, and only the Down Sheet page reconciles
     that from the entries; imported here with the flags left alone, a bus the
     other device put on the sheet would carry no badge until somebody opened
     the sheet on this one. */
  const active=entries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId);
  return persist(reconcileDownSheetMembership(fleet,active),entries).ok?mergeSummary("down-sheet",merged):refused;
 }}/>;

 /* Fixed Repairs has no settings of its own: it reads the Defect Log's theme,
    font and colours off the same key. So its panel is driven from the same
    state as the Defect Log's, and either one changes both. Two readers of
    one key would race - a change on one panel, then a change on the other,
    and the second writes its stale copy of the first's field back. */
 const fixed:FixedAppearanceSettings={theme:log.theme,fontSize:log.fontSize,fontFamily:log.fontFamily,appearance:log.appearance};
 const logStyle={...(log.groupBorder?{"--log-card-border":log.groupBorder}:{}),"--log-page":log.appearance.page,"--log-surface":log.appearance.surface,"--log-text":log.appearance.text,"--log-muted":log.appearance.muted,"--log-header":log.appearance.header,"--log-header-text":log.appearance.headerText,"--log-accent":log.appearance.accent,"--log-font":FONT_STACKS[log.fontFamily]} as CSSProperties;
 const fixedScale=log.fontSize==="extra"?"1.22":log.fontSize==="large"?"1.1":"1";
 const fixedStyle={"--fixed-page":log.appearance.page,"--fixed-surface":log.appearance.surface,"--fixed-ink":log.appearance.text,"--fixed-muted":log.appearance.muted,"--fixed-header":log.appearance.header,"--fixed-header-text":log.appearance.headerText,"--fixed-accent":log.appearance.accent,"--fixed-font":FONT_STACKS[log.fontFamily],"--fixed-scale":fixedScale} as CSSProperties;
 const sectionClass=(key:SectionKey,name:string)=>"settings-section settings-section-"+name+(open[key]?" open":" closed");

 return <main className="settings-app">
  <SaveAlert reason={saveProblem} onExport={async()=>{await exportFleetBoardBackup(localStorage,fleet)}}/>
  <header className="settings-header"><div><span>FLEET MAINTENANCE</span><h1>Settings</h1><p>Every page's settings in one place. Press a title to open that page's settings; changes save on this device as you make them.</p></div><TrackerNav active="/settings"/></header>
  <nav className="settings-jump" aria-label="Settings sections">
   <a href="#facility-map" onClick={()=>reveal("map")}>FACILITY MAP</a><a href="#down-sheet" onClick={()=>reveal("down")}>DOWN SHEET</a><a href="#defect-log" onClick={()=>reveal("log")}>DEFECT LOG</a><a href="#fixed-repairs" onClick={()=>reveal("fixed")}>FIXED REPAIRS</a>
  </nav>
  <div className="settings-sections">
   <section id="facility-map" className={sectionClass("map","map")} aria-labelledby="facility-map-heading">
    <SectionHead id="facility-map" kicker="FACILITY MAP" title="Board settings" open={open.map} onToggle={()=>toggle("map")}/>
    <SectionBody id="facility-map" open={open.map}>
     <p className="settings-section-blurb">Shop Cloud, bus markers, the DS badge, touch controls, maintenance intervals, confirmation prompts, themes and every colour on the board. Backup and transfer, repair cleanup, and creating or renumbering a bus stay on the map behind ACTIONS.</p>
     <MapSettingsPanel buses={fleet} board={board} update={updateBoard}/>
    </SectionBody>
   </section>
   <section id="down-sheet" className={sectionClass("down","down")} aria-labelledby="down-sheet-heading">
    <SectionHead id="down-sheet" kicker="DOWN SHEET" title="Sheet settings" open={open.down} onToggle={()=>toggle("down")}/>
    <SectionBody id="down-sheet" open={open.down}>
     <p className="settings-section-blurb">Defaults for new entries, the sheet's wording and text style, and moving the sheet to another device.</p>
     <DownSheetSettings inline transfer={downTransfer} defaultInitials={down.defaultInitials} setDefaultInitials={value=>updateDown({defaultInitials:value})} defaultShift={down.defaultShift} setDefaultShift={value=>updateDown({defaultShift:value})} showCompleted={down.showCompleted} setShowCompleted={value=>updateDown({showCompleted:value})} display={down.display} setDisplay={value=>updateDown({display:value})} onClose={noop}/>
    </SectionBody>
   </section>
   <section id="defect-log" className={sectionClass("log","log")} aria-labelledby="defect-log-heading" style={logStyle}>
    <SectionHead id="defect-log" kicker="DEFECT LOG" title="Log settings" open={open.log} onToggle={()=>toggle("log")}/>
    <SectionBody id="defect-log" open={open.log}>
     <p className="settings-section-blurb">Your initials, the default view, theme, font, colours, wording and text style, the backup reminder, moving the log to another device, and the log report. The panel below is drawn in the theme you pick, so what you see here is what the log will look like.</p>
     <LogSettingsModal inline settings={log} setSettings={next=>updateLog(next)} close={noop} exportLog={exportLog} transfer={logTransfer}/>
     <section className="log-settings-group settings-tools" aria-labelledby="duplicates-heading">
      <h3 id="duplicates-heading">DUPLICATE RECORDS</h3>
      <p>One fault on a bus should be one record. This folds exact repeats — same category, same symptom, same details — into one record each, keeping everything written on every copy and the earliest date it was seen. It never runs on its own. The count on the button is live.</p>
      <div className="settings-tool-row">
       <button type="button" className="merge-duplicates" onClick={mergeDuplicates} disabled={!duplicateCount} title={duplicateCount?duplicateCount+" open repair"+(duplicateCount===1?" is":"s are")+" recorded more than once":"Every open repair on this board is recorded once"}>MERGE DUPES{duplicateCount?" ("+duplicateCount+")":""}</button>
       {mergeUndo&&<button type="button" className="undo-merge" onClick={undoMerge} title={mergeUndo.label+" — put every record back"}>UNDO MERGE</button>}
      </div>
     </section>
    </SectionBody>
   </section>
   <section id="fixed-repairs" className={sectionClass("fixed","fixed")} aria-labelledby="fixed-repairs-heading" style={fixedStyle}>
    <SectionHead id="fixed-repairs" kicker="FIXED REPAIRS" title="Appearance" open={open.fixed} onToggle={()=>toggle("fixed")}/>
    <SectionBody id="fixed-repairs" open={open.fixed}>
     <p className="settings-section-blurb">Fixed Repairs shares the Defect Log's theme, font and colours: one setting, two pages. Change it here or under Defect Log and both follow.</p>
     <FixedAppearanceModal inline settings={fixed} setSettings={next=>updateLog({theme:next.theme,fontSize:next.fontSize,fontFamily:next.fontFamily,appearance:next.appearance})} close={noop}/>
    </SectionBody>
   </section>
  </div>
 </main>;
}
