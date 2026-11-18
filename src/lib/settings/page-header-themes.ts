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

import {headerContrast,isHeaderColor,normalizeHeaderColor,type HeaderSurface} from "./header-theme.ts";
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
const MAP_INKS:Record<string,string>=Object.fromEntries(Object.entries(MAP_THEMES).map(([key,theme])=>[key,theme.visuals.headerText]));
const PAGE_INKS:Record<string,string>=Object.fromEntries(Object.entries(LOG_THEMES).map(([key,theme])=>[key,theme.appearance.headerText]));

/* THE BACKGROUND AND THE INK THAT WAS DESIGNED WITH IT, together.

   Curtis: *"Themes should not be affected by default design."* Tactical's
   header is `#15180f` with `#e7ddb2` on it, and that pairing is the theme.
   Returned as one value because a caller that asks for the colour here and
   computes the ink somewhere else is how the khaki became white in the first
   place.

   The ink is read table-first and stored-second, which is the rule the colour
   above already follows and for the same reason: the palette on disk is a
   DERIVED copy written beside the theme name, so a record carrying
   `theme:"tactical"` and no palette is an ordinary thing for an older build
   to hold. `custom` has no table entry, and there the stored colours ARE the
   decision.

   `null` means this page's theme is not deciding its header at all — the
   default theme, or a colour equal to the default — and the shared app colour
   answers, ink included. */
export type PageHeaderTheme={header:string;text:string};

/* AND A PAIRING THAT HIDES ITS OWN WORDS IS NOT HONOURED.

   `headerTextFor` exists so that no background the picker hands out can take
   the page title with it — floored at 4.12:1 over the whole colour cube. Giving
   a page theme its ink back puts a hole in that guarantee, because the ink is
   then whatever is on the record rather than whatever reads.

   MEASURED: `{theme:"custom",visuals:{header:"#ffffff",headerText:"#ffffff"}}`
   is reachable from the Facility Map's own appearance panel — it offers Header
   Background and Header Text side by side and writes `theme:"custom"` on any
   change — and it drew a white title on a white header at 1:1, with the
   Settings note dutifully printing `1:1 on Facility Map`. Before the ink
   followed the theme that same record computed black.

   So the stored pairing wins only while it is legible. The floor is AA for
   normal text rather than for the 25px title, because a header also carries
   its kicker, its subtitle and its nav labels at 8 to 10px. Every named theme
   clears it by a wide margin — the lowest is Tactical's khaki at 9.97:1 — so
   this never bites a designed pairing; it catches the palette nobody designed.

   Applied to the table's own inks as well, not just stored ones. A theme added
   in six months with a bad pairing should fall back rather than ship it. */
export const MINIMUM_PAGE_INK_CONTRAST=4.5;
export function pageThemeHeaderPair(kind:PageThemeKind,themeName:unknown,storedHeader:unknown,storedText:unknown):PageHeaderTheme|null{
 const header=pageThemeHeader(kind,themeName,storedHeader);
 if(!header)return null;
 const named=(kind==="map"?MAP_INKS:PAGE_INKS)[String(themeName)];
 const ink=isHeaderColor(named)?named:(isHeaderColor(storedText)?storedText:"");
 if(!ink)return {header,text:""};
 const colour=normalizeHeaderColor(ink);
 return {header,text:headerContrast(header,colour)>=MINIMUM_PAGE_INK_CONTRAST?colour:""};
}

function parse(raw:string|null){
 try{return JSON.parse(raw||"null") as unknown}catch{return null}
}
function field(saved:unknown,read:(record:Record<string,unknown>)=>unknown,readText:(record:Record<string,unknown>)=>unknown){
 if(!saved||typeof saved!=="object")return {theme:undefined as unknown,header:undefined as unknown,text:undefined as unknown};
 const record=saved as Record<string,unknown>;
 return {theme:record.theme,header:read(record),text:readText(record)};
}

export function pageHeaderThemes(board:unknown,log:unknown):Partial<Record<HeaderSurface,PageHeaderTheme>>{
 const out:Partial<Record<HeaderSurface,PageHeaderTheme>>={};
 const board0=field(board,record=>{
  const visuals=record.visuals;
  return visuals&&typeof visuals==="object"?(visuals as Record<string,unknown>).header:undefined;
 },record=>{
  const visuals=record.visuals;
  return visuals&&typeof visuals==="object"?(visuals as Record<string,unknown>).headerText:undefined;
 });
 const log0=field(log,record=>{
  const appearance=record.appearance;
  return appearance&&typeof appearance==="object"?(appearance as Record<string,unknown>).header:undefined;
 },record=>{
  const appearance=record.appearance;
  return appearance&&typeof appearance==="object"?(appearance as Record<string,unknown>).headerText:undefined;
 });
 const map=pageThemeHeaderPair("map",board0.theme,board0.header,board0.text);
 const page=pageThemeHeaderPair("page",log0.theme,log0.header,log0.text);
 /* Written only when there is one, the absence spelling `setBusHold` and the
    ledger's `gap` use, so `"log" in themes` answers the question directly. */
 if(map)out.map=map;
 if(page){out.log=page;out.fixed=page}
 return out;
}

export function readPageHeaderThemes(board:string|null,log:string|null){
 return pageHeaderThemes(parse(board),parse(log));
}

export function loadPageHeaderThemes(storage:StorageReader):Partial<Record<HeaderSurface,PageHeaderTheme>>{
 try{return readPageHeaderThemes(storage.getItem(BOARD_SETTINGS_KEY),storage.getItem(LOG_SETTINGS_KEY))}
 catch{return {}}
}
