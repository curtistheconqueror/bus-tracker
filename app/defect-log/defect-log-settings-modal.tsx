"use client";

import type {ReactNode} from "react";
import {safeBorderColor,DEFAULT_DEFECT_LOG_DISPLAY,DEFECT_LOG_LABEL_NAMES,DEFECT_LOG_STYLE_LABELS,followsTheme,normalizeDefectLogDisplay,type DefectLogLabels,type DefectLogStyleKey} from "./defect-log-display-settings";
import {REPORT_EXPORT_HINT} from "../fleet-backup";
import {FLEET_BACKUP_INTERVAL_CHOICES,normalizeFleetBackupInterval} from "../storage";
import {COLOR_FIELDS,type Filter,LOG_THEMES,type LogAppearance,type LogFontFamily,type LogFontSize,type LogGroupContrast,type LogSettings,type LogTheme,VIEW_SCOPES,normalizeViewScope} from "./defect-log-settings";
import {SettingsDrawer,SettingsDrawers} from "../settings/settings-drawer";

/* The Defect Log's settings panel.

   It used to open as a modal over the Defect Log and now also renders INLINE
   on the shared Settings page - same panel, no shade, no close button, and
   changes save as they are made. exportLog is optional because the report
   export is still being re-homed; a caller that cannot build it simply does
   not get the button. */
/* Named and described once, so the three selects cannot drift apart in
   wording. The blurbs say what CHANGES, not what it is for: somebody reading
   this on a phone in a garage wants to know what will look different. */
const VIEW_OPTIONS:{key:"busRail"|"busBlueOnly"|"busEndMarker";title:string;blurb:string}[]=[
 {key:"busRail",title:"BUS NUMBER DOWN THE SIDE",blurb:"Turns the bus number on its side in a full-height stripe, so you can see where one bus ends and the next begins. The repair line on the closed card gains about 26px; an opened card gets a little taller, and the location moves to its own line. The defects keep their own rows beside the stripe, never under it."},
 {key:"busBlueOnly",title:"BLUE MEANS THE BUS",blurb:"Leaves the strong blue to the bus number alone. The repair headings, the FOCUS and VIEW buttons and the numbered disc on each defect row all drop to a darker, quieter tone. Nothing gets smaller, and the BUS heading over an opened list keeps its own. If you have set your own Repair Title color under TEXT STYLE, that choice still wins."},
 {key:"busEndMarker",title:"CLOSING LINE UNDER EACH BUS",blurb:"Adds a quiet END OF BUS 18505 · 3 DEFECTS line under the last defect of an opened bus, so the list cannot read as one long run."},
];

