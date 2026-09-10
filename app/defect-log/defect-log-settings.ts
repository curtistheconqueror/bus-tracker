/* The Defect Log's settings: what they are, what they default to, and how a
   saved copy is read back. Data only - no JSX - so the shared Settings page,
   the Defect Log and the test runner can all import it.

   Fixed Repairs shares this key (pace-defect-log-settings-v1) for its theme,
   font and appearance, so the shape here is the shape both pages agree on. */

import {safeBorderColor,DEFAULT_DEFECT_LOG_DISPLAY,normalizeDefectLogDisplay,type DefectLogDisplaySettings} from "./defect-log-display-settings.ts";
import {FLEET_BACKUP_INTERVAL,normalizeFleetBackupInterval} from "../storage.ts";

export type Filter="all"|"open"|"in-progress"|"fixed"|"downsheet";
export type LogTheme="light"|"dark"|"midnight"|"tactical"|"custom";
export type LogFontSize="standard"|"large"|"extra";
export type LogFontFamily="clean"|"condensed"|"classic";
export type LogGroupContrast="standard"|"strong";

/* WHERE A VIEW OPTION APPLIES, rather than merely whether it is on.

   Curtis, having seen the feed on three screens: "I'm not sure how this will
   look on an iPad or a bigger screen like the computer. It may not necessarily
   be needed, because I noticed the format is a little cleaner on an iPad or PC.
   So this options-side-steps the whole issue entirely if you're on the phone."

   He is right, and the run-on he is fixing is a phone problem: at 390px the bus
   number column is 64px and the card is 745px tall with three defects open, so
   the number sits in the top eighth of a card that goes on for another 640px.
   At 1180px the same card is 542px with far more width to separate things, and
   it already reads.

   He then asked whether "the system is smart enough to pick up on what device
   you're using based on the pixelation of the screen", and suggested a separate
   phone settings page. It is smarter than that in one way and dumber in
   another, and the difference matters:

   IT KNOWS THE VIEWPORT, NOT THE DEVICE. A media query reports how many CSS
   pixels wide the window is right now. It cannot tell an iPad from a laptop and
   should not try — an iPad in portrait split-screen IS phone-width, a phone in
   landscape is not, and a browser window dragged narrow on the shop computer is
   phone-width too. Every one of those wants the phone treatment, and a stored
   "this is an iPad" answer would be wrong for all three.

   So PHONE is not a device, it is a WIDTH: under 620px, the breakpoint this app
   already uses everywhere. It re-decides on every rotation and every resize,
   live, with nothing stored and nothing to go stale — which is also why this is
   one setting per option rather than the separate phone settings page he
   floated. A second page of settings would have to be told which device it was
   on, and would then be wrong the moment somebody turned the iPad sideways. */
