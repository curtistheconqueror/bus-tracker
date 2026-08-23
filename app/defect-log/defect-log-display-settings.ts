export type DefectLogStyleKey="pageTitle"|"summary"|"mystery"|"feedTitle"|"repairCategory"|"repairDetails"|"shopNotes";
export type DefectLogTextStyle={color:string;fontSize:number};
export type DefectLogLabels={
 pageTitle:string;subtitle:string;active:string;buses:string;progress:string;downing:string;fixed:string;mysteryTitle:string;mysterySubtitle:string;feedTitle:string;shopNotes:string;
};
export type DefectLogDisplaySettings={labels:DefectLogLabels;styles:Record<DefectLogStyleKey,DefectLogTextStyle>};

export const DEFECT_LOG_LABEL_NAMES:Record<keyof DefectLogLabels,string>={
 pageTitle:"Page Title",subtitle:"Subtitle",active:"Active",buses:"Buses",progress:"In Progress",downing:"Downing",fixed:"Fixed",mysteryTitle:"Mystery Title",mysterySubtitle:"Mystery Subtitle",feedTitle:"Feed Title",shopNotes:"Shop Notes",
};

export const DEFECT_LOG_STYLE_LABELS:Record<DefectLogStyleKey,string>={
 pageTitle:"Page Title",summary:"Summary",mystery:"Mystery",feedTitle:"Feed Title",repairCategory:"Repair Title",repairDetails:"Repair Details",shopNotes:"Shop Notes",
};

export const DEFAULT_DEFECT_LOG_DISPLAY:DefectLogDisplaySettings={
 labels:{
  pageTitle:"Real-Time Defect Log",subtitle:"Repairs, findings, and follow-up as they happen",active:"ACTIVE DEFECTS",buses:"BUSES AFFECTED",progress:"IN PROGRESS",downing:"DOWNING",fixed:"FIXED TODAY",mysteryTitle:"MYSTERY BUSES",mysterySubtitle:"ON-SITE WORK AREAS NOT ON DOWN SHEET",feedTitle:"LIVE REPAIR FEED",shopNotes:"SHOP NOTES",
 },
 styles:{
  pageTitle:{color:"#ffffff",fontSize:25},summary:{color:"#60728c",fontSize:7},mystery:{color:"#0b64bd",fontSize:11},feedTitle:{color:"#163c70",fontSize:12},repairCategory:{color:"#0b64bd",fontSize:9},repairDetails:{color:"#172b4d",fontSize:11},shopNotes:{color:"#405977",fontSize:8},
 },
};

function color(value:unknown,fallback:string){return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):fallback}
function size(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?Math.min(32,Math.max(7,parsed)):fallback}
function text(value:unknown,fallback:string){const result=String(value??"").trim();return result||fallback}

export function normalizeDefectLogDisplay(value:unknown):DefectLogDisplaySettings{
 const saved=(value&&typeof value==="object"?value:{}) as Partial<DefectLogDisplaySettings>;
 const savedLabels=saved.labels||{} as Partial<DefectLogLabels>,savedStyles=saved.styles||{} as Partial<Record<DefectLogStyleKey,Partial<DefectLogTextStyle>>>;
 const labels=Object.fromEntries(Object.entries(DEFAULT_DEFECT_LOG_DISPLAY.labels).map(([key,fallback])=>[key,text(savedLabels[key as keyof DefectLogLabels],fallback)])) as unknown as DefectLogLabels;
 const styles=Object.fromEntries(Object.entries(DEFAULT_DEFECT_LOG_DISPLAY.styles).map(([key,fallback])=>{const candidate=savedStyles[key as DefectLogStyleKey];return [key,{color:color(candidate?.color,fallback.color),fontSize:size(candidate?.fontSize,fallback.fontSize)}]})) as Record<DefectLogStyleKey,DefectLogTextStyle>;
 return {labels,styles};
}
