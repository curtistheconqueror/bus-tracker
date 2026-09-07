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
  pageTitle:{color:"#ffffff",fontSize:25},summary:{color:"#60728c",fontSize:7},mystery:{color:"#0b64bd",fontSize:11},feedTitle:{color:"#163c70",fontSize:17},repairCategory:{color:"#0b64bd",fontSize:9},repairDetails:{color:"#172b4d",fontSize:11},shopNotes:{color:"#405977",fontSize:8},
 },
};

function color(value:unknown,fallback:string){return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):fallback}
function size(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?Math.min(32,Math.max(7,parsed)):fallback}
function text(value:unknown,fallback:string){const result=String(value??"").trim();return result||fallback}

/* A size a device is only carrying because it was once the default is not a
   choice, and the whole Settings blob is written whenever anything in it is
   saved — so raising a default reaches nobody who has ever opened Settings.

   LIVE REPAIR FEED shipped at 12px, which Curtis reads on a phone at arm's
   length across a shop floor; the default is 17px now. A device holding
   exactly the old default is treated as not having chosen, and gets the new
   one. Read-time only: nothing on disk is rewritten, and anybody who actually
   wants 12px can set it again — it then differs from the old default in no way
   this can see, which is the honest limit of the trick and why it is used on
   this one field rather than as a general mechanism. */
const SUPERSEDED_DEFAULT_SIZES:Partial<Record<DefectLogStyleKey,number>>={feedTitle:12};
function legacyDefault(key:DefectLogStyleKey,value:unknown){return Number(value)===SUPERSEDED_DEFAULT_SIZES[key]?undefined:value}

export function normalizeDefectLogDisplay(value:unknown):DefectLogDisplaySettings{
 const saved=(value&&typeof value==="object"?value:{}) as Partial<DefectLogDisplaySettings>;
 const savedLabels=saved.labels||{} as Partial<DefectLogLabels>,savedStyles=saved.styles||{} as Partial<Record<DefectLogStyleKey,Partial<DefectLogTextStyle>>>;
 const labels=Object.fromEntries(Object.entries(DEFAULT_DEFECT_LOG_DISPLAY.labels).map(([key,fallback])=>[key,text(savedLabels[key as keyof DefectLogLabels],fallback)])) as unknown as DefectLogLabels;
 const styles=Object.fromEntries(Object.entries(DEFAULT_DEFECT_LOG_DISPLAY.styles).map(([key,fallback])=>{const candidate=savedStyles[key as DefectLogStyleKey];return [key,{color:color(candidate?.color,fallback.color),fontSize:size(legacyDefault(key as DefectLogStyleKey,candidate?.fontSize),fallback.fontSize)}]})) as Record<DefectLogStyleKey,DefectLogTextStyle>;
 return {labels,styles};
}

/* The bus-group outline colour, accepted only as a plain six-digit hex.

   It ends up in an inline style on the app root, and a settings blob is a file
   somebody can hand-edit and a sync can carry between devices, so it is checked
   rather than trusted. Anything else returns empty, which is the signal to fall
   back to the theme-derived default.

   Lives here rather than in the page because a validator that cannot be
   imported cannot be tested — the first version of this had to be reconstructed
   from source with a regular expression, which broke immediately. */
export function safeBorderColor(value:unknown){
 const text=String(value??"").trim();
 return /^#[0-9a-f]{6}$/i.test(text)?text:"";
}
