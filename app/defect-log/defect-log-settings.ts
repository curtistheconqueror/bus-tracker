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
export type LogAppearance={page:string;surface:string;text:string;muted:string;header:string;headerText:string;accent:string};
export type LogSettings={defaultInitials:string;requireInitials:boolean;defaultFilter:Filter;showFixed:boolean;theme:LogTheme;fontSize:LogFontSize;fontFamily:LogFontFamily;groupContrast:LogGroupContrast;groupBorder:string;statusColor:boolean;appearance:LogAppearance;display:DefectLogDisplaySettings;backupInterval:number};
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
export const DEFAULT_SETTINGS:LogSettings={defaultInitials:"",requireInitials:false,defaultFilter:"all",showFixed:true,theme:"light",fontSize:"standard",fontFamily:"clean",groupContrast:"strong",groupBorder:"",statusColor:false,appearance:{...LIGHT_APPEARANCE},display:DEFAULT_DEFECT_LOG_DISPLAY,backupInterval:FLEET_BACKUP_INTERVAL};
export function readSettings(raw:string|null):LogSettings{try{const saved=JSON.parse(raw||"{}") as Partial<LogSettings>,requireInitials=saved.requireInitials===true,theme:LogTheme=["light","dark","midnight","tactical","custom"].includes(String(saved.theme))?saved.theme as LogTheme:"light",preset=theme==="custom"?LIGHT_APPEARANCE:LOG_THEMES[theme].appearance,fontSize:LogFontSize=["standard","large","extra"].includes(String(saved.fontSize))?saved.fontSize as LogFontSize:"standard",fontFamily:LogFontFamily=["clean","condensed","classic"].includes(String(saved.fontFamily))?saved.fontFamily as LogFontFamily:"clean",groupContrast:LogGroupContrast=saved.groupContrast==="standard"?"standard":"strong",statusColor=saved.statusColor===true;return {...DEFAULT_SETTINGS,...saved,requireInitials,theme,fontSize,fontFamily,groupContrast,groupBorder:safeBorderColor(saved.groupBorder),statusColor,appearance:{...preset,...saved.appearance},display:normalizeDefectLogDisplay(saved.display),backupInterval:normalizeFleetBackupInterval(saved.backupInterval)}}catch{return {...DEFAULT_SETTINGS,appearance:{...LIGHT_APPEARANCE},display:normalizeDefectLogDisplay(null)}}}
