"use client";

type Shift="1st"|"2nd"|"3rd";

export default function DownSheetSettings({defaultInitials,setDefaultInitials,defaultShift,setDefaultShift,showCompleted,setShowCompleted,onClose}:{defaultInitials:string;setDefaultInitials:(value:string)=>void;defaultShift:Shift;setDefaultShift:(value:Shift)=>void;showCompleted:boolean;setShowCompleted:(value:boolean)=>void;onClose:()=>void}){
 return <div className="down-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="down-settings-modal">
   <div className="repair-editor-head"><span>DOWN SHEET ADMINISTRATION<h2>Basic Settings</h2></span><button type="button" onClick={onClose}>×</button></div>
   <div className="down-settings-body">
    <label>DEFAULT OPERATOR INITIALS<input maxLength={6} autoCapitalize="characters" value={defaultInitials} onChange={event=>setDefaultInitials(event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="Example: JD"/><small>Pre-fills the required initials field. It can still be changed for each update.</small></label>
    <label>DEFAULT SHIFT FOR NEW REPAIRS<select value={defaultShift} onChange={event=>setDefaultShift(event.target.value as Shift)}><option>1st</option><option>2nd</option><option>3rd</option></select><small>The shift can always be changed inside an individual repair entry.</small></label>
    <label className="settings-check"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span>SHOW COMPLETED REPAIRS IN THE MAIN SHEET</span></label>
    <div className="settings-capacity"><b>98</b><span>Maximum down-sheet entries on this device</span></div>
    <p>These basic preferences and down-sheet records currently remain on this device. Shared real-time records will be introduced during the backend phase.</p>
   </div>
   <div className="repair-editor-actions"><button className="save-repair" type="button" onClick={onClose}>DONE</button></div>
  </section>
 </div>;
}
