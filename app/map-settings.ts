/* The Facility Map's status colours, visual theme and board options - the
   model behind the map's settings, written down once so the map and the shared
   Settings page read and write the same thing. Data only - no JSX. */

import {confirmationPreference} from "./confirmation-preferences.ts";
import {SERVICE_INTERVALS_UNIT,readSavedServiceIntervals,type ServiceIntervals} from "./service-intervals.ts";
import {writeSetting} from "./storage.ts";

export type S="shop"|"service"|"defect"|"out"|"decommissioned"|"unknown";
export type BusDisplayMode="icon"|"number";
export const ST:Record<S,[string,string]>={service:["IN SERVICE / ON ROAD","#1764d8"],defect:["IN SERVICE WITH DEFECTS","#159447"],shop:["WORK IN PROGRESS","#efa400"],out:["OUT OF SERVICE","#c91f27"],decommissioned:["DECOMMISSIONED / DOWN INDEFINITELY","#343a40"],unknown:["UNKNOWN / MYSTERY","#777"]};
export const DEFAULT_COLORS=Object.fromEntries(Object.entries(ST).map(([key,value])=>[key,value[1]])) as Record<S,string>;
export const SECTION_THEME_KEYS=[["service","Service Detail"],["paint","Paint Booth"],["wash","Wash Rack"],["body","Body Shop"],["bays","Shop Bays"],["office","Foreman Office"],["pit","Pit"],["brake","Brake Test"],["tow","Tow / Staging"],["east","CNG East"],["road","In Service / On Road"],["wall","Shop Wall"],["garage","Main Garage"],["west","CNG West"],["waiting","Waiting Area"]] as const;
export type SectionThemeKey=typeof SECTION_THEME_KEYS[number][0];
export type Visuals={page:string;panel:string;text:string;header:string;headerText:string;title:string;border:string;slot:string;command:string;commandText:string;garageSpecial:string;garageFrame:string;mysterySlot:string;downSheetBadge:string;downSheetBadgeText:string;sections:Record<SectionThemeKey,string>};
export const sectionFill=(color:string)=>Object.fromEntries(SECTION_THEME_KEYS.map(([key])=>[key,color])) as Record<SectionThemeKey,string>;
export const DEFAULT_VISUALS:Visuals={page:"#f4f6fa",panel:"#ffffff",text:"#112657",header:"#06275c",headerText:"#ffffff",title:"#172957",border:"#9cadd1",slot:"#ffffff",command:"#16284d",commandText:"#ffffff",garageSpecial:"#edf3ff",garageFrame:"#062d66",mysterySlot:"#edf3ff",downSheetBadge:"#7c3aed",downSheetBadgeText:"#ffffff",sections:sectionFill("#fbfcff")};
export const THEMES:Record<string,{label:string;visuals:Visuals;colors:Record<S,string>}>= {
 default:{label:"Default",visuals:DEFAULT_VISUALS,colors:DEFAULT_COLORS},
 terminal:{label:"Terminal",visuals:{page:"#021b10",panel:"#052719",text:"#b8ffd3",header:"#00150c",headerText:"#61ff9d",title:"#61ff9d",border:"#197444",slot:"#0a3322",command:"#00150c",commandText:"#61ff9d",garageSpecial:"#123f2b",garageFrame:"#0e5b34",mysterySlot:"#123f2b",downSheetBadge:"#61ff9d",downSheetBadgeText:"#00150c",sections:sectionFill("#062d1d")},colors:{service:"#20a4ff",defect:"#00ff75",shop:"#ffe600",out:"#ff4050",decommissioned:"#343a40",unknown:"#8bbca0"}},
 black:{label:"Black / Dark",visuals:{page:"#000000",panel:"#111111",text:"#f1f1f1",header:"#000000",headerText:"#ffffff",title:"#ffffff",border:"#444444",slot:"#181818",command:"#050505",commandText:"#ffffff",garageSpecial:"#262626",garageFrame:"#000000",mysterySlot:"#262626",downSheetBadge:"#000000",downSheetBadgeText:"#ffffff",sections:sectionFill("#111111")},colors:{service:"#3b82f6",defect:"#25c466",shop:"#f4b400",out:"#ef3340",decommissioned:"#2b2b2b",unknown:"#8a8a8a"}},
 midnight:{label:"Midnight",visuals:{page:"#071225",panel:"#0d1d38",text:"#dbe9ff",header:"#020a18",headerText:"#ffffff",title:"#79a9ff",border:"#27446e",slot:"#132847",command:"#030c1c",commandText:"#dbe9ff",garageSpecial:"#1b365f",garageFrame:"#071225",mysterySlot:"#1b365f",downSheetBadge:"#7c3aed",downSheetBadgeText:"#ffffff",sections:sectionFill("#0f213f")},colors:{service:"#3388ff",defect:"#27c978",shop:"#ffc928",out:"#ff4d5e",decommissioned:"#273142",unknown:"#8496b2"}},
 tactical:{label:"Tactical",visuals:{page:"#25281e",panel:"#34392a",text:"#e5e2c6",header:"#15180f",headerText:"#e7ddb2",title:"#d2c38f",border:"#697056",slot:"#414733",command:"#171a12",commandText:"#e7ddb2",garageSpecial:"#4b503b",garageFrame:"#24281b",mysterySlot:"#4b503b",downSheetBadge:"#d2c38f",downSheetBadgeText:"#15180f",sections:sectionFill("#383e2e")},colors:{service:"#4f87b8",defect:"#6fae4f",shop:"#d4aa3e",out:"#b94b43",decommissioned:"#2a2d27",unknown:"#8b8e78"}}
};

