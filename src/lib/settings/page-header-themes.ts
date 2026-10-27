/* WHICH HEADERS A PAGE THEME IS CURRENTLY DECIDING.

   Three of the eight surfaces carry a whole-page theme — the Facility Map,
   the Defect Log and Fixed Repairs — and a non-default one outranks the app's
   shared header colour (the ladder is in header-theme.ts). That is correct on
   the page and a LIE ON THE SETTINGS SCREEN unless Settings can see it: a row
   reading "following the one above", beside a navy swatch, over a page that
   draws olive, is the panel describing something the app will not do.

   So this reads the two keys those pages already own and answers one
   question: for each surface, what colour is its own theme imposing, if any.
   Nothing here writes, and nothing here is the source of those settings — the
   pages keep owning them. A missing, malformed or default-theme record simply
   yields no entry, which is the same answer as "that page is not deciding".

   The Defect Log and Fixed Repairs share `pace-defect-log-settings-v1`, which
   is not a mistake and not new: their appearance panels were built as one
   shape on purpose. One lookup answers for both. */

import {isHeaderColor,normalizeHeaderColor,type HeaderSurface} from "./header-theme.ts";
import {THEMES as MAP_THEMES} from "./map-settings.ts";
import {LOG_THEMES} from "../defects/defect-log-settings.ts";

type StorageReader=Pick<Storage,"getItem">;

export const BOARD_SETTINGS_KEY="pace-board-settings-v1";
export const LOG_SETTINGS_KEY="pace-defect-log-settings-v1";

/* "default" on the map, "light" on the other two: the theme a device is on
   before anybody opens those panels, and the only one that defers. */
/* ONE FUNCTION, THREE CALLERS, AND IT ASKS WHETHER THE HEADER COLOUR ACTUALLY
   DIFFERS — not whether a theme name happens to be something other than the
   default.

   THE THEME TABLE ANSWERS FIRST AND THE STORED PALETTE SECOND. The palette
   keys hold a DERIVED copy of the theme, written beside the theme name by the
   panel that set it, so a record with `theme:"tactical"` and no palette is an
   ordinary thing for an older build or a hand-seeded device to hold. Read
   palette-first it answered "no theme" for one: measured, the Defect Log's
   header bar went navy while its own drawer stayed Tactical. The name is the
   fact; the palette is a copy of it. The palette still wins for `custom`,
   which has no table entry and is the one case where the stored colours ARE
   the decision.

   AND THEN IT COMPARES. `custom` is not a theme somebody picked for its look
   — it is what BOTH of those panels set when you change ANY colour in them,
   including one bus status colour or a section background. Treating the name
   alone as "this page has decided its own header" quietly took the Facility
   Map out of the shared setting for every device that had ever nudged a
   status colour, with the Settings row dutifully reporting "its page theme
   decides this" about a header nobody had chosen. So the question is the one
   that was always meant: is this page's header colour different from the one
   it would have had anyway. If it is not, there is nothing to defer to.

   The three callers pass the same two values and get the same answer, which
   is the point: the module and the two pages reading one record and
   disagreeing about it is how a header bar and the drawer under it end up
   different colours. */
export const DEFAULT_MAP_HEADER=MAP_THEMES.default.visuals.header;
export const DEFAULT_PAGE_HEADER=LOG_THEMES.light.appearance.header;

export type PageThemeKind="map"|"page";
export function pageThemeHeader(kind:PageThemeKind,themeName:unknown,storedHeader:unknown){
 if(typeof themeName!=="string")return "";
 const named=(kind==="map"?MAP_HEADERS:PAGE_HEADERS)[themeName];
 const chosen=isHeaderColor(named)?named:(isHeaderColor(storedHeader)?storedHeader:"");
 if(!chosen)return "";
 const colour=normalizeHeaderColor(chosen);
 return colour===normalizeHeaderColor(kind==="map"?DEFAULT_MAP_HEADER:DEFAULT_PAGE_HEADER)?"":colour;
}

/* Built from the tables themselves, so a theme added to either one is carried
   here without a second list to keep in step. */
const MAP_HEADERS:Record<string,string>=Object.fromEntries(Object.entries(MAP_THEMES).map(([key,theme])=>[key,theme.visuals.header]));
const PAGE_HEADERS:Record<string,string>=Object.fromEntries(Object.entries(LOG_THEMES).map(([key,theme])=>[key,theme.appearance.header]));

function parse(raw:string|null){
 try{return JSON.parse(raw||"null") as unknown}catch{return null}
}
function field(saved:unknown,read:(record:Record<string,unknown>)=>unknown){
 if(!saved||typeof saved!=="object")return {theme:undefined as unknown,header:undefined as unknown};
 const record=saved as Record<string,unknown>;
 return {theme:record.theme,header:read(record)};
}

export function pageHeaderThemes(board:unknown,log:unknown):Partial<Record<HeaderSurface,string>>{
 const out:Partial<Record<HeaderSurface,string>>={};
 const board0=field(board,record=>{
  const visuals=record.visuals;
  return visuals&&typeof visuals==="object"?(visuals as Record<string,unknown>).header:undefined;
 });
 const log0=field(log,record=>{
  const appearance=record.appearance;
  return appearance&&typeof appearance==="object"?(appearance as Record<string,unknown>).header:undefined;
 });
 const map=pageThemeHeader("map",board0.theme,board0.header);
 const page=pageThemeHeader("page",log0.theme,log0.header);
 /* Written only when there is one, the absence spelling `setBusHold` and the
    ledger's `gap` use, so `"log" in themes` answers the question directly. */
 if(map)out.map=map;
 if(page){out.log=page;out.fixed=page}
 return out;
}

export function readPageHeaderThemes(board:string|null,log:string|null){
 return pageHeaderThemes(parse(board),parse(log));
}

export function loadPageHeaderThemes(storage:StorageReader):Partial<Record<HeaderSurface,string>>{
 try{return readPageHeaderThemes(storage.getItem(BOARD_SETTINGS_KEY),storage.getItem(LOG_SETTINGS_KEY))}
 catch{return {}}
}
