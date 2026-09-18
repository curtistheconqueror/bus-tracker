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

/* A COLOUR LEFT AT THE SHIPPED DEFAULT MEANS "FOLLOW THE THEME".

   Every rule in defect-log.css that reads one of these already has a
   theme-aware fallback behind it — var(--log-repair-category-color,
   var(--log-accent)), var(--log-repair-details-color, var(--log-text)), and so
   on. They were written that way on purpose and not one of them had ever
   fired, because the page defines all seven variables from the settings blob
   whether or not anybody chose them, and the shipped values are light-theme
   hex.

   So the three dark themes were rendering light-theme text on dark surfaces.
   Measured on the Defect Log at 1180px, WCAG 2 contrast against the effective
   background, with nothing customised:

                  light   dark   midnight   tactical
     feed title   10.77   1.49   1.50       1.05
     repair text  11.80   1.07   1.08       1.57
     category      4.92   2.24   2.21       1.52

   1.05:1 is the same colour as the background. The defect text — the thing the
   page exists to show — was invisible on three of the four themes.

   THE FIX IS TO STOP ANSWERING WHEN NOBODY ASKED. A stored colour equal to the
   shipped default is not a choice; it is the absence of one, and the fallback
   behind it already knows what to do. A stored colour that differs IS a choice
   and still wins, on every theme, exactly as before.

   The honest limit of this, the same one SUPERSEDED_DEFAULT_SIZES above admits:
   somebody who deliberately picks the default blue is indistinguishable from
   somebody who never picked. They get the theme colour. That is why the
   Settings panel labels these FOLLOWING THEME rather than leaving it to be
   discovered, and why picking any other colour pins it.

   Nothing on disk is rewritten. This is read-time, like every other rename and
   default in this project. */
export function followsTheme(key:DefectLogStyleKey,color:string){
 return String(color||"").toLowerCase()===DEFAULT_DEFECT_LOG_DISPLAY.styles[key].color.toLowerCase();
}

/* The custom properties to hand the page, colours omitted where the theme
   should answer. Sizes are always emitted: a font size means the same thing on
   every theme.

   ON THE LIGHT THEME THE DEFAULTS ARE STILL EMITTED, and that is the point
   rather than an exception. These seven values ARE light-theme colours, picked
   by hand for this app on white — LIVE REPAIR FEED's #163c70 is a deeper navy
   than the accent, chosen deliberately. Handing the fallback the job on light
   too would have swapped it for the accent and dropped its contrast from
   10.77:1 to 5.77:1: still legible, still a change nobody asked for, on the
   theme almost everybody uses.

   So "follow the theme" means what it says. On light, the theme's answer is
   the value that was designed for it. On the three dark ones — and on a custom
   palette, which can be anything at all — the fallback knows and this file
   does not. */
export function displayStyleVars(display:DefectLogDisplaySettings,theme:string){
 const vars:Record<string,string>={};
 for(const key of Object.keys(DEFAULT_DEFECT_LOG_DISPLAY.styles) as DefectLogStyleKey[]){
  const style=display.styles[key],name=key.replace(/[A-Z]/g,letter=>"-"+letter.toLowerCase());
  if(theme==="light"||!followsTheme(key,style.color))vars["--log-"+name+"-color"]=style.color;
  vars["--log-"+name+"-size"]=style.fontSize+"px";
 }
 return vars;
}