/* The board settings as one value, read the way the Facility Map has always
   read them and written back over whatever else the key holds.

   The key also carries downSheetBadgeView, which the DS badge menu on the map
   sets, and a statusVersion, and anything a later release adds - so a writer
   that replaces the whole object would quietly drop those. Every write here
   merges over the stored copy. */
export type BoardSettings={
 colors:Record<S,string>;
 visuals:Visuals;
 theme:string;
 singleTapEmptySpaces:boolean;
 busDisplay:BusDisplayMode;
 showDownSheetBadges:boolean;
 downSheetBadgeView:"all"|"ready-road"|"off-road";
 confirmMoves:boolean;
 confirmDefects:boolean;
 serviceIntervals:ServiceIntervals;
};

export const BOARD_SETTINGS_KEY="pace-board-settings-v1";

/* The same normalisation the map applies on load, so a value written by the
   Settings page and a value written by the map read back identically. */
export function readBoardSettings(raw:string|null):BoardSettings{
 let ui:Record<string,unknown>={};
 try{ui=JSON.parse(raw||"{}")||{}}catch{ui={}}
 const savedTheme=typeof ui.theme==="string"?ui.theme:ui.dark?"black":"default";
 const preset=THEMES[savedTheme]||THEMES.default;
 const saved=ui.visuals&&typeof ui.visuals==="object"?ui.visuals as Partial<Visuals>:null;
 const visuals=saved?{...DEFAULT_VISUALS,...saved,sections:{...DEFAULT_VISUALS.sections,...(saved.sections||{})}}:(ui.dark?THEMES.black.visuals:DEFAULT_VISUALS);
 const view=ui.downSheetBadgeView;
 return {
  colors:ui.statusVersion===3&&ui.colors&&typeof ui.colors==="object"?{...DEFAULT_COLORS,...(ui.colors as Record<S,string>)}:{...preset.colors},
  visuals,
  theme:savedTheme,
  singleTapEmptySpaces:ui.singleTapEmptySpaces===true,
  busDisplay:ui.busDisplay==="number"?"number":"icon",
  showDownSheetBadges:ui.showDownSheetBadges!==false,
  downSheetBadgeView:view==="ready-road"||view==="off-road"?view:"all",
  confirmMoves:confirmationPreference(ui.confirmMoves),
  confirmDefects:confirmationPreference(ui.confirmDefects),
  serviceIntervals:readSavedServiceIntervals(ui.serviceIntervalsUnit,ui.serviceIntervals),
 };
}

export function writeBoardSettings(storage:Storage,next:BoardSettings){
 let current:Record<string,unknown>={};
 try{current=JSON.parse(storage.getItem(BOARD_SETTINGS_KEY)||"{}")||{}}catch{current={}}
 return writeSetting(storage,BOARD_SETTINGS_KEY,JSON.stringify({...current,statusVersion:3,
  colors:next.colors,visuals:next.visuals,theme:next.theme,singleTapEmptySpaces:next.singleTapEmptySpaces,
  busDisplay:next.busDisplay,showDownSheetBadges:next.showDownSheetBadges,downSheetBadgeView:next.downSheetBadgeView,
  confirmMoves:next.confirmMoves,confirmDefects:next.confirmDefects,
  serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals:next.serviceIntervals}));
}
