import {mysteryBusIds,type MysteryFleetBus} from "../fleet/mystery-buses.ts";
import {heldDeferredBuses} from "../defects/deferred-counts.ts";
import {recommendedBuses} from "../defects/recommended-counts.ts";
import type {DefectLogDownEntry,DefectLogFleetBus} from "../defects/defect-log-sync.ts";

/* THE FIVE WATCH LISTS, which used to be five boards stacked above the sheet.

   Release 213. Curtis, on the Down Sheet: "It's a bit all over the place ... The
   stats showing Mystery buses, Idot buses, etc can be shown just like this in a
   quick filter function." So they are the first section of QUICK FILTERS, and
   picking one opens that board where the five used to sit. The boards
   themselves are unchanged; only how somebody reaches them moved.

   Ordered by how often each is worth opening on a shift: the two that are the
   foreman's open questions first, then the two that are about the sheet, then
   DEFERRED, which LITE does not offer at all.

   The counts are the boards' own: each comes from the function its board
   lists from, so the number in the menu and the rows the board opens on cannot
   disagree. SOFT and IDOT are lists of the sheet's own rows, which the page has
   already drawn up, so it passes their lengths in rather than this module
   re-deriving the sheet. */
export type WatchListKey="mystery"|"recommended"|"idot"|"soft"|"deferred";

/* `shortLabel` is what the FILTERS tab reads while that list is open, so a
   closed tab still names what is showing. */
export const WATCH_LISTS:{key:WatchListKey;label:string;shortLabel:string}[]=[
 {key:"mystery",label:"Mystery buses",shortLabel:"MYSTERY"},
 {key:"recommended",label:"Recommended for Down Sheet",shortLabel:"RECOMMENDED"},
 {key:"idot",label:"IDOT — inspection due",shortLabel:"IDOT"},
 {key:"soft",label:"Soft down — still usable",shortLabel:"SOFT DOWN"},
 {key:"deferred",label:"Deferred",shortLabel:"DEFERRED"},
];

export function watchListLabel(key:WatchListKey){return WATCH_LISTS.find(item=>item.key===key)?.label||""}

export function watchListCounts(input:{
 fleet:(DefectLogFleetBus&MysteryFleetBus)[];
 downEntries:DefectLogDownEntry[];
 activeDownBusIds:string[];
 softRows:number;
 idotRows:number;
}):Record<WatchListKey,number>{
 return {
  mystery:mysteryBusIds(input.fleet,input.activeDownBusIds).length,
  recommended:recommendedBuses(input.fleet,input.downEntries).length,
  idot:input.idotRows,
  soft:input.softRows,
  deferred:heldDeferredBuses(input.fleet,input.downEntries).length,
 };
}

/* CLEAR DOWNSHEET MOVED TO SETTINGS with ADVANCED ACTIONS gone, and still runs
   on the Down Sheet, which holds the sheet, the board and UNDO CLEAR. Settings
   links here with `?tool=clear-sheet`; the page asks its own confirm once the
   sheet is read and takes the parameter off the address first, the way the
   Defect Log's `?tool=` does (`defect-log-tools.ts`). */
export const SHEET_TOOL_PARAM="tool";
export const CLEAR_SHEET_TOOL="clear-sheet";
export function clearSheetHref():string{return "/down-sheet?"+SHEET_TOOL_PARAM+"="+CLEAR_SHEET_TOOL}
export function sheetToolFromSearch(search:string):typeof CLEAR_SHEET_TOOL|null{
 try{return new URLSearchParams(search).get(SHEET_TOOL_PARAM)===CLEAR_SHEET_TOOL?CLEAR_SHEET_TOOL:null}catch{return null}
}
