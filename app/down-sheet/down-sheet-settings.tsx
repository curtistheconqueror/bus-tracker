"use client";

import {DEFAULT_DOWN_SHEET_DISPLAY,DOWN_SHEET_LABEL_NAMES,DOWN_SHEET_STYLE_LABELS,normalizeDownSheetDisplay,type DownSheetDisplaySettings,type DownSheetLabels,type DownSheetStyleKey} from "./down-sheet-display-settings";

type Shift="1st"|"2nd"|"3rd";
type Props={transfer:React.ReactNode;defaultInitials:string;setDefaultInitials:(value:string)=>void;defaultShift:Shift;setDefaultShift:(value:Shift)=>void;showCompleted:boolean;setShowCompleted:(value:boolean)=>void;display:DownSheetDisplaySettings;setDisplay:(value:DownSheetDisplaySettings)=>void;onClose:()=>void};

export default function DownSheetSettings({transfer,defaultInitials,setDefaultInitials,defaultShift,setDefaultShift,showCompleted,setShowCompleted,display,setDisplay,onClose}:Props){
 const setLabel=(key:keyof DownSheetLabels,value:string)=>setDisplay({...display,labels:{...display.labels,[key]:value}});
 const setStyle=(key:DownSheetStyleKey,field:"color"|"fontSize",value:string)=>setDisplay({...display,styles:{...display.styles,[key]:{...display.styles[key],[field]:field==="fontSize"?Number(value):value}}});
 return <div className="down-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="down-settings-modal">
   <div className="repair-editor-head"><span>DOWN SHEET ADMINISTRATION<h2>Settings</h2></span><button type="button" onClick={onClose}>×</button></div>
   <div className="down-settings-body">
    <label>DEFAULT INITIALS<input maxLength={6} autoCapitalize="characters" value={defaultInitials} onChange={event=>setDefaultInitials(event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="Example: JD"/><small>Pre-fills initials for each update.</small></label>
    <label>DEFAULT SHIFT<select value={defaultShift} onChange={event=>setDefaultShift(event.target.value as Shift)}><option>1st</option><option>2nd</option><option>3rd</option></select></label>
    <label className="settings-check"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span>SHOW COMPLETED</span></label>
    <section className="down-settings-group"><h3>WORDING</h3><div className="down-wording-grid">{(Object.keys(DOWN_SHEET_LABEL_NAMES) as (keyof DownSheetLabels)[]).map(key=><label key={key}>{DOWN_SHEET_LABEL_NAMES[key]}<input value={display.labels[key]} onChange={event=>setLabel(key,event.target.value)}/></label>)}</div></section>
    <section className="down-settings-group"><h3>TEXT STYLE</h3><div className="down-style-grid">{(Object.keys(DOWN_SHEET_STYLE_LABELS) as DownSheetStyleKey[]).map(key=><div key={key}><b>{DOWN_SHEET_STYLE_LABELS[key]}</b><label>COLOR<input type="color" value={display.styles[key].color} onChange={event=>setStyle(key,"color",event.target.value)}/></label><label>SIZE<input type="number" min="7" max="32" value={display.styles[key].fontSize} onChange={event=>setStyle(key,"fontSize",event.target.value)}/></label></div>)}</div><button type="button" className="reset-down-text" onClick={()=>setDisplay(normalizeDownSheetDisplay(DEFAULT_DOWN_SHEET_DISPLAY))}>RESET TEXT</button></section>
    <section className="down-settings-group"><h3>MOVE THE SHEET BETWEEN DEVICES</h3>{transfer}</section>
    <div className="settings-capacity"><b>98</b><span>Maximum entries on this device</span></div>
    <p>Records live on this device. Use the transfer above to send the sheet to another one; a shared backend is still to come.</p>
   </div>
   <div className="repair-editor-actions"><button className="save-repair" type="button" onClick={onClose}>DONE</button></div>
  </section>
 </div>;
}