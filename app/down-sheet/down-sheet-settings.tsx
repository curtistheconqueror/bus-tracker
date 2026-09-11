"use client";

import {DEFAULT_DOWN_SHEET_DISPLAY,DOWN_SHEET_LABEL_NAMES,DOWN_SHEET_STYLE_LABELS,normalizeDownSheetDisplay,type DownSheetDisplaySettings,type DownSheetLabels,type DownSheetStyleKey} from "./down-sheet-display-settings";

import {DOWN_SHEET_GROUPS,OPTIONAL_DOWN_TILES,type DownSheetGroupKey,type OptionalDownTile,type Shift} from "./down-sheet-settings-store";
import {SettingsDrawer,SettingsDrawers} from "../settings/settings-drawer";
export type {Shift};
type Props={transfer:React.ReactNode;defaultInitials:string;setDefaultInitials:(value:string)=>void;defaultShift:Shift;setDefaultShift:(value:Shift)=>void;showCompleted:boolean;setShowCompleted:(value:boolean)=>void;extraTiles:OptionalDownTile[];setExtraTiles:(value:OptionalDownTile[])=>void;sectionOrder:DownSheetGroupKey[];setSectionOrder:(value:DownSheetGroupKey[])=>void;showQuickNotes:boolean;setShowQuickNotes:(value:boolean)=>void;display:DownSheetDisplaySettings;setDisplay:(value:DownSheetDisplaySettings)=>void;onClose:()=>void;/* Rendered on the shared Settings page without the shade or the close and DONE buttons; every change there saves as it is made. */inline?:boolean};