export type ViewScope="off"|"phone"|"always";
export const VIEW_SCOPES:{key:ViewScope;label:string}[]=[
 {key:"off",label:"Off"},
 {key:"phone",label:"Phone only (under 620px)"},
 {key:"always",label:"Every screen"},
];
export function normalizeViewScope(value:unknown):ViewScope{
 return value==="phone"||value==="always"?value:"off";
}
export type LogAppearance={page:string;surface:string;text:string;muted:string;header:string;headerText:string;accent:string};
export type LogSettings={defaultInitials:string;requireInitials:boolean;deferredReviewPrompt:boolean;defaultFilter:Filter;showFixed:boolean;theme:LogTheme;fontSize:LogFontSize;fontFamily:LogFontFamily;groupContrast:LogGroupContrast;groupBorder:string;statusColor:boolean;busRail:ViewScope;busBlueOnly:ViewScope;busEndMarker:ViewScope;appearance:LogAppearance;display:DefectLogDisplaySettings;backupInterval:number};
export const SETTINGS_KEY="pace-defect-log-settings-v1";
export const LIGHT_APPEARANCE:LogAppearance={page:"#e9eef6",surface:"#ffffff",text:"#172b4d",muted:"#60728c",header:"#061d45",headerText:"#ffffff",accent:"#0b64bd"};
export const LOG_THEMES:Record<Exclude<LogTheme,"custom">,{label:string;appearance:LogAppearance}>={
 light:{label:"Light",appearance:LIGHT_APPEARANCE},
 dark:{label:"Dark",appearance:{page:"#101318",surface:"#1d222a",text:"#f3f6fa",muted:"#aeb9c8",header:"#06080c",headerText:"#ffffff",accent:"#4d9cff"}},
 midnight:{label:"Midnight",appearance:{page:"#071225",surface:"#10213d",text:"#e4eeff",muted:"#9eb0cb",header:"#020a18",headerText:"#ffffff",accent:"#68a4ff"}},
 tactical:{label:"Tactical",appearance:{page:"#26291f",surface:"#393e30",text:"#f0ecd7",muted:"#b8b49d",header:"#15180f",headerText:"#f4e8b8",accent:"#bca75f"}},
};
export const FONT_STACKS:Record<LogFontFamily,string>={clean:"Arial, Helvetica, sans-serif",condensed:"'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",classic:"Georgia, 'Times New Roman', serif"};
export const COLOR_FIELDS:[keyof LogAppearance,string][]=[["page","BACKGROUND"],["surface","CARDS"],["text","PRIMARY TEXT"],["muted","SECONDARY TEXT"],["header","HEADER"],["headerText","HEADER TEXT"],["accent","ACCENT"]];
/* ALL THREE DEFAULT TO OFF, and that is the whole reason they are settings.
   Curtis: "I might not like it, but I just wanna make sure we can roll back at
   any point." Off by default means every device that updates looks exactly as
   it did, and a device that turns one on is two taps from turning it off
   again. Nothing here writes to a record, so there is nothing to undo beyond
   the switch itself. */
export const DEFAULT_SETTINGS:LogSettings={defaultInitials:"",requireInitials:false,deferredReviewPrompt:true,defaultFilter:"all",showFixed:true,theme:"light",fontSize:"standard",fontFamily:"clean",groupContrast:"strong",groupBorder:"",statusColor:false,busRail:"off",busBlueOnly:"off",busEndMarker:"off",appearance:{...LIGHT_APPEARANCE},display:DEFAULT_DEFECT_LOG_DISPLAY,backupInterval:FLEET_BACKUP_INTERVAL};
export function readSettings(raw:string|null):LogSettings{try{const saved=JSON.parse(raw||"{}") as Partial<LogSettings>,requireInitials=saved.requireInitials===true,deferredReviewPrompt=saved.deferredReviewPrompt!==false,theme:LogTheme=["light","dark","midnight","tactical","custom"].includes(String(saved.theme))?saved.theme as LogTheme:"light",preset=theme==="custom"?LIGHT_APPEARANCE:LOG_THEMES[theme].appearance,fontSize:LogFontSize=["standard","large","extra"].includes(String(saved.fontSize))?saved.fontSize as LogFontSize:"standard",fontFamily:LogFontFamily=["clean","condensed","classic"].includes(String(saved.fontFamily))?saved.fontFamily as LogFontFamily:"clean",groupContrast:LogGroupContrast=saved.groupContrast==="standard"?"standard":"strong",statusColor=saved.statusColor===true;return {...DEFAULT_SETTINGS,...saved,requireInitials,deferredReviewPrompt,theme,fontSize,fontFamily,groupContrast,groupBorder:safeBorderColor(saved.groupBorder),statusColor,busRail:normalizeViewScope(saved.busRail),busBlueOnly:normalizeViewScope(saved.busBlueOnly),busEndMarker:normalizeViewScope(saved.busEndMarker),appearance:{...preset,...saved.appearance},display:normalizeDefectLogDisplay(saved.display),backupInterval:normalizeFleetBackupInterval(saved.backupInterval)}}catch{return {...DEFAULT_SETTINGS,appearance:{...LIGHT_APPEARANCE},display:normalizeDefectLogDisplay(null)}}}
