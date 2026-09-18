export type DownSheetStyleKey="pageTitle"|"summary"|"quickNotes"|"sheetTitle"|"columnHeaders"|"reasonCategory"|"reasonDetails";
export type DownSheetTextStyle={color:string;fontSize:number};
export type DownSheetLabels={
 pageTitle:string;subtitle:string;active:string;pending:string;accident:string;waiting:string;completed:string;activeLabor:string;currentView:string;capacity:string;
 quickNotes:string;sheetKicker:string;sheetTitle:string;line:string;busNumber:string;reasonDown:string;assignment:string;section:string;shift:string;workStatus:string;estimatedTime:string;updatedBy:string;
};
export type DownSheetDisplaySettings={labels:DownSheetLabels;styles:Record<DownSheetStyleKey,DownSheetTextStyle>};

export const DOWN_SHEET_LABEL_NAMES:Record<keyof DownSheetLabels,string>={
 pageTitle:"Page Title",subtitle:"Subtitle",active:"Active",pending:"Pending",accident:"Accident",waiting:"Waiting",completed:"Completed",activeLabor:"Active Labor",currentView:"Current View",capacity:"Capacity",quickNotes:"Quick Notes",sheetKicker:"Sheet Kicker",sheetTitle:"Sheet Title",line:"Line",busNumber:"Bus Number",reasonDown:"Reason Down",assignment:"Assignment",section:"Section",shift:"Shift",workStatus:"Work Status",estimatedTime:"Estimated Time",updatedBy:"Updated By",
};

export const DOWN_SHEET_STYLE_LABELS:Record<DownSheetStyleKey,string>={
 pageTitle:"Page Title",summary:"Summary",quickNotes:"Quick Notes",sheetTitle:"Sheet Title",columnHeaders:"Column Headers",reasonCategory:"Reason Title",reasonDetails:"Reason Details",
};

export const DEFAULT_DOWN_SHEET_DISPLAY:DownSheetDisplaySettings={
 labels:{
  pageTitle:"Interactive Down Sheet",subtitle:"Repair scheduling and live fleet-status control",active:"ACTIVE DOWN",pending:"PENDING",accident:"ACCIDENT",waiting:"WAITING PARTS",completed:"COMPLETED TODAY",activeLabor:"EST. ACTIVE LABOR",currentView:"EST. CURRENT VIEW",capacity:"SHEET CAPACITY",
  quickNotes:"QUICK NOTES",sheetKicker:"MAINTENANCE FACILITY",sheetTitle:"Maintenance Down Sheet",line:"LINE",busNumber:"BUS NUMBER",reasonDown:"REASON DOWN",assignment:"MECHANIC / VENDOR",section:"SECTION",shift:"SHIFT",workStatus:"WORK STATUS",estimatedTime:"EST. TIME",updatedBy:"UPDATED BY",
 },
 styles:{
  pageTitle:{color:"#ffffff",fontSize:25},summary:{color:"#657590",fontSize:8},quickNotes:{color:"#163765",fontSize:10},sheetTitle:{color:"#163765",fontSize:15},columnHeaders:{color:"#21395f",fontSize:8},reasonCategory:{color:"#075dbb",fontSize:13},reasonDetails:{color:"#1c3154",fontSize:10},
 },
};

function color(value:unknown,fallback:string){return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):fallback}
function size(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?Math.min(32,Math.max(7,parsed)):fallback}
function text(value:unknown,fallback:string){const result=String(value??"").trim();return result||fallback}

export function normalizeDownSheetDisplay(value:unknown):DownSheetDisplaySettings{
 const saved=(value&&typeof value==="object"?value:{}) as Partial<DownSheetDisplaySettings>;
 const savedLabels=saved.labels||{} as Partial<DownSheetLabels>,savedStyles=saved.styles||{} as Partial<Record<DownSheetStyleKey,Partial<DownSheetTextStyle>>>;
 const labels=Object.fromEntries(Object.entries(DEFAULT_DOWN_SHEET_DISPLAY.labels).map(([key,fallback])=>[key,text(savedLabels[key as keyof DownSheetLabels],fallback)])) as unknown as DownSheetLabels;
 const styles=Object.fromEntries(Object.entries(DEFAULT_DOWN_SHEET_DISPLAY.styles).map(([key,fallback])=>{const candidate=savedStyles[key as DownSheetStyleKey];return [key,{color:color(candidate?.color,fallback.color),fontSize:size(candidate?.fontSize,fallback.fontSize)}]})) as Record<DownSheetStyleKey,DownSheetTextStyle>;
 return {labels,styles};
}