export default function DownSheetSettings({transfer,defaultInitials,setDefaultInitials,defaultShift,setDefaultShift,showCompleted,setShowCompleted,extraTiles,setExtraTiles,sectionOrder,setSectionOrder,showQuickNotes,setShowQuickNotes,display,setDisplay,onClose,inline=false}:Props){
 /* Swap with the neighbour rather than drag: this is read on a phone in a shop,
    and a drag list there is a way to lose your place. */
 const moveSection=(index:number,by:number)=>{
  const next=[...sectionOrder],target=index+by;
  if(target<0||target>=next.length)return;
  [next[index],next[target]]=[next[target],next[index]];
  setSectionOrder(next);
 };
 const toggleTile=(key:OptionalDownTile,on:boolean)=>setExtraTiles(on?[...extraTiles.filter(item=>item!==key),key]:extraTiles.filter(item=>item!==key));
 const setLabel=(key:keyof DownSheetLabels,value:string)=>setDisplay({...display,labels:{...display.labels,[key]:value}});
 const setStyle=(key:DownSheetStyleKey,field:"color"|"fontSize",value:string)=>setDisplay({...display,styles:{...display.styles,[key]:{...display.styles[key],[field]:field==="fontSize"?Number(value):value}}});
 const panel=<>
  <section className="down-settings-modal">
   {/* THE PANEL'S OWN "PAGE NAME / Settings" HEADER IS NOT DRAWN INLINE.
       On the Settings page this sits immediately under a section header that
       already says the same two things, one in 9px caps and one at 26px —
       exactly the doubling Curtis hit: "the different sections have their own
       settings section. This looks confusing as well because the same layout
       is right above." It is kept for the modal path, which has no section
       header above it. */}
   {!inline&&<div className="repair-editor-head"><span>DOWN SHEET ADMINISTRATION<h2>Settings</h2></span><button type="button" onClick={onClose}>×</button></div>}
   <div className="down-settings-body">
    <SettingsDrawers>
    <SettingsDrawer title="DEFAULTS FOR NEW ENTRIES" note="Initials, shift, and whether finished rows stay on the sheet.">
    <label>DEFAULT INITIALS<input maxLength={6} autoCapitalize="characters" value={defaultInitials} onChange={event=>setDefaultInitials(event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="Example: JD"/><small>Pre-fills initials for each update.</small></label>
    <label>DEFAULT SHIFT<select value={defaultShift} onChange={event=>setDefaultShift(event.target.value as Shift)}><option>1st</option><option>2nd</option><option>3rd</option></select></label>
    <label className="settings-check"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span>SHOW COMPLETED</span></label>
    </SettingsDrawer>
    <SettingsDrawer title="LAYOUT" note="Band order, the extra count tiles, and QUICK NOTES.">
    {/* The eight tiles the shop reads are always on the board, in the order
        Curtis set. These six are real numbers that most days nobody needs, so
        they are asked for rather than assumed — the scoreboard had grown into
        a wall you scroll past to reach the sheet. Per device, like every other
        view preference here. */}
    {/* Which band is read first is a shop preference, not a property of the
        data: one foreman wants INSPECTIONS at the top because that is the work
        being planned, another wants UNSCHEDULED first because that is the work
        nobody has picked up yet. The sheet is numerical inside each band either
        way, which is why the ORDER control beside the search box went. */}
    <section className="down-settings-group"><h3>SECTION ORDER</h3>
     <p className="down-settings-hint">The order the four bands are read down the sheet. Buses stay in bus-number order inside each one.</p>
     <ol className="down-section-order">{sectionOrder.map((key,index)=>{
      const band=DOWN_SHEET_GROUPS.find(group=>group.key===key);
      return <li key={key}><span><b>{band?.label||key}</b><small>{band?.hint||""}</small></span>
       <span className="down-section-move">
        <button type="button" onClick={()=>moveSection(index,-1)} disabled={index===0} aria-label={"Move "+(band?.label||key)+" up"}>{"\u25B2"}</button>
        <button type="button" onClick={()=>moveSection(index,1)} disabled={index===sectionOrder.length-1} aria-label={"Move "+(band?.label||key)+" down"}>{"\u25BC"}</button>
       </span></li>})}</ol>
    </section>
    <section className="down-settings-group"><h3>EXTRA COUNT TILES</h3>
     <p className="down-settings-hint">TOTAL ON SHEET, DOWN BUSES, SCHEDULED, COMPLETED TODAY, UNSCHEDULED, INSPECTIONS &amp; SCHEDULED MAINTENANCE and the two road counts are always on the board. Tick anything else you want beside them.</p>
     <div className="down-tile-choices">{OPTIONAL_DOWN_TILES.map(tile=>
      <label className="settings-check" key={tile.key}><input type="checkbox" checked={extraTiles.includes(tile.key)} onChange={event=>toggleTile(tile.key,event.target.checked)}/><span>{tile.label}</span></label>)}</div>
    </section>
    {/* Off by default. It was a permanent panel between the counts and the
        sheet on a page whose whole problem was how much sits above the rows. */}
    <label className="settings-check"><input type="checkbox" checked={showQuickNotes} onChange={event=>setShowQuickNotes(event.target.checked)}/><span>SHOW QUICK NOTES</span></label>
    </SettingsDrawer>
    {/* CLOSED BY DEFAULT, and the reason it is first among the ones Curtis
        named: this is a grid of free-text boxes that RENAME the sheet's
        headings. It was sitting wide open, so the loudest thing on the page
        was a row of inputs nobody touches once a year. */}
    <SettingsDrawer title="WORDING" note="Rename the sheet's own titles and headings.">
    <section className="down-settings-group"><div className="down-wording-grid">{(Object.keys(DOWN_SHEET_LABEL_NAMES) as (keyof DownSheetLabels)[]).map(key=><label key={key}>{DOWN_SHEET_LABEL_NAMES[key]}<input value={display.labels[key]} onChange={event=>setLabel(key,event.target.value)}/></label>)}</div></section>
    </SettingsDrawer>
    <SettingsDrawer title="TEXT STYLE" note="Colour and size for each kind of text on the sheet.">
    <section className="down-settings-group"><div className="down-style-grid">{(Object.keys(DOWN_SHEET_STYLE_LABELS) as DownSheetStyleKey[]).map(key=><div key={key}><b>{DOWN_SHEET_STYLE_LABELS[key]}</b><label>COLOR<input type="color" value={display.styles[key].color} onChange={event=>setStyle(key,"color",event.target.value)}/></label><label>SIZE<input type="number" min="7" max="32" value={display.styles[key].fontSize} onChange={event=>setStyle(key,"fontSize",event.target.value)}/></label></div>)}</div><button type="button" className="reset-down-text" onClick={()=>setDisplay(normalizeDownSheetDisplay(DEFAULT_DOWN_SHEET_DISPLAY))}>RESET TEXT</button></section>
    </SettingsDrawer>
    <SettingsDrawer title="MOVE THE SHEET BETWEEN DEVICES" note="Send this sheet to another phone or the shop computer.">
    <section className="down-settings-group">{transfer}</section>
    <div className="settings-capacity"><b>98</b><span>Maximum entries on this device</span></div>
    <p>Records live on this device. Use the transfer above to send the sheet to another one; a shared backend is still to come.</p>
    </SettingsDrawer>
    </SettingsDrawers>
   </div>
   <div className="repair-editor-actions">{!inline&&<button className="save-repair" type="button" onClick={onClose}>DONE</button>}</div>
  </section>
 </>;
 return inline?panel:<div className="down-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>{panel}</div>;
}