export default function LogSettingsModal({settings,setSettings,close,exportLog,transfer,inline=false}:{settings:LogSettings;setSettings:(settings:LogSettings)=>void;close:()=>void;exportLog?:()=>void;transfer:ReactNode;inline?:boolean}){
 const applyTheme=(theme:Exclude<LogTheme,"custom">)=>setSettings({...settings,theme,appearance:{...LOG_THEMES[theme].appearance}});
 const setColor=(key:keyof LogAppearance,value:string)=>setSettings({...settings,theme:"custom",appearance:{...settings.appearance,[key]:value}});
 const setDisplayLabel=(key:keyof DefectLogLabels,value:string)=>setSettings({...settings,display:{...settings.display,labels:{...settings.display.labels,[key]:value}}});
 const setDisplayStyle=(key:DefectLogStyleKey,field:"color"|"fontSize",value:string)=>setSettings({...settings,display:{...settings.display,styles:{...settings.display.styles,[key]:{...settings.display.styles[key],[field]:field==="fontSize"?Number(value):value}}}});
 const panel=<section className={"log-settings"+(inline?" inline":"")}>
  {/* THE PANEL'S OWN "PAGE NAME / Settings" HEADER IS NOT DRAWN INLINE.
       On the Settings page this sits immediately under a section header that
       already says the same two things, one in 9px caps and one at 26px —
       exactly the doubling Curtis hit: "the different sections have their own
       settings section. This looks confusing as well because the same layout
       is right above." It is kept for the modal path, which has no section
       header above it. */}
   {!inline&&<header className="log-settings-head"><span><small>DEFECT LOG</small><h2>Settings</h2></span><button onClick={close}>x</button></header>}
  <div>
   <SettingsDrawers>
   <SettingsDrawer title="YOU &amp; DEFAULTS" note="Your initials, what the log opens on, and the night-time deferred prompt.">
   <label>YOUR INITIALS OR NAME<input maxLength={12} value={settings.defaultInitials} onChange={event=>setSettings({...settings,defaultInitials:event.target.value.replace(/[^a-z0-9 ]/gi,"").toUpperCase()})}/></label>
   <label className="require-initials"><input type="checkbox" checked={settings.requireInitials} onChange={event=>setSettings({...settings,requireInitials:event.target.checked})}/><span><b>REQUIRE INITIALS ON RECORDED WORK</b><small>A repair cannot be saved as fixed, and a work state cannot be ticked, without a name on it. Leave off to keep both optional.</small></span></label>
   {/* The prompt is the one thing in this app that opens itself over whatever
       you were doing, so it gets a switch. The 🚨 DEFERRED banner is not tied
       to it and stays on either way - turning this off trades an interruption
       for a badge, not for silence. */}
   <label className="require-initials deferred-review-setting"><input type="checkbox" checked={settings.deferredReviewPrompt} onChange={event=>setSettings({...settings,deferredReviewPrompt:event.target.checked})}/><span><b>ASK ABOUT DEFERRED BUSES AT NIGHT</b><small>From 8:30pm on, one prompt per bus still deferred past an hour — keep it deferred until a time you pick, put it on the Down Sheet, or send it back out. Off leaves the 🚨 DEFERRED banner to do the reminding on its own.</small></span></label>
   <label>DEFAULT VIEW<select value={settings.defaultFilter} onChange={event=>setSettings({...settings,defaultFilter:event.target.value as Filter})}><option value="all">All</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="fixed">Fixed Today</option><option value="downsheet">Down Sheet</option></select></label>
   <label className="settings-check"><input type="checkbox" checked={settings.showFixed} onChange={event=>setSettings({...settings,showFixed:event.target.checked})}/><span>SHOW FIXED</span></label>
   </SettingsDrawer>
   <SettingsDrawer title="THEME" note="A complete preset. Shared with Fixed Repairs.">
   <section className="log-settings-group"><div className="log-theme-grid">{Object.entries(LOG_THEMES).map(([key,preset])=><button type="button" className={settings.theme===key?"active":""} onClick={()=>applyTheme(key as Exclude<LogTheme,"custom">)} key={key}><i style={{background:preset.appearance.page,borderColor:preset.appearance.accent}}/><span>{preset.label}</span></button>)}</div>{settings.theme==="custom"&&<small>CUSTOM</small>}</section>
   </SettingsDrawer>
   <SettingsDrawer title="FONT" note="Reading style and size.">
   <section className="log-settings-group"><div className="log-font-grid"><label>STYLE<select value={settings.fontFamily} onChange={event=>setSettings({...settings,fontFamily:event.target.value as LogFontFamily})}><option value="clean">Clean</option><option value="condensed">Condensed</option><option value="classic">Classic</option></select></label><label>SIZE<select value={settings.fontSize} onChange={event=>setSettings({...settings,fontSize:event.target.value as LogFontSize})}><option value="standard">Standard</option><option value="large">Large</option><option value="extra">Extra Large</option></select></label></div></section>
   </SettingsDrawer>
   <SettingsDrawer title="BUS GROUP SEPARATION" note="Telling one bus apart from the next: contrast, outline, and the three view options.">
   <section className="log-settings-group log-group-contrast-setting"><label>CONTRAST<select value={settings.groupContrast} onChange={event=>setSettings({...settings,groupContrast:event.target.value as LogGroupContrast})}><option value="strong">Strong (recommended)</option><option value="standard">Standard</option></select></label><small>Strong adds a clearer outer border, extra space, and an expanded-bus shade without changing defect or status colors.</small><label>OUTLINE COLOR<div className="group-border-row"><input type="color" value={settings.groupBorder||"#9ea6b4"} aria-label="Bus group outline color" onChange={event=>setSettings({...settings,groupBorder:safeBorderColor(event.target.value)})}/><button type="button" onClick={()=>setSettings({...settings,groupBorder:""})} disabled={!settings.groupBorder}>USE THEME COLOR</button><small>Left on the theme color the outline follows whichever theme is set, so it stays readable on the dark ones. Choosing a color here fixes it for every theme on this device.</small></div></label>
   {/* THE THREE WAYS OF TELLING ONE BUS FROM THE NEXT, each off until somebody
       asks for it, and each answering WHERE rather than just whether — see
       ViewScope in defect-log-settings.ts for why the answer is a width and
       never a device. They live in this section because this section is
       already the one named for the problem they solve. */}
   <div className="log-view-options">
    {VIEW_OPTIONS.map(option=><label key={option.key}>{option.title}
     <select value={settings[option.key]} onChange={event=>setSettings({...settings,[option.key]:normalizeViewScope(event.target.value)})}>
      {VIEW_SCOPES.map(scope=><option value={scope.key} key={scope.key}>{scope.label}</option>)}
     </select>
     <small>{option.blurb}</small>
    </label>)}
    <small className="log-view-options-note">All three are off until you pick one, change nothing that is stored, and can be turned back off from here. Phone only follows the window rather than the device, so an iPad in split screen gets it and the same iPad full screen does not.</small>
   </div></section>
   </SettingsDrawer>
   <SettingsDrawer title="COLORS" note="Fine-tune any single colour.">
   <section className="log-settings-group"><div className="log-color-grid">{COLOR_FIELDS.map(([key,label])=><label className="log-color-field" key={key}><span>{label}</span><input type="color" value={settings.appearance[key]} onChange={event=>setColor(key,event.target.value)}/></label>)}</div><button type="button" className="reset-look" onClick={()=>applyTheme("light")}>RESET LOOK</button></section>
   </SettingsDrawer>
   {/* CLOSED BY DEFAULT. Curtis named this one: "the wording section. Where you
       can change the title section name and other things, all of that is open.
       That needs to be collapsed on default." */}
   <SettingsDrawer title="WORDING" note="Rename the log's own titles and headings.">
   <section className="log-settings-group"><div className="log-wording-grid">{(Object.keys(DEFECT_LOG_LABEL_NAMES) as (keyof DefectLogLabels)[]).map(key=><label key={key}>{DEFECT_LOG_LABEL_NAMES[key]}<input value={settings.display.labels[key]} onChange={event=>setDisplayLabel(key,event.target.value)}/></label>)}</div></section>
   </SettingsDrawer>
   <SettingsDrawer title="TEXT STYLE" note="Colour and size per kind of text, and which ones follow the theme.">
   <section className="log-settings-group">
   {/* FOLLOWING THEME is not decoration. A colour left at the shipped value is
       treated as "no choice made" and the theme answers instead — which is what
       stops the dark themes rendering light-theme text — so the swatch beside
       it is showing a colour the screen is NOT using. Saying so is the
       difference between a sensible default and a control that lies. */}
   <p className="log-style-note">A colour still on its shipped value <b>follows the theme</b>, so the dark themes stay readable. Pick any other colour and it is pinned on every theme; RESET TEXT puts it back to following.</p>
   <div className="log-style-grid">{(Object.keys(DEFECT_LOG_STYLE_LABELS) as DefectLogStyleKey[]).map(key=>{const themed=followsTheme(key,settings.display.styles[key].color);return <div key={key}><b>{DEFECT_LOG_STYLE_LABELS[key]}{themed&&<i className="log-style-themed">FOLLOWING THEME</i>}</b><label>COLOR<input type="color" value={settings.display.styles[key].color} onChange={event=>setDisplayStyle(key,"color",event.target.value)}/></label><label>SIZE<input type="number" min="7" max="32" value={settings.display.styles[key].fontSize} onChange={event=>setDisplayStyle(key,"fontSize",event.target.value)}/></label>{!themed&&<button type="button" className="log-style-follow" onClick={()=>setDisplayStyle(key,"color",DEFAULT_DEFECT_LOG_DISPLAY.styles[key].color)}>FOLLOW THEME</button>}</div>})}</div><button type="button" className="reset-look" onClick={()=>setSettings({...settings,display:normalizeDefectLogDisplay(null)})}>RESET TEXT</button></section>
   {/* The reminder used to be fixed at 20, which is either a nag or a stranger
       depending on how busy the shop is. Whoever is living with the banner picks
       the number. */}
   </SettingsDrawer>
   <SettingsDrawer title="RECORDS, BACKUP &amp; TRANSFER" note="The backup reminder, moving the log to another device, and the log report.">
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
   </SettingsDrawer>
   </SettingsDrawers>
  </div>
 </section>;
 return inline?panel:<div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>{panel}</div>;
}
