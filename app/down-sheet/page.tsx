"use client";

import StatusReportModal from "@/src/components/reports/status-report-modal";
import {DOWN_SHEET_FILTERS,downSheetFilterCounts,downSheetFilterEntries,type DownSheetFilterKey} from "@/src/lib/down-sheet/down-sheet-filters";
import {downSheetShareFilename,downSheetShareHtml,downSheetShareScope,downSheetShareScopeLabel,downSheetShareText} from "@/src/lib/down-sheet/down-sheet-share";
import {copyText,shareOrDownloadFile} from "@/src/lib/shared/share-file";
import {Fragment,useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import TrackerNav from "@/src/components/shared/tracker-nav";
import RefreshButton from "@/src/components/shared/refresh-button";
import "./down-sheet.css";
import "./down-sheet-tablet.css";
import DownSheetEditor from "./_components/down-sheet-editor";
import DownSheetScanner from "./_components/down-sheet-scanner";
import ScanPaper from "@/src/components/scan/scan-paper";
import {PAPER_DOOR,PAPER_PHOTOS_PARAM,PAPER_SCAN_PARAM} from "@/src/lib/scan/paper-kinds";
import {paperHandIn,type HandedPhotos} from "@/src/lib/scan/paper-handoff";
import {readSweep,startSweep} from "@/src/lib/fleet/facility-sweep";
import {applyDownEntryToFleet} from "@/src/lib/down-sheet/down-sheet-sync";
import {matchingUnresolvedDefectId} from "@/src/lib/defects/duplicate-defects";
import {learnFinding,readFindingsMemory,writeFindingsMemory} from "@/src/lib/defects/findings-memory";
import {clearDownSheetState,DOWN_SHEET_CLEAR_UNDO_KEY,readDownSheetClearSnapshot,restoreDownSheetState} from "@/src/lib/down-sheet/down-sheet-clear";
import {defectSupportingDetails,isUnresolved,normalizeFinding,type StructuredDefect} from "@/src/lib/defects/repair-catalog";
import {reconcileDownSheetMembership} from "@/src/lib/down-sheet/down-sheet-counter";
import {addMintedEntries,mintSkippedMessage} from "@/src/lib/down-sheet/sheet-mint";
import {clearAddedInApp,entryOriginLabel,markAddedInApp} from "@/src/lib/down-sheet/entry-origin";
import {reconcileRoadCallsFromSheet} from "@/src/lib/fleet/road-calls";
import {estimateFromHours,formatRepairTime,normalizeRepairTimeEstimate,repairTimeTotal,type RepairTimeEstimate} from "@/src/lib/down-sheet/repair-time-estimates";
import {blankRepairItem,isQuarantineEntry,normalizeRepairItems,repairItemsProgress,repairItemsReason,repairItemsTotal,type DownSheetRepairItem} from "@/src/lib/down-sheet/down-sheet-repair-items";
import type {ScanImportRecord} from "@/src/lib/down-sheet/down-sheet-scan-import";
import {prepareFleetForScannedReplacement,scannedSheetRemovals} from "@/src/lib/down-sheet/down-sheet-replace";
import {recordSheetSwap} from "@/src/lib/down-sheet/sheet-ledger";
import {readShiftSettings} from "@/src/lib/settings/shift-clock";
import {downSheetAvailability,downSheetMentionsIdot,downSheetIdotOnly,isSoftDownEntry,isEntryInService,entryInServiceStamp,setEntryInService} from "@/src/lib/down-sheet/down-sheet-availability";
import {downSheetRoadCounts,downSheetRoadEntries,groupDownSheetEntries,normalizeDownSheetSectionOrder,orderDownSheetGroups,isDownSheetRoadLocation,matchesDownSheetSearch,type DownSheetGroupKey,type DownSheetRoadKind} from "@/src/lib/down-sheet/down-sheet-view";
import {DEFAULT_DOWN_SHEET_DISPLAY,normalizeDownSheetDisplay,type DownSheetDisplaySettings} from "@/src/lib/down-sheet/down-sheet-display-settings";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetPayload,readFleetPayload,writeDownSheetStorage,writeDownSheetStorageResult,writeFleetStorage,writeFleetStorageResult,writeSetting,type FleetWriteReason} from "@/src/lib/storage/storage";
import SaveAlert from "@/src/components/shared/save-alert";
import {DeferredNavBadge,DeferredReviewPrompt} from "@/src/components/shared/deferred-watch";
import {exportFleetBoardBackup} from "@/src/lib/storage/fleet-backup";
import ShopCloudLive from "@/src/components/shared/shop-cloud-live";
import {forgetRemovedEntries,rememberRemovedEntries} from "@/src/lib/cloud/cloud-sync";
import MysteryBoard from "@/src/components/down-sheet/mystery-board";
import DeferredBoard from "./_components/deferred-board";
import RecommendedBoard from "./_components/recommended-board";
import {WATCH_LISTS,watchListCounts,watchListLabel,sheetToolFromSearch,SHEET_TOOL_PARAM,type WatchListKey} from "@/src/lib/down-sheet/down-sheet-watch-lists";
import SheetSectionBoard from "./_components/sheet-section-board";
/* The route this page is, as SCAN SHEET and the hand-off name it. */
const PAPER_HERE="/down-sheet";
/* The five boards' own collapsed keys, the counts' open key and ADVANCED
   ACTIONS' open key are NO LONGER READ (release 213): the boards open from
   QUICK FILTERS, and the three rows under ADD DOWN BUS start closed on every
   visit. Curtis: "Make sure that those 3 options ... are hidden by default".
   The keys stay listed in CLAUDE.md and are left alone on devices. */
import type {DefectLogDownEntry,DefectLogFleetBus} from "@/src/lib/defects/defect-log-sync";
import {answerDeferredBus} from "@/src/lib/defects/deferred-actions";
import {answerRecommendedBus} from "@/src/lib/defects/recommended-actions";
import {useAppMode} from "@/src/components/shared/welcome-gate";
import {hiddenInLite} from "@/src/lib/settings/lite-mode";
import {DEFAULT_DEFECT_LOG_DISPLAY,normalizeDefectLogDisplay} from "@/src/lib/defects/defect-log-display-settings";
import AppName from "@/src/components/shared/app-name";
import WelcomeGate from "@/src/components/shared/welcome-gate";
import {OPTIONAL_DOWN_TILES,type OptionalDownTile} from "@/src/lib/down-sheet/down-sheet-settings-store";

type FleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
type Shift="1st"|"2nd"|"3rd";
type ShiftFilter="All"|Shift;
type Workflow="Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
type AssignmentType="Mechanic"|"Vendor";
type RepairSection="Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";

type FleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;foreman?:string;shift?:string;
 down?:boolean;notes?:string;pendingRepair?:string;defects?:StructuredDefect[];roadcall?:boolean;parkedAt?:string;
};

type RepairHistory={at:string;initials:string;action:string};

type DownEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 repairItems?:DownSheetRepairItem[];
 assignmentType:AssignmentType;assignedTo:string;section:RepairSection;shift:Shift;
 workflow:Workflow;operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";
 timeEstimate:RepairTimeEstimate;
 /* What was actually done, captured when the entry is closed out. The Down
    Sheet already knew who was assigned and never wrote it anywhere the repair
    history could read, so a completed entry reached Fixed Repairs with no
    technician, no fix, no time and no cause on it. All optional: a foreman
    closing ten buses at end of shift must never be made to fill in a form to
    flip a dropdown. */
 completedBy?:string;
 /* Set wherever the APP put this row on the sheet — ADD DOWN BUS, the board's
    own `down` flag, the map's ON DOWN SHEET tick, or the Defect Log — and
    cleared by the next scan that names the bus. Absent on a row off a scanned
    sheet and on every row that predates the field, because the label it drives
    claims "this was not on the office's sheet" and that is not something the
    app can know about an old record. See
    `src/lib/down-sheet/entry-origin.ts`. Rides in the cloud row's `detail`
    blob, so it reaches other devices without a schema migration. */
 /* `true` rather than `boolean`: the only two legal states are present-and-true
    and absent. `addedInApp:false` would be a key holding a falsy value, and the
    cloud fingerprints a row by walking Object.keys — writing it would move the
    fingerprint of a row whose content had not changed. Measured. */
 addedInApp?:true;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const MAX_ENTRIES=98;
/* ONE SET OF RULES FOR BOTH MINT PATHS. `MAX_ENTRIES` is the ACTIVE capacity —
   that is what it means at ADD DOWN BUS, at the scan import's refusal, at PUT
   BACK, on the button and on the capacity tile. It was applied to the sheet's
   TOTAL in the two mint paths alone, which deleted stored repair records on a
   page load and dropped buses that were genuinely down. See
   `src/lib/down-sheet/sheet-mint.ts`; module scope so neither path can hold a
   different copy of it. */
const MINT_RULES={activeLimit:MAX_ENTRIES,isActive:(entry:DownEntry)=>isActive(entry),busIdOf:(entry:DownEntry)=>String(entry?.busId??"")};
const SETTINGS_KEY="pace-down-sheet-settings-v1";
const SCAN_UNDO_KEY="pace-down-sheet-scan-undo-v1";
/* The last thing done to a single row, kept so it can be taken back. Separate
   from the scan and clear undos on purpose: deleting or closing out one bus is
   daily work and must not consume the copy a whole cleared sheet is waiting on.

   One slot covers both actions. They are the two ways a row leaves the active
   sheet, only one can be the most recent, and a foreman who has just pressed
   the wrong one wants the same words in the same place either way. */
const ENTRY_UNDO_KEY="pace-down-sheet-entry-undo-v1";
/* This key holds more than this page writes to it — the Settings page owns some
   of the same blob — so the sheet's own write merges over what is stored rather
   than replacing it. It used to replace, which meant any field the sheet did
   not itself know about was blanked the next time somebody changed a sort order
   on the sheet. Nothing depended on that until now; the tile choices and the
   quick-notes switch are set from the Settings page and read here. */
function readStoredDownSettings():Record<string,unknown>{
 try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")||{}}catch{return {}}
}
type RowAction={kind:"deleted"|"fixed";id:string;busNumber:string};
function readRowAction(raw:string|null):RowAction|null{
 if(!raw)return null;
 try{const parsed=JSON.parse(raw);const entry=parsed?.entry;
  if(!entry||typeof entry.id!=="string"||typeof entry.busId!=="string")return null;
  /* Anything written before this carried a delete and nothing else, so an
     absent kind reads as one rather than throwing the copy away. */
  return {kind:parsed.kind==="fixed"?"fixed":"deleted",id:entry.id,busNumber:String(entry.busNumber||"")};
 }catch{return null}
}
const STATUS_LABELS:Record<FleetStatus,string>={service:"In Service / On Road",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};

function shiftFromFleet(value?:string):Shift{
 if(value==="Evening")return "2nd";
 if(value==="Night")return "3rd";
 return "1st";
}

function normalizeEntry(value:Partial<DownEntry>,index:number):DownEntry{
 const now=new Date().toISOString();
 return {...value,
  id:value.id||"repair-imported-"+index,
  defectId:value.defectId,
  busId:value.busId||"",
  busNumber:value.busNumber||"",
  category:value.category||"Miscellaneous",
  repair:value.repair||"Repair required",
  customReason:value.customReason||"",
  repairItems:normalizeRepairItems(value.repairItems,{category:value.category||"Miscellaneous",repair:value.repair||"Repair required",details:value.customReason||"",timeEstimate:value.timeEstimate,entryCompleted:value.workflow==="Completed"}),
  assignmentType:value.assignmentType||"Mechanic",
  assignedTo:value.assignedTo||"",
  completedBy:value.completedBy||"",
  section:value.section||"Pending",
  shift:value.shift||"1st",
  workflow:value.workflow||"Scheduled",
  operationalStatus:value.operationalStatus||"out",
  priority:value.priority||"Routine",
  timeEstimate:normalizeRepairTimeEstimate(value.timeEstimate,value.category||"Miscellaneous",value.repair||"Repair required"),
  createdAt:value.createdAt||now,
  updatedAt:value.updatedAt||now,
  updatedBy:value.updatedBy||"",
  completedAt:value.completedAt||"",
  history:Array.isArray(value.history)?value.history:[],
 };
}

