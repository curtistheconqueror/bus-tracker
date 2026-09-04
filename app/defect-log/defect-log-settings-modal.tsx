"use client";

import type {ReactNode} from "react";
import {safeBorderColor,DEFECT_LOG_LABEL_NAMES,DEFECT_LOG_STYLE_LABELS,normalizeDefectLogDisplay,type DefectLogLabels,type DefectLogStyleKey} from "./defect-log-display-settings";
import {REPORT_EXPORT_HINT} from "../fleet-backup";
import {FLEET_BACKUP_INTERVAL_CHOICES,normalizeFleetBackupInterval} from "../storage";
import {COLOR_FIELDS,type Filter,LOG_THEMES,type LogAppearance,type LogFontFamily,type LogFontSize,type LogGroupContrast,type LogSettings,type LogTheme} from "./defect-log-settings";

/* The Defect Log's settings panel.

   It used to open as a modal over the Defect Log and now also renders INLINE
   on the shared Settings page - same panel, no shade, no close button, and
   changes save as they are made. exportLog is optional because the report
   export is still being re-homed; a caller that cannot build it simply does
   not get the button. */
export default function LogSettingsModal({settings,setSettings,close,exportLog,transfer,inline=false}:{settings:LogSettings;setSettings:(settings:LogSettings)=>void;close:()=>void;exportLog?:()=>void;transfer:ReactNode;inline?:boolean}){
 const applyTheme=(theme:Exclude<LogTheme,"custom">)=>setSettings({...settings,theme,appearance:{...LOG_THEMES[theme].appearance}});
 const setColor=(key:keyof LogAppearance,value:string)=>setSettings({...settings,theme:"custom",appearance:{...settings.appearance,[key]:value}});
 const setDisplayLabel=(key:keyof DefectLogLabels,value:string)=>setSettings({...settings,display:{...settings.display,labels:{...settings.display.labels,[key]:value}}});
 const setDisplayStyle=(key:DefectLogStyleKey,field:"color"|"fontSize",value:string)=>setSettings({...settings,display:{...settings.display,styles:{...settings.display.styles,[key]:{...settings.display.styles[key],[field]:field==="fontSize"?Number(value):value}}}});
 const panel=<section className={"log-settings"+(inline?" inline":"")}>
  <header className="log-settings-head"><span><small>DEFECT LOG</small><h2>Settings</h2></span>{!inline&&<button onClick={close}>x</button>}</header>
  <div>
   <label>YOUR INITIALS OR NAME<input maxLength={12} value={settings.defaultInitials} onChange={event=>setSettings({...settings,defaultInitials:event.target.value.replace(/[^a-z0-9 ]/gi,"").toUpperCase()})}/></label>
   <label className="require-initials"><input type="checkbox" checked={settings.requireInitials} onChange={event=>setSettings({...settings,requireInitials:event.target.checked})}/><span><b>REQUIRE INITIALS ON RECORDED WORK</b><small>A repair cannot be saved as fixed, and a work state cannot be ticked, without a name on it. Leave off to keep both optional.</small></span></label>
   <label>DEFAULT VIEW<select value={settings.defaultFilter} onChange={event=>setSettings({...settings,defaultFilter:event.target.value as Filter})}><option value="all">All</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="fixed">Fixed Today</option><option value="downsheet">Down Sheet</option></select></label>
   <label className="settings-check"><input type="checkbox" checked={settings.showFixed} onChange={event=>setSettings({...settings,showFixed:event.target.checked})}/><span>SHOW FIXED</span></label>
   <section className="log-settings-group"><h3>THEME</h3><div className="log-theme-grid">{Object.entries(LOG_THEMES).map(([key,preset])=><button type="button" className={settings.theme===key?"active":""} onClick={()=>applyTheme(key as Exclude<LogTheme,"custom">)} key={key}><i style={{background:preset.appearance.page,borderColor:preset.appearance.accent}}/><span>{preset.label}</span></button>)}</div>{settings.theme==="custom"&&<small>CUSTOM</small>}</section>
   <section className="log-settings-group"><h3>FONT</h3><div className="log-font-grid"><label>STYLE<select value={settings.fontFamily} onChange={event=>setSettings({...settings,fontFamily:event.target.value as LogFontFamily})}><option value="clean">Clean</option><option value="condensed">Condensed</option><option value="classic">Classic</option></select></label><label>SIZE<select value={settings.fontSize} onChange={event=>setSettings({...settings,fontSize:event.target.value as LogFontSize})}><option value="standard">Standard</option><option value="large">Large</option><option value="extra">Extra Large</option></select></label></div></section>
   <section className="log-settings-group log-group-contrast-setting"><h3>BUS GROUP SEPARATION</h3><label>CONTRAST<select value={settings.groupContrast} onChange={event=>setSettings({...settings,groupContrast:event.target.value as LogGroupContrast})}><option value="strong">Strong (recommended)</option><option value="standard">Standard</option></select></label><small>Strong adds a clearer outer border, extra space, and an expanded-bus shade without changing defect or status colors.</small><label>OUTLINE COLOR<div className="group-border-row"><input type="color" value={settings.groupBorder||"#9ea6b4"} aria-label="Bus group outline color" onChange={event=>setSettings({...settings,groupBorder:safeBorderColor(event.target.value)})}/><button type="button" onClick={()=>setSettings({...settings,groupBorder:""})} disabled={!settings.groupBorder}>USE THEME COLOR</button><small>Left on the theme color the outline follows whichever theme is set, so it stays readable on the dark ones. Choosing a color here fixes it for every theme on this device.</small></div></label></section>
   <section className="log-settings-group"><h3>COLORS</h3><div className="log-color-grid">{COLOR_FIELDS.map(([key,label])=><label className="log-color-field" key={key}><span>{label}</span><input type="color" value={settings.appearance[key]} onChange={event=>setColor(key,event.target.value)}/></label>)}</div><button type="button" className="reset-look" onClick={()=>applyTheme("light")}>RESET LOOK</button></section>
   <section className="log-settings-group"><h3>WORDING</h3><div className="log-wording-grid">{(Object.keys(DEFECT_LOG_LABEL_NAMES) as (keyof DefectLogLabels)[]).map(key=><label key={key}>{DEFECT_LOG_LABEL_NAMES[key]}<input value={settings.display.labels[key]} onChange={event=>setDisplayLabel(key,event.target.value)}/></label>)}</div></section>
   <section className="log-settings-group"><h3>TEXT STYLE</h3><div className="log-style-grid">{(Object.keys(DEFECT_LOG_STYLE_LABELS) as DefectLogStyleKey[]).map(key=><div key={key}><b>{DEFECT_LOG_STYLE_LABELS[key]}</b><label>COLOR<input type="color" value={settings.display.styles[key].color} onChange={event=>setDisplayStyle(key,"color",event.target.value)}/></label><label>SIZE<input type="number" min="7" max="32" value={settings.display.styles[key].fontSize} onChange={event=>setDisplayStyle(key,"fontSize",event.target.value)}/></label></div>)}</div><button type="button" className="reset-look" onClick={()=>setSettings({...settings,display:normalizeDefectLogDisplay(null)})}>RESET TEXT</button></section>
   {/* The reminder used to be fixed at 20, which is either a nag or a stranger
       depending on how busy the shop is. Whoever is living with the banner picks
       the number. */}
   <label className="backup-interval-field">REMIND ME TO BACK UP EVERY
    <select value={settings.backupInterval} onChange={event=>setSettings({...settings,backupInterval:normalizeFleetBackupInterval(event.target.value)})}>
     {FLEET_BACKUP_INTERVAL_CHOICES.map(count=><option value={count} key={count}>{count} new defects</option>)}
    </select>
    <small>Counts Defect Log entries saved since the last full backup. The banner appears on the Defect Log when the count is reached.</small>
   </label>
   {/* Above the report on purpose: sending the log to another device is the
       thing somebody comes in here to do, and the report is the thing they
       press by mistake while looking for it. */}
   {transfer}
   {exportLog&&<button className="export-log" onClick={exportLog} title={REPORT_EXPORT_HINT}>EXPORT LOG REPORT</button>}
   <p>Repair records are included with the board backup because they stay attached to each bus.</p>
  </div>
 </section>;
 return inline?panel:<div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>{panel}</div>;
}