function entriesFromFleet(fleet:FleetBus[]):DownEntry[]{
 const now=new Date().toISOString();
 /* EVERY BUS FLAGGED DOWN IS A CANDIDATE. This cut the list at 98 before
    anything looked at it, so a 99th down bus was gone before the capacity
    check could even report it as skipped — silently, which is the one way
    this must not happen. `addMintedEntries` applies the ACTIVE cap and hands
    back what it could not fit. */
 return fleet.filter(bus=>bus.down===true).map(bus=>({
  /* Minted because the board says this bus is down, which is the app's own
     say-so rather than the office's paper. Same label as a typed row. */
  addedInApp:true as const,
  id:"repair-"+bus.id,
  busId:bus.id,
  busNumber:bus.n,
  category:bus.defects?.find(isUnresolved)?.category||"Miscellaneous",
  repair:bus.defects?.find(isUnresolved)?.issue||bus.pendingRepair?.trim()||STATUS_LABELS[bus.s]||"Repair required",
  customReason:bus.defects?.find(isUnresolved)?.details||"",
  repairItems:(bus.defects||[]).filter(isUnresolved).map((defect,index)=>({...blankRepairItem(index),category:defect.category,repair:defect.issue,details:defectSupportingDetails(defect),estimateEnabled:true,timeEstimate:estimateFromHours(defect.estimateHours,defect.category,defect.issue)})),
  assignmentType:"Mechanic",
  assignedTo:bus.mechanic||"",
  section:bus.roadcall?"Roadcall":"Pending",
  shift:shiftFromFleet(bus.shift),
  workflow:bus.s==="shop"?"In Progress":"Scheduled",
  operationalStatus:bus.s,
  priority:"Routine",
  createdAt:bus.parkedAt||now,
  updatedAt:now,
  updatedBy:"",
  completedAt:"",
  history:[],
 })).map(normalizeEntry);
}

/* Two of three finished must not read the same as a bus nobody has touched.
   The count is what the foreman scans down the sheet for. */
function repairProgressLabel(entry:DownEntry){
 const progress=repairItemsProgress(entry.repairItems||[]);
 return progress.done>0&&!progress.complete
  ?progress.done+" OF "+progress.total+" DONE"
  :(entry.repairItems||[]).length+" REPAIRS";
}
function reasonLabel(entry:DownEntry){return entry.repairItems?.length?repairItemsReason(entry.repairItems):[entry.category,entry.repair,entry.customReason].filter(Boolean).join(" — ")}
function entryEstimateMinutes(entry:DownEntry){if(isQuarantineEntry(entry))return 0;return entry.repairItems?repairItemsTotal(entry.repairItems):repairTimeTotal(entry.timeEstimate)}
function isActive(entry:DownEntry){return entry.workflow!=="Completed"}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){if(!value)return "Not updated";return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}

export default function DownSheet(){
 /* SHARE in the header opens the whole-sheet share and STATUS REPORT below
    it (release 213). Closed on every visit. */
 const [shareOpen,setShareOpen]=useState(false);
 const [saveProblem,setSaveProblem]=useState<FleetWriteReason|"">("");
 const [fleet,setFleet]=useState<FleetBus[]>([]);
 const [entries,setEntries]=useState<DownEntry[]>([]);
 const [filter,setFilter]=useState<ShiftFilter>("All");
 const [showCompleted,setShowCompleted]=useState(false);
 /* The COMPLETED TODAY tile as a view rather than an ornament. It counted the
    right thing and did nothing when pressed, so the one question it answers —
    what did we actually finish today — could only be reached by turning on
    SHOW COMPLETED and reading past everything else on the sheet. */
 const [fixedToday,setFixedToday]=useState(false);
 const [hydrated,setHydrated]=useState(false);
 const [editing,setEditing]=useState<DownEntry|null>(null);
 /* Initials typed in the editor before ADD TO THAT ENTRY, handed to the
    editor that opens on the existing entry. Forgotten when the editor shuts,
    so the next entry opened starts the ordinary way. */
 const [carriedInitials,setCarriedInitials]=useState("");
 /* Set when the editor was reopened by ADD TO THAT ENTRY, so the new editor
    can put the keyboard on the blank card. Forgotten with the editor. */
 const [reopened,setReopened]=useState(false);
 useEffect(()=>{if(!editing){setCarriedInitials("");setReopened(false)}},[editing]);
 const [scannerOpen,setScannerOpen]=useState(false);
 /* SCAN SHEET IS THE DOOR, NOT THE SCANNER. Pressing it opens the box that
    takes the photos and works out which sheet they are (`paperOpen`); the
    Down Sheet scanner (`scannerOpen`) opens only once that has handed it
    photos, and a heat sheet or a sweep is sent to the Defect Log instead.
    Until this the button opened the scanner directly, and a heat sheet
    photographed here was read as a Down Sheet.

    A hand-off is for ONE opening: left in place, the scanner's next opening
    would start on yesterday's photos. Dropped when the scanner SHUTS,
    however it came to be shut — on the change from open to shut, not whenever
    it is shut, which is also true the moment the page opens and would race
    the effect below that takes a hand-off off the address. */
 const [paperOpen,setPaperOpen]=useState(false);
 const [handed,setHanded]=useState<HandedPhotos|null>(null);
 const scannerWasOpen=useRef(false);
 useEffect(()=>{if(scannerWasOpen.current&&!scannerOpen)setHanded(null);scannerWasOpen.current=scannerOpen},[scannerOpen]);
 const openPaperHere=(next:HandedPhotos)=>{setPaperOpen(false);setHanded(next);setScannerOpen(true)};
 const [defaultInitials,setDefaultInitials]=useState("");
 const [defaultShift,setDefaultShift]=useState<Shift>("1st");
 const [extraTiles,setExtraTiles]=useState<OptionalDownTile[]>([]);
 const [showQuickNotes,setShowQuickNotes]=useState(false);
 /* THE THREE TABS UNDER SEARCH — SHIFT, COUNTS, FILTERS — and which one's
    panel is open, if any (release 213). One at a time, none on every visit, and
    the open tab's second tap hides it again. Not stored. Curtis: "I don't want
    the screen just defaulting to them being expanded already." */
 const [openTab,setOpenTab]=useState<"shift"|"counts"|"filters"|null>(null);
 const toggleTab=(tab:"shift"|"counts"|"filters")=>setOpenTab(current=>current===tab?null:tab);
 /* Which of the five watch lists is open where the boards used to stand, if
    any. One at a time, and never together with a sheet filter: QUICK FILTERS
    holds one choice. */
 const [watchList,setWatchList]=useState<WatchListKey|null>(null);
 const appMode=useAppMode();
 const [displaySettings,setDisplaySettings]=useState<DownSheetDisplaySettings>(DEFAULT_DOWN_SHEET_DISPLAY);
 const [quickNotes,setQuickNotes]=useState("");
 const [savedQuickNotes,setSavedQuickNotes]=useState("");
 const [search,setSearch]=useState("");
 const [sectionOrder,setSectionOrder]=useState<DownSheetGroupKey[]>(()=>normalizeDownSheetSectionOrder(null));
 /* Which of the two road tallies is being read, if either. Not persisted: it is
    a question somebody asks of the sheet in the moment, not a preference. */
 const [roadFilter,setRoadFilter]=useState<DownSheetRoadKind|null>(null);
 /* The sheet narrowed to one question, so that what is shared IS the answer.

    Curtis asked for this to make the sheet sendable: "we should have a quick
    filters list for that actually so I can share the downsheet with someone
    wanting details." The person being sent it is asking which buses are waiting
    on parts, not for all forty rows, and a list is worth sending only when it
    is that list. */
/* THE FULL SWEEP QUESTION AFTER A SCAN, and why it is no longer a confirm().

   A confirm() offers OK and CANCEL, and the browser owns both words. Curtis:
   "There is not a 'no' for an answer if I am not doing a full sweep of the
   yard." Cancel reads as backing out of the question rather than answering it,
   and the two are not the same thing here — NO has something to say.

   The old second line promised the Status Report as a reward for ending a
   sweep. It is gone: "The summary report is ALWAYS READY anyway. At anytime I
   can send it because it's real time snap shot of the fleet's health."

   WHAT THE QUESTION IS ACTUALLY FOR, which is the part worth keeping. A scan
   REPLACES the sheet and the Facility Map does not move with it, so right after
   an import the map can disagree with the paper — a bus in the wrong place, one
   reading as a mystery bus, one carrying a number that has since been written
   against a different bus. Curtis: "if a person uploads sheets, then they may
   see mystery buses, or things like that that are switched around or buses that
   are labeled incorrectly due to the new down sheet because the facility map did
   not change with the down sheet's upload." A walk is what reconciles them, so
   NO is answered with that warning rather than with silence. */
 const [sweepAsk,setSweepAsk]=useState<""|"ask"|"mismatch">("");
 const [quickFilter,setQuickFilter]=useState<DownSheetFilterKey|null>(null);
 /* Two failure states rather than one. The first version of this bar reported a
    failed COPY LIST as "COULD NOT SHARE — TRY COPY LIST", which sends somebody
    to press the button that had just failed. */
 const [shareStatus,setShareStatus]=useState<""|"copied"|"shared"|"saved"|"copy-error"|"share-error">("");
 const [undoClearAvailable,setUndoClearAvailable]=useState(false);
 const [undoScanAvailable,setUndoScanAvailable]=useState(false);
 /* The bus number is held with the id so the notice can name the bus it would
    take back, rather than saying "the last one". */
 const [rowAction,setRowAction]=useState<RowAction|null>(null);
 /* MYSTERY BUSES moved here from the Defect Log — every bus it lists is a bus
    that is NOT on this sheet, which is the question a foreman reading the sheet
    is actually asking.

    Two things came with it rather than being rebuilt. Its collapsed flag keeps
    the Defect Log key it was written under, because renaming a key throws away
    what the device already holds. And its wording is still read from the Defect
    Log's display settings, so a foreman who renamed the panel keeps his name
    for it instead of being reset to the default by a move he did not make. */
 /* Buses flagged down that the active cap had no room for. Shown rather than
    dropped: three buses silently losing their row AND their map badge on a
    sheet holding two active entries is exactly the failure the sheet exists
    to prevent. */
 const [mintSkipped,setMintSkipped]=useState("");
 const [mysteryDisplay,setMysteryDisplay]=useState(DEFAULT_DEFECT_LOG_DISPLAY);

 // Restore the existing device-local fleet and down sheet once after hydration.
 /* A BUS THAT ALREADY HAS A ROW DOES NOT GET A SECOND ONE, AND A COMPLETED ROW
    IS A ROW. This counted only the ACTIVE entries, so a bus still flagged
    `down` whose only entry was Completed came back as a BRAND NEW Scheduled
    row under a different id on the very next load — the repair re-opening
    itself, and two rows for one bus on the sheet. Measured: seed one bus with
    down:true and a single Completed entry, open the Down Sheet, and the stored
    sheet holds `e1:Completed` plus `repair-a:Scheduled`.

    This app does not delete repair records and it must not invent them either.
    With all entries counted, a completed bus mints nothing, no active entry
    exists for it, and `reconcileDownSheetMembership` below clears its flag —
    which is the right answer: the work is done, so the bus comes off the
    sheet.

    WHY IT SURVIVED — and the first answer written here was wrong. It said the
    storage-event handler below already did it this way, so whichever path ran
    second decided the outcome. A `storage` event never fires in the document
    that WROTE the key; CLAUDE.md says so itself about `pace-header-theme-v1`,
    "which only ever fires in the OTHER tabs". On one phone with one tab that
    handler never runs at all, so it cannot have been the second path.

    The copy that actually disagreed is on the FACILITY MAP: `app/page.tsx`
    runs `reconcileDownSheetMembership` on its own mount, and with a bus
    flagged down whose only entry is Completed, loading just the map clears the
    flag. So the duplicate row appeared or not depending on WHICH PAGE was
    opened first — not on which guard in this file ran second. Three copies,
    one of them cited wrongly, on a project whose stated rule is that a rule in
    two places is the hazard. The rule is in `src/lib/down-sheet/sheet-mint.ts`
    now and both paths here call it. */
 useEffect(()=>{try{const fleetPayload=readFleetPayload<FleetBus>(localStorage.getItem(FLEET_KEY)),nextFleet=fleetPayload.valid?fleetPayload.buses:[];setFleet(nextFleet);const downPayload=readDownSheetPayload<DownEntry>(localStorage.getItem(DOWN_KEY)),nextEntries=downPayload.valid?downPayload.entries:[],restored=nextEntries.map(normalizeEntry),minted=addMintedEntries(restored,entriesFromFleet(nextFleet),MINT_RULES);setEntries(minted.entries);setMintSkipped(mintSkippedMessage(minted.skipped,MAX_ENTRIES));setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY))));setUndoScanAvailable(Boolean(localStorage.getItem(SCAN_UNDO_KEY)));setRowAction(readRowAction(localStorage.getItem(ENTRY_UNDO_KEY)));try{setMysteryDisplay(normalizeDefectLogDisplay(JSON.parse(localStorage.getItem("pace-defect-log-settings-v1")||"{}").display))}catch{}const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"),note=typeof settings.quickNotes==="string"?settings.quickNotes:"";setShowCompleted(Boolean(settings.showCompleted));setDefaultInitials(typeof settings.defaultInitials==="string"?settings.defaultInitials:"");setDefaultShift((["1st","2nd","3rd"] as string[]).includes(settings.defaultShift)?settings.defaultShift:"1st");setQuickNotes(note);setSavedQuickNotes(note);setSectionOrder(normalizeDownSheetSectionOrder(settings.sectionOrder));setExtraTiles((Array.isArray(settings.extraTiles)?settings.extraTiles:[]).filter((key:unknown)=>OPTIONAL_DOWN_TILES.some(tile=>tile.key===key)));setShowQuickNotes(settings.showQuickNotes===true);setDisplaySettings(normalizeDownSheetDisplay(settings.display))}catch{setFleet([]);setEntries([])}setHydrated(true)},[]);
 /* A door on ANOTHER page sends a Vehicle Down Sheet here to be read. No
    page has one today — the Defect Log's was taken off — and this is kept so
    that putting SCAN SHEET on any other page is one button and no plumbing.
    This and the load above both run as the page opens, and what they set
    lands in one render, so the scanner mounts with the fleet and the current
    sheet already in hand. That matters because it starts reading by itself,
    and a read matched against an empty fleet would call every bus unknown.
    The parameters come off the address once acted on, so a reload does not
    throw the scanner up again, and the history entry keeps the state the
    router left in it. */
 useEffect(()=>{
  const url=new URL(window.location.href),arrived=paperHandIn(url.search,PAPER_HERE);
  if(!arrived)return;
  setHanded(arrived);setScannerOpen(true);
  url.searchParams.delete(PAPER_SCAN_PARAM);url.searchParams.delete(PAPER_PHOTOS_PARAM);
  window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
 },[]);

 // Active Down Sheet rows are the single source of truth for every tracker checkbox and DS badge.
 /* Road calls are reconciled here beside DS membership, and for the same
    reason: this is the one place every change to the sheet passes through — a
    scan, a hand-typed row, a cloud merge — so a road call that arrived on paper
    reaches the bus record no matter which of those brought it. The alternative
    was hooking the scanner alone, which would have covered one of the three. */
 useEffect(()=>{if(!hydrated)return;setSaveProblem(writeDownSheetStorageResult(localStorage,entries).reason||"");const activeIds=entries.filter(isActive).map(entry=>entry.busId);setFleet(current=>{const membership=reconcileDownSheetMembership(current,activeIds);const roadCalled=reconcileRoadCallsFromSheet(membership,entries).fleet;if(roadCalled!==current)writeFleetStorage(localStorage,roadCalled);return roadCalled})},[entries,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,SETTINGS_KEY,JSON.stringify({...readStoredDownSettings(),showCompleted,defaultInitials,defaultShift,quickNotes:savedQuickNotes,sectionOrder,extraTiles,showQuickNotes,display:displaySettings}))},[showCompleted,defaultInitials,defaultShift,savedQuickNotes,sectionOrder,extraTiles,showQuickNotes,displaySettings,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY&&event.newValue){const payload=readFleetPayload<FleetBus>(event.newValue);if(payload.valid){const nextFleet=payload.buses;setFleet(nextFleet);setEntries(current=>{const merged=current.map(entry=>{const bus=nextFleet.find(item=>item.id===entry.busId);if(!bus)return entry;const activeDefect=bus.defects?.find(isUnresolved),incoming=bus.pendingRepair?.trim()||"",currentReason=reasonLabel(entry);if(activeDefect)return {...entry,operationalStatus:bus.s,category:activeDefect.category,repair:activeDefect.issue,customReason:activeDefect.details};return {...entry,operationalStatus:bus.s,...(incoming&&incoming!==currentReason?{category:"Miscellaneous",repair:"Driver-reported defect",customReason:incoming}:{})}}),minted=addMintedEntries(merged,entriesFromFleet(nextFleet),MINT_RULES);return minted.entries})}}if(event.key===DOWN_KEY&&event.newValue){const payload=readDownSheetPayload<DownEntry>(event.newValue);if(payload.valid)setEntries(payload.entries.map(normalizeEntry))}if(event.key===DOWN_SHEET_CLEAR_UNDO_KEY)setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(event.newValue)));if(event.key===SCAN_UNDO_KEY)setUndoScanAvailable(Boolean(event.newValue));if(event.key===ENTRY_UNDO_KEY)setRowAction(readRowAction(event.newValue));/* Settings are edited on the shared page now. This page writes its whole settings object back whenever a field changes, so it has to take the new values into its own state or its next write would put the stale copy over them. */if(event.key===SETTINGS_KEY){try{const saved=JSON.parse(event.newValue||"{}");setShowCompleted(saved.showCompleted===true);if(typeof saved.defaultInitials==="string")setDefaultInitials(saved.defaultInitials);if(saved.defaultShift==="1st"||saved.defaultShift==="2nd"||saved.defaultShift==="3rd")setDefaultShift(saved.defaultShift);setDisplaySettings(normalizeDownSheetDisplay(saved.display))}catch{}}};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const active=useMemo(()=>entries.filter(isActive),[entries]);
 /* Where each bus actually is, which is the first thing the section rules ask.
    The map owns this — the sheet only reads it — so it is looked up by bus id
    rather than copied onto the entry, where it would go stale the moment
    somebody moved the bus on the map. */
 const locations=useMemo(()=>Object.fromEntries(fleet.map(bus=>[bus.id,bus.l||""])),[fleet]);
 const shown=useMemo(()=>entries.filter(entry=>(fixedToday?entry.workflow==="Completed"&&isToday(entry.completedAt):(showCompleted||isActive(entry)))&&(filter==="All"||entry.shift===filter)&&matchesDownSheetSearch(entry,search)),[entries,filter,showCompleted,search,fixedToday]);
 /* Counted BEFORE the road filter is applied, so pressing one tally does not
    empty the other one out from under the person reading it. Both stay on
    screen saying what they always said; only the sheet below narrows. */
 const roadCounts=useMemo(()=>downSheetRoadCounts(shown,locations),[shown,locations]);
 /* The status report is grouped from the whole sheet and the table from the road
    filter, which is why these are two groupings rather than one.

    Pressing INSPECTIONS ON ROAD is a request to SEE those buses, not a claim
    that the sheet now holds seven. Sharing one grouping made the tally rewrite
    every tile above it — TOTAL ON SHEET read 7 while 57 buses were down — so a
    foreman who pressed it to read the list off the sheet lost the numbers he
    had pressed it from. The row count, the estimate and the note below still
    follow the filter, because those describe the view. */
 /* Bus number, always. The ORDER control offered BUS NUMBER up, down and WORK
    CATEGORIES beside the search box, and Curtis took it out: the sheet is
    already numerical inside each band, and nobody was going to pick anything
    else standing at a bus. What people DO want to change is which band they
    read first, and that is a setting rather than a control on the page.

    The sort helper keeps its parameter — the Defect Log's own views still pass
    other orders through it. */
 /* IDOT-ONLY ROWS DO NOT GO IN THE BANDS. A bus whose whole entry is PREP FOR
    IDOT is not down and must not be read as though it were. Curtis: "those
    three buses, no, they're not on the down sheet, but we do need a separate
    section on the down sheet for IDOT buses... they're still being used. It's
    just that we have to be aware that the time to send them to IDOT for state
    inspection is coming up. It doesn't mean the bus can't run."

    They are not dropped — the IDOT board below lists them, and their entry is
    untouched, so nothing a scan wrote is lost. A row that is IDOT AND a fault
    stays in its band, because the fault is why it is there. */
 const bandEntries=useMemo(()=>shown.filter(entry=>!downSheetIdotOnly(entry)),[shown]);
 const sheetGroups=useMemo(()=>orderDownSheetGroups(groupDownSheetEntries(bandEntries,"number-asc",locations),sectionOrder),[bandEntries,locations,sectionOrder]);
 /* The band tiles used to render straight off sheetGroups, so their order on
    the board was whatever DOWN_SHEET_GROUPS happened to be in. They are placed
    by name now, because the order Curtis set interleaves them with tiles that
    are not bands at all - COMPLETED TODAY sits between SCHEDULED and
    UNSCHEDULED. The bands below the sheet still read sheetGroups directly. */
 const tileFor=(key:string)=>{const group=sheetGroups.find(item=>item.key===key);return group?<div className={"group-count group-"+group.key} key={group.key}><strong>{group.entries.length}</strong><span>{group.label}</span></div>:null};
 /* Both narrowings compose, and the quick filter goes LAST so that what it
    reports is what is on the screen. Applied the other way round, the count in
    the note would have been the quick filter's own tally of the whole sheet
    while the rows below it were also cut down by the road filter — a bar
    reading "9 of 41" above six rows. */
 const groups=useMemo(()=>{
  if(!roadFilter&&!quickFilter)return sheetGroups;
  let rows=roadFilter?downSheetRoadEntries(shown,locations,roadFilter):shown;
  if(quickFilter)rows=downSheetFilterEntries(rows,locations,quickFilter);
  return orderDownSheetGroups(groupDownSheetEntries(rows,"number-asc",locations),sectionOrder);
 },[sheetGroups,shown,locations,roadFilter,quickFilter,sectionOrder]);
 const visible=useMemo(()=>groups.flatMap(group=>group.entries),[groups]);
 /* Counted off `shown` rather than off `visible`, so the menu says how many
    each filter WOULD show. Counted off the filtered list, every number but the
    active one would read 0 the moment a filter was on, and the menu would stop
    being a way to choose the next question. */
 const quickFilterCounts=useMemo(()=>downSheetFilterCounts(shown,locations),[shown,locations]);
 /* Down buses: on the sheet for a fault rather than only for maintenance.

    A bus whose row says nothing but PM'S is due for service, not broken, and a
    foreman asking "how many buses am I down" does not mean it. A bus with a
    fault written on it counts, and so does a bus carrying BOTH — "PM'S /
    MISFIRES" is a bus with a live misfire whatever else is owed on it.

    Same question the DOWNED BUSES ON ROAD tally already asks, asked of the
    whole sheet instead of only the buses out on the road, so the two numbers
    are defined the same way and the smaller can never exceed the larger. */
 /* DOWN SPLIT IN TWO, because one number was answering two questions.

    A foreman opens this page to find out how many buses he is short at pullout,
    and buses held for another garage's technicians or written up SHORT RUN ONLY
    were being counted as though they could not turn a wheel. Reconciled against
    a real paper sheet the app said 47 where the shop counted 39.

    hardDownCount is what DOWN BUSES now means. softDownCount is the buses the
    sheet has explicitly said still run. Together they are every bus the sheet is
    carrying for a fault, which is what the old single number counted — so
    hardDownCount + softDownCount + the IDOT-only rows equals the old total, and
    no bus has gone missing from the page by being reclassified. */
 /* OPEN rows only (release 213, found in review). With SHOW COMPLETED or
    COMPLETED TODAY on, `shown` carries finished rows, and the sheet title read
    "7 DOWN" over seven fixed buses. A completed row is not a bus that is down. */
 const hardDownCount=useMemo(()=>shown.filter(entry=>isActive(entry)&&downSheetAvailability(entry)==="down").length,[shown]);
 /* The soft buses nobody has put on a run. A bus the yard has decided to use
    is not part of the morning's shortage, which is the whole point of the
    switch, so the number follows the decision. */
 const softDownCount=useMemo(()=>shown.filter(entry=>isActive(entry)&&isSoftDownEntry(entry)&&!isEntryInService(entry)).length,[shown]);
 const inServiceCount=useMemo(()=>shown.filter(entry=>isActive(entry)&&isSoftDownEntry(entry)&&isEntryInService(entry)).length,[shown]);
 /* Every row that MENTIONS the state inspection, down or not: the section
    exists to keep an eye on what is coming due, and a bus can be both. */
 const idotEntries=useMemo(()=>shown.filter(downSheetMentionsIdot),[shown]);
 /* The board lists EVERY soft bus, in service or not — taking one off the list
    the moment it is switched on would hide the control that switched it. */
 const softEntries=useMemo(()=>shown.filter(isSoftDownEntry),[shown]);
 /* What each watch list in QUICK FILTERS would open on, counted by the same
    functions the boards list from (`down-sheet-watch-lists.ts`). */
 const watchCounts=useMemo(()=>watchListCounts({fleet:fleet as unknown as Parameters<typeof watchListCounts>[0]["fleet"],downEntries:entries as DefectLogDownEntry[],activeDownBusIds:active.map(entry=>entry.busId),softRows:softEntries.length,idotRows:idotEntries.length}),[fleet,entries,active,softEntries,idotEntries]);
 /* Flipping writes to the entry and saves the sheet, so it reaches the other
    devices the way every other entry change does. */
 const toggleInService=(entryId:string,on:boolean)=>{
  const now=new Date().toISOString();
  const next=entries.map(entry=>entry.id===entryId?setEntryInService(entry,on,now,defaultInitials):entry);
  const written=writeDownSheetStorage(localStorage,next);
  setSaveProblem(written.reason||"");
  if(written.reason)return;
  setEntries(next);
 };
 const visibleMinutes=visible.reduce((total,entry)=>total+entryEstimateMinutes(entry),0);
 const counters={active:active.length,first:active.filter(entry=>entry.shift==="1st").length,second:active.filter(entry=>entry.shift==="2nd").length,third:active.filter(entry=>entry.shift==="3rd").length,pending:active.filter(entry=>entry.section==="Pending").length,accident:active.filter(entry=>entry.section==="Accident").length,waiting:active.filter(entry=>entry.workflow==="Waiting for Parts").length,completedToday:entries.filter(entry=>entry.workflow==="Completed"&&isToday(entry.completedAt)).length,activeMinutes:active.reduce((total,entry)=>total+entryEstimateMinutes(entry),0)};
 /* Opened after the round, which is when somebody is about to be asked. */
 const [reportOpen,setReportOpen]=useState(false);
 /* What gets sent is exactly what is on the screen: `visible`, after both
    narrowings, in the order the sheet is drawn. Rebuilding the list from the
    filter alone would send something nobody had looked at. */
 const shareRows=visible as unknown as Parameters<typeof downSheetShareText>[1];
 /* SHARING THE SHEET ITSELF, which until now needed a quick filter first.
    Curtis: "a separate function in the down sheet section where I can just
    share the down sheet list with a person." The three actions already existed
    and already sent what was on screen; they were only reachable once a filter
    had been picked, so there was no way to send the sheet.

    WHAT THIS SHARE COVERS IS DECIDED IN THE LIB, not here. The page reports
    its own view state and `downSheetShareScope` turns that into the claim the
    heading makes, so a route can ask the same question without a second copy
    of the rule - and so the rule is testable away from a page this suite
    cannot render. A cold read found the first version, which decided it
    inline, making that claim falsely in four different ways.

    `drawn` against `onSheet` is the part that does not go stale: the bands
    drop IDOT-only rows on their own, and a list of flags would have missed
    that one and will miss the next. */
 const shareScope=downSheetShareScope({quickFilter,search,shiftFiltered:filter!=="All",
  roadFiltered:Boolean(roadFilter),fixedToday,showCompleted,drawn:visible.length,onSheet:shown.length});
 const shareLabel=downSheetShareScopeLabel(shareScope);
 /* THE STATUS BELONGS TO THE ROWS IT WAS EARNED ON, and the bar no longer
    unmounts to take it away. Pressing COPY LIST then typing in SEARCH left
    "COPIED!" sitting under a heading describing a different set of buses,
    with nothing in the page that would ever clear it.

    KEYED ON WHICH BUSES, not how many: a review caught that the first
    version used `visible.length`, so swapping one matching bus for another
    in SEARCH - same count, same label - left the old status standing over
    rows it was never about. The ids are device-local, which does not matter
    here because this only ever compares one render against the next on the
    same device. */
 const shareStatusKey=shareLabel+"|"+visible.map(entry=>entry.id).join(",");
 useEffect(()=>{setShareStatus("")},[shareStatusKey]);
 /* What the one line under the scope says: a press wins over the hint while
    it stands, and EVERY outcome gets a word here, COPY LIST included.

    The button changing to COPIED! is the only thing a sighted person needs,
    which is why `copied` was the one state with no branch - and it is also
    why a screen reader heard nothing when a copy succeeded. The line is the
    announcement; the duplication with the button is the price, measured at
    360 and 390 and worth it. */
 const shareNote=shareStatus==="copied"?{said:true,text:"COPIED!"}
  :shareStatus==="shared"?{said:true,text:"SENT"}
  :shareStatus==="saved"?{said:true,text:"SAVED TO THIS DEVICE"}
  :shareStatus==="share-error"?{said:true,text:"COULD NOT SHARE — TRY COPY LIST"}
  :shareStatus==="copy-error"?{said:true,text:"COULD NOT COPY ON THIS DEVICE — TRY SHARE TEXT"}
  :{said:false,text:quickFilter?DOWN_SHEET_FILTERS.find(item=>item.key===quickFilter)?.hint||"":"Sends the buses on the screen right now, as text or as a page."};
 const copyFilteredList=async()=>{try{await copyText(downSheetShareText(shareScope,shareRows,locations));setShareStatus("copied")}catch{setShareStatus("copy-error")}};
 /* Text first, and the clipboard when there is no share sheet — the same order
    the Defect Log settled on. A browser with no navigator.share must not leave
    somebody pressing a button that does nothing. */
 const shareFilteredList=async()=>{
  const text=downSheetShareText(shareScope,shareRows,locations);
  if(typeof navigator.share!=="function"){await copyFilteredList();return}
  try{await navigator.share({title:"Down Sheet — "+shareLabel,text});setShareStatus("shared")}
  catch(error){if((error as Error).name!=="AbortError")setShareStatus("share-error")}
 };
 const shareFilteredPage=async()=>{
  const stamp=new Date().toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  const html=downSheetShareHtml(shareScope,shareRows,locations,stamp);
  try{
   const outcome=await shareOrDownloadFile(new Blob([html],{type:"text/html"}),downSheetShareFilename(shareScope),"Down Sheet — "+shareLabel);
   setShareStatus(outcome==="cancelled"?"":outcome==="shared"?"shared":"saved");
  }catch{setShareStatus("share-error")}
 };
 const openNewEntry=()=>{if(active.length>=MAX_ENTRIES){alert("The active down sheet has reached its 98-entry capacity.");return}/* THE FORM OPENS WITH NO BUS CHOSEN, and that is the whole point of this line.

     It used to seed `fleet.find(item=>!active.some(...))` — the first bus that
     happened not to have an entry yet — into busId, busNumber and
     operationalStatus. So "+ ADD DOWN BUS" opened already pointed at a real
     bus, chosen by array order and nothing else, and the `Select bus` option
     was never the state anybody actually saw. A person who filled in the repair
     and pressed SAVE without touching the bus field wrote a live Down Sheet
     entry against a bus picked at random, with no warning, because the
     `if(!bus)` guard in the editor could never fire.

     Empty instead. The editor already fills busNumber and operationalStatus
     from whichever bus is chosen, so nothing is lost — and that guard now
     works. The availability check stays, because telling somebody the sheet is
     full before they fill in a form is worth doing; it just no longer hands its
     answer to the draft. */
 const available=fleet.some(item=>!active.some(entry=>entry.busId===item.id));if(!available){alert("Every available fleet bus already has an active down-sheet entry.");return}const now=new Date().toISOString();/* ADDED IN THE APP, NOT OFF THE OFFICE SHEET. Curtis: "if we add it directly, it will show the badge... a little label or something that says added manually. That way, at least, we'll know that it was not on the downsheet originally." Cleared by the next scanned sheet, which replaces the row - at which point the bus IS on the master sheet. */
  setEditing(markAddedInApp<DownEntry>({id:"repair-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),busId:"",busNumber:"",category:"",repair:"",customReason:"",repairItems:[blankRepairItem()],assignmentType:"Mechanic",assignedTo:"",section:"Pending",shift:defaultShift,workflow:"Scheduled",operationalStatus:"unknown",priority:"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,"",""),createdAt:now,updatedAt:now,updatedBy:"",completedAt:"",history:[]}))};
 const saveQuickNote=()=>{setSavedQuickNotes(quickNotes);try{const current=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");localStorage.setItem(SETTINGS_KEY,JSON.stringify({...current,showCompleted,defaultInitials,defaultShift,quickNotes,sectionOrder,display:displaySettings}))}catch{localStorage.setItem(SETTINGS_KEY,JSON.stringify({showCompleted,defaultInitials,defaultShift,quickNotes,sectionOrder,display:displaySettings}))}};
 /* The DEFERRED board hands its answer back here rather than writing, so a
    refused write is reported by this page like every other one and the board
    never saves behind it — the same contract the mystery board's onMoved has.

    The rules themselves live in deferred-actions.ts, shared with the evening
    review prompt: the same decision about the same bus, and two copies of it
    would drift into a bus that is half returned on one screen and still held on
    the other.

    The FLEET goes first and alone. A fleet that saved and a sheet that did not
    is a real outcome — the bus is off DEFERRED either way — and telling
    somebody nothing was saved when the bus already moved is its own kind of
    wrong. Nothing is written at all if the board's answer would not save. */
 const answerDeferred=(busId:string,defects:StructuredDefect[],action:"downsheet"|"return")=>{
  const now=new Date().toISOString(),bus=fleet.find(item=>item.id===busId),label=bus?.n||busId;
  const applied=answerDeferredBus(fleet as DefectLogFleetBus[],entries as DownEntry[] as DefectLogDownEntry[],busId,defects,action,{now});
  if(!applied.saved){alert("Nothing on Bus "+label+" would save — the repairs holding it are no longer where the board expected them. Open the bus on the Defect Log.");return}
  const wroteFleet=writeFleetStorageResult(localStorage,applied.fleet as FleetBus[]);
  setSaveProblem(wroteFleet.reason||"");
  if(!wroteFleet.ok){alert("This device could not save the change, so Bus "+label+" is still deferred. Export a backup and clear space, then try again.");return}
  const wroteDown=writeDownSheetStorageResult(localStorage,applied.downEntries as DownEntry[]);
  setFleet(applied.fleet as FleetBus[]);setEntries(applied.downEntries as DownEntry[]);
  if(!wroteDown.ok){setSaveProblem(wroteDown.reason||"failed");alert("Bus "+label+" came off DEFERRED, but the Down Sheet could not be saved on this device. Check the sheet before relying on it.");return}
  if(applied.saved<applied.attempted)alert("Bus "+label+" was updated, but "+(applied.attempted-applied.saved)+" of its repairs would not save. Check the bus on the Defect Log.");
 };
 /* The recommendation board's answer, written through this page the way the
    deferred one is. Same two failure reports, because the same two things can
    go wrong: nothing would save, or the fleet saved and the sheet did not. */
 const answerRecommended=(busId:string,defects:StructuredDefect[],action:"downsheet"|"dismiss")=>{
  const now=new Date().toISOString(),bus=fleet.find(item=>item.id===busId),label=bus?.n||busId;
  const applied=answerRecommendedBus(fleet as DefectLogFleetBus[],entries as DownEntry[] as DefectLogDownEntry[],busId,defects,action,{now});
  if(!applied.saved){alert("Nothing on Bus "+label+" would save — the repairs the board expected are no longer where it left them. Open the bus on the Defect Log.");return}
  const wroteFleet=writeFleetStorageResult(localStorage,applied.fleet as FleetBus[]);
  setSaveProblem(wroteFleet.reason||"");
  if(!wroteFleet.ok){alert("This device could not save the change, so Bus "+label+" is unchanged. Export a backup and clear space, then try again.");return}
  const wroteDown=writeDownSheetStorageResult(localStorage,applied.downEntries as DownEntry[]);
  setFleet(applied.fleet as FleetBus[]);setEntries(applied.downEntries as DownEntry[]);
  if(!wroteDown.ok){setSaveProblem(wroteDown.reason||"failed");alert("Bus "+label+" was updated, but the Down Sheet could not be saved on this device. Check the sheet before relying on it.");return}
  if(applied.saved<applied.attempted)alert("Bus "+label+" was updated, but "+(applied.attempted-applied.saved)+" of its repairs would not save. Check the bus on the Defect Log.");
 };
 const saveEntry=(next:DownEntry)=>{if(next.workflow!=="Completed"&&entries.some(entry=>entry.id!==next.id&&entry.workflow!=="Completed"&&entry.busId===next.busId)){alert("That bus already has an active down-sheet entry.");return}const nextFleet=applyDownEntryToFleet(fleet,next);setFleet(nextFleet);writeFleetStorage(localStorage,nextFleet);
  /* MOVE BUS TO is an instruction, not a property of the repair, so it is
     cleared once it has been carried out. Left on the entry it would re-run on
     every later save: park the bus somewhere on the map, reopen the entry to
     fix a typo, and the bus would jump back to wherever the sheet last said. */
  next={...next,location:undefined};/* Every repair on the entry teaches its own cause, under its own symptom. */
 const found=(next.repairItems||[]).filter(item=>normalizeFinding(item.finding));
 if(found.length)writeFindingsMemory(localStorage,found.reduce((memory,item)=>learnFinding(memory,{category:item.category,issue:item.repair,finding:item.finding}),readFindingsMemory(localStorage)));setEntries(current=>current.some(entry=>entry.id===next.id)?current.map(entry=>entry.id===next.id?next:entry):[...current,next]);setEditing(null)};
 const clearEntireDownSheet=()=>{if(!entries.length&&!fleet.some(bus=>bus.down)){alert("The down sheet is already clear.");return}if(!confirm("Clear the entire down sheet and uncheck every tracker bus marked on it? Bus locations and defects will stay unchanged."))return;const result=clearDownSheetState(entries,fleet);setSaveProblem(writeSetting(localStorage,DOWN_SHEET_CLEAR_UNDO_KEY,JSON.stringify(result.snapshot)).reason||"");
  /* Written down so the removal actually travels. A push only sends what the
     sheet still carries, so without this the cleared rows stayed live on the
     server and the next pull handed every one of them back — which is why
     clearing the sheet and watching it refill was reproducible. */
  rememberRemovedEntries(localStorage,entries.map(entry=>entry.id),new Date().toISOString());writeDownSheetStorage(localStorage,result.entries);writeFleetStorage(localStorage,result.fleet);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(true)};
 /* CLEAR DOWNSHEET ARRIVES FROM SETTINGS (release 213). Once, after the sheet
    has been read, with the parameter off the address before the confirm, and
    refused in LITE: Settings hides nothing in LITE, and LITE never reached this
    button behind ADVANCED ACTIONS. */
 /* TWO STEPS, found in review: the load-time reconcile queues a fleet write
    in the same commit that sets `hydrated`, and a clear run in that commit was
    then written over by the board as it was before. So arrival only marks the
    clear as pending; the confirm and the clear run in the next commit, after
    the reconcile has landed. */
 const sheetToolDone=useRef(false);
 const [clearPending,setClearPending]=useState(false);
 useEffect(()=>{
  if(!hydrated||sheetToolDone.current)return;
  sheetToolDone.current=true;
  if(!sheetToolFromSearch(window.location.search))return;
  const url=new URL(window.location.href);url.searchParams.delete(SHEET_TOOL_PARAM);
  window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
  if(hiddenInLite(appMode,"advancedActions")){alert("CLEAR DOWNSHEET is not part of LITE. Turn LITE off in Settings to use it.");return}
  setClearPending(true);
 },[hydrated]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!clearPending)return;setClearPending(false);clearEntireDownSheet()},[clearPending]);// eslint-disable-line react-hooks/exhaustive-deps
 const undoClear=()=>{const snapshot=readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY));if(!snapshot){setUndoClearAvailable(false);alert("There is no cleared down sheet to restore.");return}const restoredAt=new Date().toISOString(),held=new Set(entries.map(entry=>entry.id)),plain=restoreDownSheetState(entries,fleet,snapshot);
  /* Off the removal ledger, and restamped as touched now.

     Both halves are needed. The ledger is what refuses an entry on the way back
     in, and the server compares updated_at to decide whether a write is newer
     than the tombstone the clear sent — so an entry put back carrying its old
     stamp would lose that comparison and be deleted again on the next pull,
     silently. Restoring the sheet IS touching it, so the stamp is honest. */
  forgetRemovedEntries(localStorage,snapshot.entries.map(entry=>entry.id));
  const result={...plain,entries:plain.entries.map(entry=>held.has(entry.id)?entry:{...entry,updatedAt:restoredAt})};writeDownSheetStorage(localStorage,result.entries);writeFleetStorage(localStorage,result.fleet);localStorage.removeItem(DOWN_SHEET_CLEAR_UNDO_KEY);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(false)};
 const importScan=(records:ScanImportRecord[])=>{
  const now=new Date().toISOString(),incomingIds=new Set(records.map(record=>record.busId)),removed=scannedSheetRemovals(entries,incomingIds),baseFleet=prepareFleetForScannedReplacement(fleet,removed,now);
  const imported=records.map((record,index)=>{
   /* THE PAPER NAMING THE BUS IS WHAT PROMOTES THE ROW. A scan writes ONTO
      the active row rather than replacing it, so `{...prior}` carried
      `addedInApp` through and a row tagged once stayed tagged for ever — the
      office listing the bus is exactly the moment that stops being true.
      Curtis: "now it's officially on the master downsheet from the office." */
   const prior=entries.find(entry=>isActive(entry)&&entry.busId===record.busId),assignmentType:AssignmentType=record.section==="Vendor Repair"?"Vendor":"Mechanic",workflow:Workflow=record.operationalStatus==="shop"?"In Progress":"Scheduled";
   /* Write to the record the bus already has, rather than minting a second one.

      A defect is keyed on the entry that carried it in, and a rescan of the same
      paper sheet makes a new entry id out of the clock. A bus that comes off the
      sheet and back on — or is simply photographed again on a later day — then
      arrives with an id nothing on the bus matches, and the identical fault is
      recorded twice. That is how 21 buses came to carry 25 records saying
      nothing the record beside them did not already say.

      Naming the existing record here is enough: the sheet already adopts an
      entry's stated defectId ahead of any id it would generate, so the scan
      updates that record instead of adding to it. Only an EXACT repeat matches —
      same category, symptom and details — so a genuinely different fault on the
      same bus still becomes its own record. */
   const defectId=prior?.defectId||matchingUnresolvedDefectId(fleet.find(bus=>bus.id===record.busId),record);
   return clearAddedInApp(normalizeEntry({...prior,id:prior?.id||`repair-scan-${Date.now()}-${index}`,...(defectId?{defectId}:{}),busId:record.busId,busNumber:record.busNumber,category:record.category,repair:record.repair,customReason:record.reason,assignmentType,assignedTo:record.assignedTo,section:record.section,shift:record.shift,workflow,operationalStatus:record.operationalStatus,timeEstimate:normalizeRepairTimeEstimate(undefined,record.category,record.repair),updatedAt:now,updatedBy:defaultInitials||"SCAN",history:[...(prior?.history||[]),{at:now,initials:defaultInitials||"SCAN",action:"Imported from sheet photo"}]},index));
  });
  const nextEntries=[...imported];
  if(nextEntries.filter(isActive).length>MAX_ENTRIES){alert("This import would exceed the 98-bus Down Sheet capacity. Deselect some rows and try again.");return}
  const nextFleet=imported.reduce((current,entry)=>applyDownEntryToFleet(current,entry,now),baseFleet);
  /* If the undo copy cannot be written the import must not proceed: replacing
     the sheet with no way back is exactly the kind of one-way door this app
     does not build. */
  if(!writeSetting(localStorage,SCAN_UNDO_KEY,JSON.stringify({createdAt:now,entries,fleet})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so the import was stopped. Export a backup and clear space, then scan again.");
   return;
  }
  /* Every bus the new sheet does not name comes off, and comes off everywhere.
     A replacing scan is the commonest removal in the shop and it was the one
     that travelled least: the buses it dropped stayed live in the cloud, came
     back on the next pull, and were counted again. */
  rememberRemovedEntries(localStorage,removed.map(entry=>entry.id),now);
  /* THE SWAP ITSELF IS RECORDED, and this is the only place it can be.

     A scanned sheet replaces the live one and the app kept nothing of the sheet
     it replaced, so what got added, what cleared and what stuck between two
     sheets had never been written down — the whole input to the Fleet Forecast,
     thrown away on every scan.

     It goes here rather than in the scanner because this is the chokepoint: a
     route that forgot to call it would silently stop recording, and the ledger
     would look healthy while going stale.

     AFTER the undo copy and deliberately NOT guarded like it. If the undo copy
     cannot be written the import is stopped, because replacing a sheet with no
     way back is a one-way door. The ledger is the opposite trade: losing one
     swap's tempo is a rounding error in a forecast, and refusing an import over
     it would cost a foreman the sheet he just photographed. So its failure is
     taken and ignored. */
  recordSheetSwap(localStorage,nextEntries,removed.map(entry=>entry.busNumber||entry.busId),now,readShiftSettings(localStorage));
  writeDownSheetStorage(localStorage,nextEntries);
  setSaveProblem(writeFleetStorageResult(localStorage,nextFleet).reason||"");
  setEntries(nextEntries);setFleet(nextFleet);setUndoScanAvailable(true);setScannerOpen(false);
  alert(`${imported.length} bus${imported.length===1?"":"es"} imported as the current Down Sheet. ${removed.length} prior bus${removed.length===1?"":"es"} came off. Locations and saved defects were preserved.`);
  /* Asked AFTER the import — the scan is what the person came to do — and only
     when NOT already sweeping, because a prompt that appears mid-walk to ask
     whether you are walking is the kind of dialog people learn to dismiss.
     startSweep does not reset a walk already under way. */
  if(!readSweep(localStorage))setSweepAsk("ask");
 };
 const undoScan=()=>{try{const snapshot=JSON.parse(localStorage.getItem(SCAN_UNDO_KEY)||"null");if(!snapshot||!Array.isArray(snapshot.entries)||!Array.isArray(snapshot.fleet))throw new Error();
  /* The undo is itself a removal in one direction and a restore in the other:
     rows the scan created go, rows it replaced come back. Both have to reach
     the other devices or the import undoes itself only here. */
  const restoredAt=new Date().toISOString(),kept=new Set((snapshot.entries as DownEntry[]).map(entry=>entry.id)),held=new Set(entries.map(entry=>entry.id));
  rememberRemovedEntries(localStorage,entries.filter(entry=>!kept.has(entry.id)).map(entry=>entry.id),restoredAt);
  forgetRemovedEntries(localStorage,[...kept]);
  const restored=(snapshot.entries as Partial<DownEntry>[]).map(entry=>held.has(String(entry.id))?entry:{...entry,updatedAt:restoredAt});writeDownSheetStorage(localStorage,restored);writeFleetStorage(localStorage,snapshot.fleet);localStorage.removeItem(SCAN_UNDO_KEY);setEntries(restored.map(normalizeEntry));setFleet(snapshot.fleet);setUndoScanAvailable(false)}catch{localStorage.removeItem(SCAN_UNDO_KEY);setUndoScanAvailable(false);alert("There is no photo import to restore.")}};

 /* One row off the sheet, pressed from the row itself.

    Getting a bus off the sheet used to mean opening the editor and marking it
    Completed, and that is a claim about the work: wrong for a bus written down
    twice, wrong for one written down by mistake, and it puts a repair in the
    fixed count that nobody fixed. This says only that the row does not belong
    on the sheet.

    The bus keeps its defects, its status and its location, the same as REMOVE
    in the Defect Log — coming off the sheet is not being repaired, and the bus
    still has the fault. The DS badge needs nothing here either: membership is
    reconciled from the entries that remain, so a bus carrying a second open row
    keeps its badge and a bus down to none loses it. */
 const deleteEntry=(entry:DownEntry)=>{
  const reason=reasonLabel(entry);
  if(!confirm("Delete bus "+(entry.busNumber||"this bus")+" from the Down Sheet?"+(reason?"\n\n"+reason:"")+"\n\nThe bus keeps its defects, status and location. The other devices are told, and PUT BACK undoes this."))return;
  const now=new Date().toISOString(),remaining=entries.filter(item=>item.id!==entry.id);
  /* The copy goes down before the row does, and the delete is abandoned if it
     cannot be written. A removal with no way back is the one-way door this app
     does not build. */
  if(!writeSetting(localStorage,ENTRY_UNDO_KEY,JSON.stringify({kind:"deleted",deletedAt:now,entry})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so nothing was deleted. Export a backup and clear space, then try again.");
   return;
  }
  /* The sheet goes down before the tombstone does, and the tombstone only
     follows a write that actually succeeded. The other order looks identical
     until the write is refused, and then it tells the shop cloud to drop a row
     this device is still holding — a deletion that happened everywhere except
     where it was pressed. */
  const written=writeDownSheetStorageResult(localStorage,remaining);
  if(!written.ok){
   localStorage.removeItem(ENTRY_UNDO_KEY);
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so nothing was deleted. Export a backup and clear space, then try again.");
   return;
  }
  /* Written down so the removal actually travels. A push only sends what the
     sheet still carries, so a row merely dropped here stays live on the server
     and the next pull hands it straight back — the same fault that had a
     cleared sheet refilling itself. */
  rememberRemovedEntries(localStorage,[entry.id],now);
  setSaveProblem("");
  setEntries(remaining);
  setRowAction({kind:"deleted",id:entry.id,busNumber:entry.busNumber});
 };
 /* MARK FIXED, one press from the row.

    Closing a bus out meant opening the editor, changing the workflow and
    saving. For the common case — the mechanic is done and the foreman is
    walking the sheet — that is three steps for a fact already known. This is
    the Defect Log's MARK FIXED, on the surface the Down Sheet is read from.

    It goes through saveEntry rather than writing the entry itself, so it takes
    the same path the editor takes: the repairs are marked done, the bus's
    defects are completed, its status is recomputed from that, and the findings
    it taught are learned. One press must not mean a different kind of save. */
 const markEntryFixed=(entry:DownEntry)=>{
  /* It used to close out on one press, on the reasoning that a foreman working
     down a sheet presses it many times in a row and a dialog each time is the
     thing that makes people stop using a button. That held while it sat in the
     bus's own cell under a thumb — and it is exactly why Curtis closed out a
     bus he did not mean to. Marking a bus fixed is a claim about the work: it
     completes the defect, recomputes the status and teaches the findings. It
     asks now, the same as the delete beside it always did. */
  const reason=reasonLabel(entry);
  if(!confirm("Mark bus "+(entry.busNumber||"this bus")+" fixed and close it out?"+(reason?"\n\n"+reason:"")+"\n\nThe repair is marked done and the bus's defect is completed. UNDO puts it back."))return;
  const now=new Date().toISOString(),who=(entry.completedBy||(entry.assignmentType==="Mechanic"?entry.assignedTo:"")||defaultInitials||"").trim().toUpperCase();
  /* The copy goes down first, exactly as the delete does: the way back exists
     before the change does, so a refused write leaves the sheet untouched. */
  /* The bus goes into the copy as well as the entry, and this is the whole
     reason the fix undo is not just "save the old entry again".

     Completing an entry completes the bus's defect. Saving the old entry back
     does NOT re-open it: a completed defect is resolved, and a resolved record
     is not adoptable, so the entry cannot find it again — it mints a SECOND
     record for the same fault and leaves the first one closed. Measured: one
     press and one undo left bus 1101 carrying d-1 completed and a fresh open
     duplicate beside it, which is the thing this app must never do.

     So the fields the completion actually changes are kept and put back as
     they were. Location and whoever has the bus are deliberately not, because
     they may have moved on and are not this undo's business. */
  const bus=fleet.find(item=>item.id===entry.busId);
  if(!writeSetting(localStorage,ENTRY_UNDO_KEY,JSON.stringify({kind:"fixed",fixedAt:now,entry,bus:bus&&{id:bus.id,s:bus.s,defects:bus.defects||[],pendingRepair:bus.pendingRepair||""}})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so nothing was changed. Export a backup and clear space, then try again.");
   return;
  }
  saveEntry(normalizeEntry({...entry,workflow:"Completed",completedAt:now,completedBy:who,updatedAt:now,updatedBy:who||entry.updatedBy,
   history:[...(entry.history||[]),{at:now,initials:who||"—",action:"Marked fixed from the Down Sheet"}]}));
  setRowAction({kind:"fixed",id:entry.id,busNumber:entry.busNumber});
 };
 /* Putting a closed-out row back is not the same operation as putting a deleted
    one back. Nothing was removed, so there is no tombstone to forget and no
    capacity to check — the row never left the sheet, it only stopped being
    active. Both halves are restored rather than re-derived: the entry as it
    was, and the bus fields the completion changed. */
 const undoFixEntry=(saved:DownEntry,bus?:{id:string;s:FleetStatus;defects:StructuredDefect[];pendingRepair:string})=>{
  const nextEntries=entries.some(item=>item.id===saved.id)?entries.map(item=>item.id===saved.id?saved:item):[...entries,saved];
  const written=writeDownSheetStorageResult(localStorage,nextEntries);
  if(!written.ok){
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so the entry was left closed out. Export a backup and clear space, then try again.");
   return;
  }
  const nextFleet=bus?fleet.map(item=>item.id===bus.id?{...item,s:bus.s,defects:bus.defects,pendingRepair:bus.pendingRepair}:item):fleet;
  if(bus)setSaveProblem(writeFleetStorageResult(localStorage,nextFleet).reason||"");else setSaveProblem("");
  localStorage.removeItem(ENTRY_UNDO_KEY);
  setFleet(nextFleet);setEntries(nextEntries);setRowAction(null);
 };
 const undoDeleteEntry=()=>{
  let saved:{kind?:string;entry?:Partial<DownEntry>;bus?:{id:string;s:FleetStatus;defects:StructuredDefect[];pendingRepair:string}}|null=null;
  try{saved=JSON.parse(localStorage.getItem(ENTRY_UNDO_KEY)||"null")}catch{}
  if(!saved?.entry?.id){localStorage.removeItem(ENTRY_UNDO_KEY);setRowAction(null);alert("There is nothing on this row to take back.");return}
  const entry=normalizeEntry(saved.entry as DownEntry);
  if(saved.kind==="fixed")return undoFixEntry(entry,saved.bus);
  if(entries.some(item=>item.id===entry.id)){localStorage.removeItem(ENTRY_UNDO_KEY);setRowAction(null);return}
  /* One active row per bus is the sheet's rule and the editor refuses a save
     that breaks it. Putting a row back must not walk around the rule. */
  if(isActive(entry)&&entries.some(item=>isActive(item)&&item.busId===entry.busId)){alert("Bus "+(entry.busNumber||"that bus")+" already has an active entry on the sheet, so the deleted one was not put back.");return}
  if(isActive(entry)&&entries.filter(isActive).length>=MAX_ENTRIES){alert("The active down sheet is full at "+MAX_ENTRIES+" buses, so the deleted entry was not put back.");return}
  const restoredAt=new Date().toISOString();
  /* Off the ledger and restamped, and both halves are needed. The ledger is
     what refuses the entry on the way back in; the stamp is what beats the
     tombstone the delete pushed, which an entry carrying its old updatedAt
     would lose — deleting itself again on the next pull, silently. Putting a
     row back IS touching it, so the stamp is honest. */
  const restored=[...entries,{...entry,updatedAt:restoredAt}];
  const written=writeDownSheetStorageResult(localStorage,restored);
  if(!written.ok){
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so the entry was not put back. Export a backup and clear space, then try again.");
   return;
  }
  forgetRemovedEntries(localStorage,[entry.id]);
  setSaveProblem("");
  localStorage.removeItem(ENTRY_UNDO_KEY);
  setEntries(restored);setRowAction(null);
 };

 /* The page title sits on the HEADER, so while it is still the default it
    is left out and the header's own computed text colour answers — pinned
    white it reads 1.35:1 on a pale header somebody picked in Settings,
    with the panel there promising that cannot happen. Changed by hand it
    is emitted as before and that choice wins. */
 const titleColor=displaySettings.styles.pageTitle.color.toLowerCase()===DEFAULT_DOWN_SHEET_DISPLAY.styles.pageTitle.color.toLowerCase()?{}:{"--down-page-title-color":displaySettings.styles.pageTitle.color};
 const appStyle={...titleColor,"--down-page-title-size":displaySettings.styles.pageTitle.fontSize+"px","--down-summary-color":displaySettings.styles.summary.color,"--down-summary-size":displaySettings.styles.summary.fontSize+"px","--down-quick-notes-color":displaySettings.styles.quickNotes.color,"--down-quick-notes-size":displaySettings.styles.quickNotes.fontSize+"px","--down-sheet-title-color":displaySettings.styles.sheetTitle.color,"--down-sheet-title-size":displaySettings.styles.sheetTitle.fontSize+"px","--down-column-header-color":displaySettings.styles.columnHeaders.color,"--down-column-header-size":displaySettings.styles.columnHeaders.fontSize+"px","--down-reason-category-color":displaySettings.styles.reasonCategory.color,"--down-reason-category-size":displaySettings.styles.reasonCategory.fontSize+"px","--down-reason-details-color":displaySettings.styles.reasonDetails.color,"--down-reason-details-size":displaySettings.styles.reasonDetails.fontSize+"px"} as CSSProperties;

 return <main className="down-app" style={appStyle}><SaveAlert reason={saveProblem} onExport={()=>exportFleetBoardBackup(localStorage,fleet)}/>{mintSkipped&&<p className="down-mint-skipped" role="alert"><b>DOWN WITH NO ROW ON THE SHEET</b><small>{mintSkipped}</small><button type="button" onClick={()=>setMintSkipped("")} aria-label="Dismiss">×</button></p>}<WelcomeGate/><ShopCloudLive/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="down-header">
   <div><AppName/><span>FLEET MAINTENANCE</span><h1>{displaySettings.labels.pageTitle}</h1><p>{displaySettings.labels.subtitle}</p></div>
   <TrackerNav active="/down-sheet"/>
   {/* REFRESH, then SCAN and SHARE (release 213) - the Defect Log's header,
       and for the same reason. Curtis: "Let's try to clean this up like we did
       the Defect tab." SCAN opens SCAN SHEET's door directly; it was inside
       ADVANCED ACTIONS. SHARE opens the whole-sheet share and STATUS REPORT,
       which used to sit on the page. ADVANCED ACTIONS is gone: SHOW COMPLETED
       is on the sheet's own title and CLEAR DOWNSHEET is in Settings. */}
   <div className="down-header-actions">
    <RefreshButton/>
    <div className="down-header-pair">
     {!hiddenInLite(appMode,"advancedActions")&&<button className="down-header-button" type="button" onClick={()=>setPaperOpen(true)} aria-label={"Scan: "+PAPER_DOOR} title="Photograph any shop sheet: the app works out which one it is and opens its scanner"><svg className="down-header-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3.5"/></svg><b>SCAN</b></button>}
     <button className="down-header-button" type="button" aria-expanded={shareOpen} aria-controls={shareOpen?"down-share-drawer":undefined} onClick={()=>setShareOpen(value=>!value)}><svg className="down-header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M6 12H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/></svg><b>SHARE</b><i aria-hidden="true">{shareOpen?"\u25B4":"\u25BE"}</i></button>
    </div>
   </div>
  </header>

  {/* SHARE's drawer: the whole-sheet share that used to sit on the page
      between the boards and the sheet, plus STATUS REPORT, which is also a
      thing somebody sends. Drawn as ADVANCED ACTIONS' drawer was. */}
  {shareOpen&&<section className="down-advanced open down-share-drawer" id="down-share-drawer">
   <div className="down-advanced-body">
    <div className="down-advanced-group">
     {/* Its own class rather than the road note's, deliberately: that rule gives
         every button inside it width:100% below 760px, which reads correctly for
         one SHOW THE WHOLE SHEET button and would stack these four down the
         screen. */}
     {/* NO LONGER BEHIND A QUICK FILTER. The same three actions, always on the
         page, because the thing most often wanted is the sheet itself and that
         was the one thing they could not send. The row only CHANGES scope with a
         filter on; with none it sends what is drawn, and says which of the two
         that is. SHOW THE WHOLE SHEET and the filter's hint stay filter-only:
         neither means anything when no filter is set. */}
     <section className={"down-quick-filter-note"+(quickFilter?"":" sheet-share")} aria-label={shareLabel+" — share the sheet"}>
      {/* ONE LINE UNDER THE SCOPE, holding either the hint or what just
          happened. The four status messages used to mount as SIBLINGS of this
          <p>, where `.down-quick-filter-note>small` gives them flex-basis:100%
          and so a row of their own: measured, SHARE TEXT succeeding grew the bar
          101px -> 123px at 390 and 52px -> 74px at 1180 and pushed the sheet
          down about 22px, every time, now that the bar is always on screen.
          Reserving an empty slot instead would have cost those 22px on EVERY
          visit to save them on a few; the hint is the thing worth yielding.
          The live region is here and not on the scope line above it, which is
          why that line is a plain <p>: this text changes on a deliberate press
          or a filter change, never on a keystroke in SEARCH. */}
      <p><b>{shareLabel.toUpperCase()}</b> — {visible.length} of {shown.length} on the sheet<br/><small role="status" className={shareNote.said?"said":undefined}>{shareNote.text}</small></p>
      <div className="down-quick-filter-actions">
       <button type="button" onClick={copyFilteredList}>{shareStatus==="copied"?"COPIED!":"COPY LIST"}</button>
       <button type="button" onClick={shareFilteredList}>SHARE TEXT</button>
       <button type="button" onClick={shareFilteredPage}>SHARE PAGE</button>
       {quickFilter&&<button type="button" className="down-quick-filter-clear" onClick={()=>{setQuickFilter(null);setShareStatus("")}}>SHOW THE WHOLE SHEET</button>}
      </div>
     </section>
     <button className="down-status-report-action" type="button" onClick={()=>setReportOpen(true)}>STATUS REPORT</button>
    </div>
   </div>
  </section>}

  {/* ADD DOWN BUS and SEARCH, the two things used on every visit, together.
      UNDO IMPORT and UNDO CLEAR come up here only while there is something to
      undo; they used to sit in ADVANCED ACTIONS. */}
  <section className="down-controls">
   <button className="down-primary-action" type="button" onClick={openNewEntry} disabled={active.length>=MAX_ENTRIES} title={active.length>=MAX_ENTRIES?"The sheet is full at "+MAX_ENTRIES+" buses":"Add a bus to the Down Sheet"}>+ ADD DOWN BUS</button>
   <label className="down-search"><b>SEARCH</b><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus #, repair, mechanic or vendor" aria-label="Search Down Sheet"/></label>
   {search&&<button className="clear-search" type="button" onClick={()=>setSearch("")}>CLEAR</button>}
   {(undoScanAvailable||undoClearAvailable)&&!hiddenInLite(appMode,"undoTools")&&<div className="down-undo-row">
    {undoScanAvailable&&<button className="undo-scan" type="button" onClick={undoScan}>UNDO IMPORT</button>}
    {undoClearAvailable&&<button className="undo-clear" type="button" onClick={undoClear}>UNDO CLEAR</button>}
   </div>}
   {/* THREE TABS ACROSS (release 213), the Defect Log's ALL · DETAILED ·
       COMPACT row for this page. Curtis chose this layout, with nothing open
       until a tab is tapped and a second tap hiding it again. A tab is filled
       while its panel is open, and outlined in blue while what it controls is
       narrowing the sheet, so a closed tab still says the sheet is filtered. */}
   <div className="down-tabs" role="group" aria-label="Shift, counts and filters">
    <button type="button" className={"down-tab"+(filter!=="All"?" set":"")} aria-expanded={openTab==="shift"} aria-controls={openTab==="shift"?"down-tab-shift":undefined} onClick={()=>toggleTab("shift")}>{filter==="All"?"ALL SHIFTS":filter.toUpperCase()+" SHIFT"}<i aria-hidden="true">{openTab==="shift"?"\u25B4":"\u25BE"}</i></button>
    <button type="button" className={"down-tab"+(fixedToday||roadFilter?" set":"")} aria-expanded={openTab==="counts"} aria-controls={openTab==="counts"?"down-counts-tiles":undefined} onClick={()=>toggleTab("counts")}>COUNTS<i aria-hidden="true">{openTab==="counts"?"\u25B4":"\u25BE"}</i></button>
    <button type="button" className={"down-tab"+(watchList||quickFilter?" set":"")} aria-expanded={openTab==="filters"} aria-controls={openTab==="filters"?"down-tab-filters":undefined} aria-label={"Filters: "+(watchList?WATCH_LISTS.find(item=>item.key===watchList)?.shortLabel+" ("+watchListLabel(watchList)+")":quickFilter?DOWN_SHEET_FILTERS.find(item=>item.key===quickFilter)?.shortLabel?.toUpperCase()+" ("+DOWN_SHEET_FILTERS.find(item=>item.key===quickFilter)?.label+")":"none")} onClick={()=>toggleTab("filters")}><svg className="down-tab-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>{watchList?WATCH_LISTS.find(item=>item.key===watchList)?.shortLabel:quickFilter?DOWN_SHEET_FILTERS.find(item=>item.key===quickFilter)?.shortLabel?.toUpperCase():"FILTERS"}</button>
   </div>
  </section>

  {/* THE OPEN TAB'S PANEL, directly under the box, one at a time. */}
  {openTab==="shift"&&<section className="down-tab-panel" id="down-tab-shift" aria-label="Shift">
   <div className="shift-filter" aria-label="Filter down sheet by shift">
      {(["All","1st","2nd","3rd"] as ShiftFilter[]).map(value=><button type="button" className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>{setFilter(current=>current===value&&value!=="All"?"All":value);setOpenTab(null)}} key={value}>{value==="All"?"ALL SHIFTS":value.toUpperCase()+" SHIFT"}{value!=="All"&&<i>{value==="1st"?counters.first:value==="2nd"?counters.second:counters.third}</i>}</button>)}
   </div>
  </section>}
  {openTab==="counts"&&<section className="down-tab-panel" aria-label="Counts">
   <div className="down-group-counts" id="down-counts-tiles">
    <div className="group-count total"><strong>{shown.length}</strong><span>TOTAL ON SHEET</span></div>
    <div className="group-count down-buses"><strong>{hardDownCount}</strong><span>DOWN BUSES</span></div>
    {/* The three that answer the pullout question together, in the order Curtis
        asked for them: the hard number, the soft number, then the two added up,
        "easily distinguished from one another". */}
    <div className="group-count soft-down"><strong>{softDownCount}</strong><span>SOFT DOWN</span></div>
    {inServiceCount>0&&<div className="group-count in-service"><strong>{inServiceCount}</strong><span>SOFT, IN USE</span></div>}
    <div className="group-count down-total"><strong>{hardDownCount+softDownCount}</strong><span>DOWN + SOFT</span></div>
    {idotEntries.length>0&&<div className="group-count idot-due"><strong>{idotEntries.length}</strong><span>IDOT DUE</span></div>}
    {tileFor("scheduled")}
    {/* Still a button, because it filters. Same press-to-narrow behaviour the
        two road tallies have, so it belongs with them rather than looking like
        a number you cannot touch. */}
    <button type="button" className={"group-count group-completed completed-today-tile"+(fixedToday?" active":"")} aria-pressed={fixedToday} disabled={!counters.completedToday&&!fixedToday} onClick={()=>setFixedToday(value=>!value)}><strong>{counters.completedToday}</strong><span>{displaySettings.labels.completed}</span></button>
    {tileFor("unscheduled")}
    {tileFor("inspection")}
    {/* The inverse of the map's down-sheet badges. Those answer "is this bus on
        the sheet?" while looking at the yard; these answer "is this one out
        working?" while looking at the sheet — which the sheet itself could not
        say, because where a bus is belongs to the map. A bus carrying both an
        inspection and a fault is in both counts on purpose.

        Pressed, they narrow the sheet below to exactly what they count, so the
        number can be read as a list. */}
    {([["down","DOWNED BUSES ON ROAD",roadCounts.down],["inspection","INSPECTIONS ON ROAD",roadCounts.inspection]] as [DownSheetRoadKind,string,number][]).map(([kind,label,count])=>
     <button type="button" className={"group-count group-road group-road-"+kind+(roadFilter===kind?" active":"")} key={kind} aria-pressed={roadFilter===kind}
      onClick={()=>setRoadFilter(current=>current===kind?null:kind)}
      title={roadFilter===kind?"Showing only these buses — press again to show the whole sheet":"Show only the "+count+" bus"+(count===1?"":"es")+" this counts"}>
      <strong>{count}</strong><span>{label}</span></button>)}
    {/* Everything below here is opt-in. SHEET STATS used to be a second
        scoreboard saying most of this again in a different shape; these are the
        numbers that survived it and are still worth having on the days somebody
        wants them. */}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("off-property")&&tileFor("off-property")}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("pending")&&<div className="group-count group-pending"><strong>{counters.pending}</strong><span>{displaySettings.labels.pending}</span></div>}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("accident")&&<div className="group-count group-accident"><strong>{counters.accident}</strong><span>{displaySettings.labels.accident}</span></div>}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("waiting")&&<div className="group-count group-waiting"><strong>{counters.waiting}</strong><span>{displaySettings.labels.waiting}</span></div>}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("labor")&&<div className="group-count group-labor"><strong>{formatRepairTime(counters.activeMinutes)}</strong><span>{displaySettings.labels.activeLabor||"EST. ACTIVE LABOR"}</span></div>}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("capacity")&&<div className="group-count group-capacity"><strong>{active.length}<small> / {MAX_ENTRIES}</small></strong><span>{displaySettings.labels.capacity}</span></div>}
    {/* Only once it has something of its own to say. Unfiltered it is the same
        number as EST. ACTIVE LABOR to the minute, and printing 244h 30m twice
        side by side is exactly the duplication this was meant to clear. */}
    {!hiddenInLite(appMode,"extraTiles")&&extraTiles.includes("labor")&&visibleMinutes!==counters.activeMinutes&&<div className="group-count group-view-labor"><strong>{formatRepairTime(visibleMinutes)}</strong><span>{displaySettings.labels.currentView||"EST. CURRENT VIEW"}</span></div>}
   </div>
  </section>}
  {/* The five boards that stood above the sheet are the first section; a pick
      opens that board under the box. The sheet's own filters follow. One choice
      at a time, and a pick hides the panel, as the menu it replaced closed. */}
  {openTab==="filters"&&<section className="down-tab-panel down-filter-list" id="down-tab-filters" aria-label="Filters">
    <b className="down-filter-sec">WATCH LISTS</b>
    {WATCH_LISTS.filter(item=>item.key!=="deferred"||!hiddenInLite(appMode,"deferred")).map(item=><button type="button" key={item.key} className={watchList===item.key?"active":undefined} aria-pressed={watchList===item.key} onClick={()=>{setQuickFilter(null);setShareStatus("");setWatchList(current=>current===item.key?null:item.key);setOpenTab(null)}}><span>{item.label}</span><b>{watchCounts[item.key]}</b></button>)}
    <b className="down-filter-sec">ON THE SHEET</b>
    {DOWN_SHEET_FILTERS.map(item=><button type="button" key={item.key} className={quickFilter===item.key?"active":undefined} aria-pressed={quickFilter===item.key} onClick={()=>{setWatchList(null);setQuickFilter(current=>current===item.key?null:item.key);setShareStatus("");setOpenTab(null)}}><span>{item.label}</span><b>{quickFilterCounts[item.key]}</b></button>)}
    {(watchList||quickFilter)&&<button type="button" className="down-filter-clear" onClick={()=>{setWatchList(null);setQuickFilter(null);setShareStatus("");setOpenTab(null)}}>CLEAR</button>}
  </section>}

  {/* Loud, and on the page rather than behind MORE. An accidental delete is
      exactly when nobody goes hunting through a menu for the way back. */}
  {rowAction&&<p className={"down-deleted-note"+(rowAction.kind==="fixed"?" fixed":"")} role="status">Bus <b>{rowAction.busNumber||"—"}</b> {rowAction.kind==="fixed"?"was marked fixed and closed out.":"was deleted from the sheet. Its defects, status and location were kept."} <button type="button" onClick={undoDeleteEntry}>{rowAction.kind==="fixed"?"UNDO":"PUT BACK"}</button></p>}
  {roadFilter&&<p className="down-road-filter-note" role="status">Showing only <b>{roadFilter==="inspection"?"INSPECTIONS ON ROAD":"DOWNED BUSES ON ROAD"}</b> — {visible.length} of {shown.length} on the sheet. <button type="button" onClick={()=>setRoadFilter(null)}>SHOW THE WHOLE SHEET</button></p>}
  {/* THE WATCH LIST PICKED IN QUICK FILTERS, open where the five boards used
      to stand; its own close button puts it away. */}
  {watchList==="mystery"&&<MysteryBoard fleet={fleet} activeDownBusIds={active.map(entry=>entry.busId)}
   title={mysteryDisplay.labels.mysteryTitle} subtitle={mysteryDisplay.labels.mysterySubtitle}
   collapsed={false} onCollapsedChange={collapsed=>{if(collapsed)setWatchList(null)}}
   describe={bus=>{const open=(bus.defects||[]).filter(isUnresolved);return open.length?open.slice(0,2).map(defect=>[defect.category,defect.issue].filter(Boolean).join(" — ")).join("; ")+(open.length>2?" +"+(open.length-2)+" more":""):"No known defects logged"}}
   /* The move is written through this page's own fleet write rather than
      inside the board, so a refused write is reported here like every other
      one and the board never saves behind the page's back. */
   onMoved={nextFleet=>{const result=writeFleetStorageResult(localStorage,nextFleet);setSaveProblem(result.reason||"");if(!result.ok)return false;setFleet(nextFleet);return true}}/>}
  {watchList==="deferred"&&!hiddenInLite(appMode,"deferred")&&<DeferredBoard fleet={fleet as DefectLogFleetBus[]} downEntries={entries as DefectLogDownEntry[]}
   collapsed={false} onCollapsedChange={collapsed=>{if(collapsed)setWatchList(null)}} onAnswer={answerDeferred}/>}
  {watchList==="recommended"&&<RecommendedBoard fleet={fleet as DefectLogFleetBus[]} downEntries={entries as DefectLogDownEntry[]}
   collapsed={false} onCollapsedChange={collapsed=>{if(collapsed)setWatchList(null)}} onAnswer={answerRecommended}/>}
  {watchList==="soft"&&<SheetSectionBoard className="soft-down-board" title="SOFT DOWN — CAN STILL BE USED"
   hint="ON THE SHEET, AND THE SHEET SAYS THEY STILL RUN" entries={softEntries} locations={locations}
   collapsed={false} onCollapsedChange={collapsed=>{if(collapsed)setWatchList(null)}}
   action={entry=>{
    const stamp=entryInServiceStamp(entry);
    return <button type="button" className={"in-service-toggle"+(stamp?" on":"")}
     onClick={()=>toggleInService(String(entry.id||""),!stamp)}
     aria-pressed={Boolean(stamp)}
     aria-label={(stamp?"Take bus ":"Put bus ")+entry.busNumber+(stamp?" back out of service":" into service today")}>
     {stamp?"IN SERVICE"+(stamp.by?" — "+stamp.by:"")+" · TAKE OFF":"USING THIS ONE"}
    </button>;
   }}/>}
  {watchList==="idot"&&<SheetSectionBoard className="idot-board" title="IDOT — STATE INSPECTION DUE"
   hint="KEEP AN EYE ON THESE. NOT COUNTED AS DOWN" entries={idotEntries} locations={locations}
   collapsed={false} onCollapsedChange={collapsed=>{if(collapsed)setWatchList(null)}}/>}
  {/* Off by default now. It sat permanently between the counts and the sheet
      on a page whose whole problem was how much you scroll past to reach the
      rows. The note itself is untouched on every device that has one — the
      switch hides the panel, it does not clear what was written. */}
  {showQuickNotes&&<section className="quick-notes">
   <label htmlFor="down-quick-notes"><b>{displaySettings.labels.quickNotes}</b><span>{quickNotes===savedQuickNotes?"Saved on this device":"Unsaved changes"}</span></label>
   <div className="quick-notes-editor"><textarea id="down-quick-notes" value={quickNotes} onChange={event=>setQuickNotes(event.target.value)} placeholder="Example: 3 road calls today; follow up with vendor; check late-shift parts delivery."/><button type="button" onClick={saveQuickNote} disabled={quickNotes===savedQuickNotes}>SAVE NOTE</button></div>
  </section>}
  <section className="sheet-wrap">
   <div className="sheet-title"><div><b>{displaySettings.labels.sheetKicker||"MAINTENANCE FACILITY"}</b><span>{displaySettings.labels.sheetTitle}</span></div><p>{/* The two numbers the shop opens this page for, on the sheet's own title
       since the counts bar went (release 213), so they show with COUNTS shut. */}{/* Not while COMPLETED TODAY is on: the rows are then the finished ones,
       and a red "0 DOWN" over them reads as a clear sheet (review). A " · "
       after, so "3 SOFT ALL SHIFTS · PARTS" does not read as one phrase. */}{!fixedToday&&<><b className="sheet-title-down">{hardDownCount} DOWN</b>{softDownCount>0&&<>{" "}<b className="sheet-title-soft">{softDownCount} SOFT</b></>}{" · "}</>}{filter==="All"?"ALL SHIFTS":filter+" SHIFT"}{/* What is narrowing the rows, said where the rows are: the FILTERS and
       COUNTS tabs are closed most of the time, and a sheet that is filtered
       must say so on the sheet (found in review). */}{watchList?"":quickFilter?" · "+(DOWN_SHEET_FILTERS.find(item=>item.key===quickFilter)?.shortLabel||"").toUpperCase():""}{fixedToday?" · COMPLETED TODAY":""} · {visible.length} ROW{visible.length===1?"":"S"} · {formatRepairTime(visibleMinutes)} ESTIMATED</p>
    {/* SHOW COMPLETED, on the title of the thing it changes; it was in
        ADVANCED ACTIONS, and LITE still does not offer it. */}
    {!hiddenInLite(appMode,"advancedActions")&&<label className="completed-toggle sheet-completed"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span/>SHOW COMPLETED</label>}</div>
   <div className="sheet-scroll">
    <table className="down-table">
     <thead><tr><th>{displaySettings.labels.line}</th><th>{displaySettings.labels.busNumber}</th><th>{displaySettings.labels.reasonDown}</th><th>{displaySettings.labels.assignment}</th><th>{displaySettings.labels.section}</th><th>{displaySettings.labels.shift}</th><th>{displaySettings.labels.workStatus}</th><th>{displaySettings.labels.estimatedTime}</th><th>{displaySettings.labels.updatedBy}</th><th className="row-actions-head">ACTIONS</th></tr></thead>
     {/* The sheet divides itself, always — not only when an ordering is chosen.
         Each band carries its own count on the divider so the number never has
         to be arrived at by scrolling and adding. Line numbers keep running
         across the bands, the way they do on the paper sheet. */}
     <tbody>{visible.length?groups.map((group,groupIndex)=>{
      if(!group.entries.length)return null;
      const offset=groups.slice(0,groupIndex).reduce((sum,item)=>sum+item.entries.length,0);
      return <Fragment key={group.key}>
       <tr className={"down-group-row group-"+group.key}><td colSpan={10}><b>{group.label}</b><i>{group.entries.length}</i><span>{group.hint}</span></td></tr>
       {/* The WORK CATEGORIES subheading rows went with the ORDER control that was
           the only thing that ever turned them on. */}
       {group.entries.map((entry,index)=>{return <Fragment key={entry.id}><tr className={entry.workflow==="Completed"?"completed":""}>
      <td className="line-number">{String(offset+index+1).padStart(2,"0")}</td>
      {/* ON ROAD, beside the number, on every row that is out working. The two
          tallies above give the counts; this is the same fact per bus, so it
          reads while scrolling without pressing anything. It sits outside the
          edit button on purpose — it is a fact about where the bus is, which
          this page reads from the map and does not own, so pressing it must not
          look like a way to change it. */}
      <td className="fleet-number"><span className="fleet-number-slots"><button className="fleet-number-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit down-sheet entry for bus "+entry.busNumber}><b>{entry.busNumber||"—"}</b><small>{STATUS_LABELS[entry.operationalStatus]}</small></button>{/* UNDER the number rather than beside it. Beside it, the badge and
          the two row buttons held this column at 288px and pushed REASON DOWN
          — the thing the sheet is read for — off the side of a phone. Stacked,
          the column is the width of a bus number and the reason arrives on
          screen. */}
      {isDownSheetRoadLocation(locations[entry.busId]||"")&&<i className="on-road-badge" title="This bus is out on the road right now, according to the Facility Map">ON ROAD</i>}
      {/* NOT OFF THE OFFICE'S SHEET. Curtis: "we'll know that it was not on
          the downsheet originally." Carried by all four of the app's own
          creation paths — ADD DOWN BUS, the board's `down` flag, the map's ON
          DOWN SHEET tick, and the Defect Log — because once SOME app rows are
          tagged, a row WITHOUT the tag claims the office printed it.

          It clears when the paper names the bus: a scan writes onto the active
          row and `clearAddedInApp` drops the flag there, which is the moment
          Curtis described — "now it's officially on the master downsheet from
          the office". That clearing was promised in four places before it
          existed. Absent on every row that predates the field, because the app
          cannot know. */}
      {entryOriginLabel(entry)&&<i className="added-in-app-badge" title="This row was put on the sheet from inside the app, not read off the office's scanned sheet. It clears itself the next time a scanned sheet names this bus.">{entryOriginLabel(entry)}</i>}</span></td>
      <td><button className="reason-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit repair details for bus "+entry.busNumber}><b>{entry.repairItems&&entry.repairItems.length>1?repairProgressLabel(entry):entry.category}</b><span>{reasonLabel(entry)}</span></button></td>
      <td><span className={"assignment "+entry.assignmentType.toLowerCase()}><small>{entry.assignmentType}</small>{entry.assignedTo||"Unassigned"}</span></td>
      <td><b className={"section-tag "+entry.section.toLowerCase().replaceAll(" ","-")}>{entry.section}</b></td>
      <td><b className="shift-tag">{entry.shift}</b></td>
      <td><b className={"workflow "+entry.workflow.toLowerCase().replaceAll(" ","-")}>{entry.workflow}</b></td>
      <td className="estimate-cell"><b>{isQuarantineEntry(entry)?"N/A":entryEstimateMinutes(entry)?formatRepairTime(entryEstimateMinutes(entry)):"NOT SET"}</b><small>{isQuarantineEntry(entry)?"QUARANTINE":"MECHANIC PLAN"}</small></td>
      <td className="updated"><b>{entry.updatedBy||"—"}</b><small>{timeLabel(entry.updatedAt)}</small></td>
           {/* AT THE END OF THE ROW, which is a deliberate reversal. They sat in the
          bus's cell so a phone would not have to scroll sideways to reach
          them — and that put a one-press close-out under the thumb that scrolls
          the sheet. Curtis closed out a bus he did not mean to. Out here they
          take a deliberate scroll AND a confirm, and the first column shrinks
          by 164px, which is what makes the reason readable. */}
      <td className="row-actions"><span className="row-actions-slots">{entry.workflow!=="Completed"&&<button className="fix-entry" type="button" onClick={()=>markEntryFixed(entry)} aria-label={"Mark fixed: bus "+(entry.busNumber||"entry")} title={"Mark bus "+(entry.busNumber||"this entry")+" fixed and close it out"}><span aria-hidden="true">&#10003;</span><b>MARK FIXED</b></button>}<button className="delete-entry" type="button" onClick={()=>deleteEntry(entry)} aria-label={"Delete bus "+(entry.busNumber||"entry")+" from the Down Sheet"} title={"Delete bus "+(entry.busNumber||"this entry")+" from the Down Sheet"}><span aria-hidden="true">×</span></button></span></td>
     </tr></Fragment>})}
      </Fragment>;
     }):<tr><td className="empty-sheet" colSpan={10}><b>No buses match this view.</b><span>{search?"Clear the search or choose another filter.":"All shifts are shown by default. Use Add Down Bus to create the first repair entry."}</span></td></tr>}</tbody>
    </table>
   </div>
  </section>
  <footer className="down-footnote"><span>ACTIVE DOWN COUNT EXCLUDES COMPLETED REPAIRS</span><span>BUS LOCATION IS CONTROLLED ONLY FROM THE FACILITY MAP</span></footer>
  {/* The sheet and the board are handed over as they stand; the Status Report
      computes and never writes, so there is no save path to go around. */}
  {reportOpen&&<StatusReportModal fleet={fleet as never} entries={entries as never} close={()=>setReportOpen(false)}/>}
  {/* "we just add to it" — the existing entry is opened with a fresh blank
      repair card on the end - or the repairs already typed, see below - so the
      new work goes straight into the row that is already there rather than
      being refused. */}
  {/* THE REPAIRS ALREADY TYPED COME ACROSS. A repair typed into the new entry
      before ADD TO THAT ENTRY was pressed was dropped, and the existing entry
      opened with a blank card instead. Now the typed repairs are added to the
      end of that entry's own, and the blank card is offered only when nothing
      was typed. Empty cards are left behind, by the same test a save uses.
      Only from a NEW entry: an existing entry whose bus is changed to one
      already on the sheet carries nothing, or its repairs would be copied
      onto the other bus and their hours counted twice (cold read). */}
  {/* KEYED TO THE ENTRY IT SHOWS. The editor copies its entry into a draft
      once, when it mounts, so swapping the entry under a mounted editor changed
      nothing on screen: ADD TO THAT ENTRY flipped the heading to "Bus 17507"
      and SAVE UPDATE, kept the blank draft, and the save was refused as a
      second entry for the bus. Measured on main with one entry seeded. A new
      key is a new editor, opened on the entry it was handed. */}
  {editing&&<DownSheetEditor key={editing.id} carriedInitials={carriedInitials} reopened={reopened} onOpenExisting={(entryId,typedInitials,typedRepairs)=>{const found=entries.find(item=>item.id===entryId);if(found)setCarriedInitials(typedInitials);if(found)setReopened(true);if(found)setEditing({...found,repairItems:[...normalizeRepairItems(found.repairItems,{category:found.category,repair:found.repair,details:found.customReason,timeEstimate:found.timeEstimate}),...(typedRepairs.length?typedRepairs:[blankRepairItem()])]})}} entry={editing} fleet={fleet} entries={entries} defaultInitials={defaultInitials} onClose={()=>setEditing(null)} onSave={saveEntry}/>}
  
  {scannerOpen&&<DownSheetScanner fleet={fleet} currentEntries={active} defaultShift={defaultShift} handed={handed} onClose={()=>setScannerOpen(false)} onImport={importScan}/>}
  {paperOpen&&<ScanPaper here={PAPER_HERE} onClose={()=>setPaperOpen(false)} onHere={openPaperHere}/>}
  {sweepAsk&&<div className="down-shade" role="dialog" aria-modal="true" aria-labelledby="sweep-ask-title">
   <section className="sweep-ask-modal">
    <header className="repair-editor-head"><div><span>AFTER THE SCAN</span><h2 id="sweep-ask-title">{sweepAsk==="ask"?"FULL SWEEP?":"CHECK THE MAP"}</h2></div></header>
    {sweepAsk==="ask"
     ?<div className="sweep-ask-body">
       <p>Are you doing a full sweep of the facility for bus count?</p>
       <div className="sweep-ask-actions">
        <button type="button" className="sweep-ask-no" onClick={()=>setSweepAsk("mismatch")}>NO</button>
        <button type="button" className="sweep-ask-yes" onClick={()=>{startSweep(localStorage,"scan");setSweepAsk("")}}>YES</button>
       </div>
      </div>
     :<div className="sweep-ask-body">
       <p className="sweep-ask-warn"><b>Be aware of any mismatches between buses on the Fleet Map and the new Down Sheet.</b></p>
       <p>The sheet has just been replaced and the map has not moved with it, so a bus can sit in the wrong place, read as a mystery bus, or carry a number now written against another bus.</p>
       <p><b>A full yard sweep is recommended.</b></p>
       <div className="sweep-ask-actions">
        <button type="button" className="sweep-ask-yes" onClick={()=>setSweepAsk("")}>GOT IT</button>
       </div>
      </div>}
   </section>
  </div>}
 </main>;
}
