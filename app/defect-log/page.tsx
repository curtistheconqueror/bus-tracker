"use client";

import {useEffect,useMemo,useState} from "react";
import "./defect-log.css";
import {defaultDefectOperability,defectLabel,isUnresolved,normalizeDefects,REPAIR_OPTIONS,type DefectOperability,type DefectState,type StructuredDefect} from "../repair-catalog";
import {defectLogRecords,hideDefectLogRecords,isDefectLogCleanupCandidate,isPendingDownSheetRecord,saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus,type DefectLogRecord} from "./defect-log-sync";
import {bay12AwarenessBusIds,mysteryBusIds} from "../mystery-buses";
import QuickFilterMenu from "../quick-filter-menu";
import {QUICK_FILTERS,quickFilterBusIds,type QuickFilterKey} from "../quick-filters";

type Filter="all"|"open"|"in-progress"|"fixed"|"downsheet";
type LogDraft={busId:string;defect:StructuredDefect;quickIssue:string;onDownSheet:boolean};
type LogTheme="light"|"dark"|"midnight"|"tactical"|"custom";
type LogFontSize="standard"|"large"|"extra";
type LogFontFamily="clean"|"condensed"|"classic";
type LogAppearance={page:string;surface:string;text:string;muted:string;header:string;headerText:string;accent:string};
type LogSettings={defaultInitials:string;defaultFilter:Filter;showFixed:boolean;theme:LogTheme;fontSize:LogFontSize;fontFamily:LogFontFamily;appearance:LogAppearance};

const FLEET_KEY="pace-board-v1";
const DOWN_KEY="pace-down-sheet-v1";
const SETTINGS_KEY="pace-defect-log-settings-v1";
const BOARD_SETTINGS_KEY="pace-board-settings-v1";
const LIGHT_APPEARANCE:LogAppearance={page:"#e9eef6",surface:"#ffffff",text:"#172b4d",muted:"#60728c",header:"#061d45",headerText:"#ffffff",accent:"#0b64bd"};
const LOG_THEMES:Record<Exclude<LogTheme,"custom">,{label:string;appearance:LogAppearance}>={
 light:{label:"Light",appearance:LIGHT_APPEARANCE},
 dark:{label:"Dark",appearance:{page:"#101318",surface:"#1d222a",text:"#f3f6fa",muted:"#aeb9c8",header:"#06080c",headerText:"#ffffff",accent:"#4d9cff"}},
 midnight:{label:"Midnight",appearance:{page:"#071225",surface:"#10213d",text:"#e4eeff",muted:"#9eb0cb",header:"#020a18",headerText:"#ffffff",accent:"#68a4ff"}},
 tactical:{label:"Tactical",appearance:{page:"#26291f",surface:"#393e30",text:"#f0ecd7",muted:"#b8b49d",header:"#15180f",headerText:"#f4e8b8",accent:"#bca75f"}},
};
const FONT_STACKS:Record<LogFontFamily,string>={clean:"Arial, Helvetica, sans-serif",condensed:"'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",classic:"Georgia, 'Times New Roman', serif"};
const COLOR_FIELDS:[keyof LogAppearance,string][]=[["page","BACKGROUND"],["surface","CARDS"],["text","PRIMARY TEXT"],["muted","SECONDARY TEXT"],["header","HEADER"],["headerText","HEADER TEXT"],["accent","ACCENT"]];
const DEFAULT_SETTINGS:LogSettings={defaultInitials:"",defaultFilter:"all",showFixed:true,theme:"light",fontSize:"standard",fontFamily:"clean",appearance:{...LIGHT_APPEARANCE}};
const STATUS_LABELS:Record<string,string>={service:"In Service",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};
const STATE_LABELS:Record<DefectState,string>={open:"OPEN","in-progress":"IN PROGRESS",deferred:"DEFERRED",completed:"FIXED"};
const CATEGORY_ICONS:Record<string,string>={
 "A/C and HVAC":"\u2744\uFE0F",Engine:"\u25CF","Cooling System":"\u25C8",Transmission:"\u25C6",Suspension:"\u25B2",Steering:"\u25C9",Brakes:"\u25A3",
 "Tires and Wheels":"\u25C9","Battery, Starting and Charging":"\u26A1","Electrical / Multiplex":"\u26A1","Tech Services":"\u25A4",Amerex:"\u25B3",
 "Fuel Delivery":"\u25C7","No Start":"\u25CB","Doors, Ramp and Lift":"\u267F","Lights and Fixtures":"\u2739",Bodywork:"\u25A7","Air System":"\u224B",
 Inspection:"\u2713","Preventive Maintenance":"\u2692","Interior Cleaning":"\u2726",Miscellaneous:"\u2022",
};

function readFleet(raw:string|null):DefectLogFleetBus[]{try{const value=raw?JSON.parse(raw):null,items=Array.isArray(value)?value:value?.buses;return Array.isArray(items)?items.map((bus:DefectLogFleetBus)=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}catch{return []}}
function readDown(raw:string|null):DefectLogDownEntry[]{try{const value=raw?JSON.parse(raw):null,items=Array.isArray(value)?value:value?.entries;return Array.isArray(items)?items:[]}catch{return []}}
function readMysterySlot(raw:string|null){try{const value=JSON.parse(raw||"{}").visuals?.mysterySlot;return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):"#edf3ff"}catch{return "#edf3ff"}}
function readSettings(raw:string|null):LogSettings{try{const saved=JSON.parse(raw||"{}") as Partial<LogSettings>,theme:LogTheme=["light","dark","midnight","tactical","custom"].includes(String(saved.theme))?saved.theme as LogTheme:"light",preset=theme==="custom"?LIGHT_APPEARANCE:LOG_THEMES[theme].appearance,fontSize:LogFontSize=["standard","large","extra"].includes(String(saved.fontSize))?saved.fontSize as LogFontSize:"standard",fontFamily:LogFontFamily=["clean","condensed","classic"].includes(String(saved.fontFamily))?saved.fontFamily as LogFontFamily:"clean";return {...DEFAULT_SETTINGS,...saved,theme,fontSize,fontFamily,appearance:{...preset,...saved.appearance}}}catch{return {...DEFAULT_SETTINGS,appearance:{...LIGHT_APPEARANCE}}}}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Previous record":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date)}
function locationLabel(location:string){
 const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];
 const found=labels.find(([prefix])=>location.startsWith(prefix));return found?found[1]:location||"Location not set";
}
function newDraft():LogDraft{const now=new Date().toISOString();return {busId:"",quickIssue:"",onDownSheet:false,defect:{id:"defect-log-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:"",issue:"",details:"",operability:"service",state:"open",createdAt:now,updatedAt:now,diagnosticNote:"",actionTaken:"",partNumber:"",reportedBy:"",source:"defect-log"}}}
function recordDraft(record:DefectLogRecord):LogDraft{return {busId:record.bus.id,quickIssue:record.defect.issue==="Manual entry"?"":record.defect.issue,onDownSheet:record.onDownSheet,defect:{...record.defect}}}

function DefectEditor({draft,fleet,defaultInitials,save,close}:{draft:LogDraft;fleet:DefectLogFleetBus[];defaultInitials:string;save:(draft:LogDraft)=>void;close:()=>void}){
 const [value,setValue]=useState(draft);
 const updateDefect=<K extends keyof StructuredDefect>(key:K,next:StructuredDefect[K])=>setValue(current=>({...current,defect:{...current.defect,[key]:next}}));
 const repairs=REPAIR_OPTIONS[value.defect.category]||[];
 const selectedBus=fleet.find(bus=>bus.id===value.busId);
 const submit=(event:React.FormEvent)=>{event.preventDefault();const initials=(value.defect.reportedBy||defaultInitials).trim().toUpperCase(),details=value.defect.details.trim(),issue=value.quickIssue||value.defect.issue;if(!selectedBus){alert("Select a bus number.");return}if(!value.defect.category){alert("Select a repair category.");return}if(!issue&&!details){alert("Select a repair or describe the symptom.");return}if(!initials){alert("Enter your initials.");return}const finalIssue=issue&&issue!=="Manual entry"?issue:"Manual entry";save({...value,onDownSheet:value.defect.state==="completed"?false:value.onDownSheet,defect:{...value.defect,issue:finalIssue,details,reportedBy:initials}})};
 return <div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <form className="log-editor" onSubmit={submit}>
   <header><span><small>REAL-TIME DEFECT</small><h2>{selectedBus?"Bus "+selectedBus.n:"Log Repair"}</h2></span><button type="button" onClick={close} aria-label="Close">x</button></header>
   <div className="log-form">
    <label className="wide">BUS<select value={value.busId} onChange={event=>setValue(current=>({...current,busId:event.target.value}))}><option value="">Select bus</option>{[...fleet].sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})).map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n} - {locationLabel(bus.l)}</option>)}</select></label>
    <label>CATEGORY<select value={value.defect.category} onChange={event=>setValue(current=>({...current,quickIssue:"",defect:{...current.defect,category:event.target.value,issue:"",operability:"service"}}))}><option value="">Select category</option>{Object.keys(REPAIR_OPTIONS).map(category=><option key={category}>{category}</option>)}</select></label>
    <label>QUICK SELECT<select value={value.quickIssue} disabled={!value.defect.category} onChange={event=>{const issue=event.target.value;setValue(current=>({...current,quickIssue:issue,defect:{...current.defect,issue,operability:defaultDefectOperability(current.defect.category,issue)}}))}}><option value="">{value.defect.category?"Type the symptom below":"Select category first"}</option>{repairs.map(repair=><option key={repair}>{repair}</option>)}</select></label>
    {value.defect.category==="Preventive Maintenance"&&value.quickIssue==="Add engine oil"&&<><label>QUANTITY<input type="number" min="0.5" step="0.5" inputMode="decimal" value={value.defect.quantity||""} onChange={event=>updateDefect("quantity",event.target.value?Number(event.target.value):undefined)}/></label><label>UNIT<select value={value.defect.unit||"quarts"} onChange={event=>updateDefect("unit",event.target.value)}><option value="quarts">Quarts</option><option value="gallons">Gallons</option><option value="liters">Liters</option></select></label></>}
    <label className="wide">DESCRIPTION<textarea value={value.defect.details} onChange={event=>updateDefect("details",event.target.value)} placeholder="What was reported, observed, or repaired?"/></label>
    <label>WORK STATUS<select value={value.defect.state} onChange={event=>updateDefect("state",event.target.value as DefectState)}><option value="open">Open</option><option value="in-progress">In Progress</option><option value="deferred">Deferred</option><option value="completed">Fixed</option></select></label>
    <label>BUS AVAILABILITY<select value={value.defect.operability} onChange={event=>updateDefect("operability",event.target.value as DefectOperability)}><option value="service">May Stay In Service</option><option value="down">Remove From Service</option></select></label>
    <label className="wide downsheet-check"><input type="checkbox" checked={value.onDownSheet} disabled={value.defect.state==="completed"} onChange={event=>setValue(current=>({...current,onDownSheet:event.target.checked}))}/><span><b>DOWN SHEET</b><small>Escalate this repair without changing the bus location.</small></span></label>
    <label>DIAGNOSTIC NOTE<textarea value={value.defect.diagnosticNote||""} onChange={event=>updateDefect("diagnosticNote",event.target.value)} placeholder="Tests, codes, or findings"/></label>
    <label>ACTION TAKEN<textarea value={value.defect.actionTaken||""} onChange={event=>updateDefect("actionTaken",event.target.value)} placeholder="Repair, adjustment, or temporary action"/></label>
    <label>PART NUMBER<input value={value.defect.partNumber||""} onChange={event=>updateDefect("partNumber",event.target.value)} placeholder="Optional"/></label>
    <label>INITIALS<input required maxLength={6} autoCapitalize="characters" value={value.defect.reportedBy||defaultInitials} onChange={event=>updateDefect("reportedBy",event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="Required"/></label>
   </div>
   <footer><button type="button" onClick={close}>CANCEL</button><button className="save-log">{draft.defect.createdAt===draft.defect.updatedAt?"SAVE DEFECT":"SAVE UPDATE"}</button></footer>
  </form>
 </div>;
}

function LogSettingsModal({settings,setSettings,close,exportLog}:{settings:LogSettings;setSettings:(settings:LogSettings)=>void;close:()=>void;exportLog:()=>void}){
 const applyTheme=(theme:Exclude<LogTheme,"custom">)=>setSettings({...settings,theme,appearance:{...LOG_THEMES[theme].appearance}});
 const setColor=(key:keyof LogAppearance,value:string)=>setSettings({...settings,theme:"custom",appearance:{...settings.appearance,[key]:value}});
 return <div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><section className="log-settings">
  <header><span><small>DEFECT LOG</small><h2>Settings</h2></span><button onClick={close}>x</button></header>
  <div>
   <label>INITIALS<input maxLength={6} value={settings.defaultInitials} onChange={event=>setSettings({...settings,defaultInitials:event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase()})}/></label>
   <label>DEFAULT VIEW<select value={settings.defaultFilter} onChange={event=>setSettings({...settings,defaultFilter:event.target.value as Filter})}><option value="all">All</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="fixed">Fixed Today</option><option value="downsheet">Down Sheet</option></select></label>
   <label className="settings-check"><input type="checkbox" checked={settings.showFixed} onChange={event=>setSettings({...settings,showFixed:event.target.checked})}/><span>SHOW FIXED</span></label>
   <section className="log-settings-group"><h3>THEME</h3><div className="log-theme-grid">{Object.entries(LOG_THEMES).map(([key,preset])=><button type="button" className={settings.theme===key?"active":""} onClick={()=>applyTheme(key as Exclude<LogTheme,"custom">)} key={key}><i style={{background:preset.appearance.page,borderColor:preset.appearance.accent}}/><span>{preset.label}</span></button>)}</div>{settings.theme==="custom"&&<small>CUSTOM</small>}</section>
   <section className="log-settings-group"><h3>FONT</h3><div className="log-font-grid"><label>STYLE<select value={settings.fontFamily} onChange={event=>setSettings({...settings,fontFamily:event.target.value as LogFontFamily})}><option value="clean">Clean</option><option value="condensed">Condensed</option><option value="classic">Classic</option></select></label><label>SIZE<select value={settings.fontSize} onChange={event=>setSettings({...settings,fontSize:event.target.value as LogFontSize})}><option value="standard">Standard</option><option value="large">Large</option><option value="extra">Extra Large</option></select></label></div></section>
   <section className="log-settings-group"><h3>COLORS</h3><div className="log-color-grid">{COLOR_FIELDS.map(([key,label])=><label className="log-color-field" key={key}><span>{label}</span><input type="color" value={settings.appearance[key]} onChange={event=>setColor(key,event.target.value)}/></label>)}</div><button type="button" className="reset-look" onClick={()=>applyTheme("light")}>RESET LOOK</button></section>
   <button className="export-log" onClick={exportLog}>EXPORT LOG</button>
   <p>Repair records are included with the board backup because they stay attached to each bus.</p>
  </div>
 </section></div>;
}

export default function DefectLog(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]);
 const [downEntries,setDownEntries]=useState<DefectLogDownEntry[]>([]);
 const [settings,setSettings]=useState<LogSettings>(DEFAULT_SETTINGS);
 const [filter,setFilter]=useState<Filter>("all");
 const [search,setSearch]=useState("");
 const [quickFilter,setQuickFilter]=useState<QuickFilterKey|null>(null);
 const [editing,setEditing]=useState<LogDraft|null>(null);
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [mysterySlot,setMysterySlot]=useState("#edf3ff");
 const [hydrated,setHydrated]=useState(false);

 useEffect(()=>{const nextFleet=readFleet(localStorage.getItem(FLEET_KEY)),nextDown=readDown(localStorage.getItem(DOWN_KEY)),nextSettings=readSettings(localStorage.getItem(SETTINGS_KEY));setFleet(nextFleet);setDownEntries(nextDown);setSettings(nextSettings);setMysterySlot(readMysterySlot(localStorage.getItem(BOARD_SETTINGS_KEY)));setFilter(nextSettings.defaultFilter);setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))},[settings,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue));if(event.key===DOWN_KEY)setDownEntries(readDown(event.newValue));if(event.key===BOARD_SETTINGS_KEY)setMysterySlot(readMysterySlot(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const allRecords=useMemo(()=>defectLogRecords(fleet,downEntries),[fleet,downEntries]);
 const records=useMemo(()=>allRecords.filter(record=>!record.defect.defectLogHiddenAt),[allRecords]);
 const activeDownBusIds=useMemo(()=>downEntries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId),[downEntries]);
 const activeDownBusIdSet=useMemo(()=>new Set(activeDownBusIds),[activeDownBusIds]);
 const mysteryIdSet=useMemo(()=>new Set(mysteryBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const awarenessIdSet=useMemo(()=>new Set(bay12AwarenessBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const mysteryBuses=useMemo(()=>fleet.filter(bus=>mysteryIdSet.has(bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})),[fleet,mysteryIdSet]);
 const active=records.filter(record=>isUnresolved(record.defect));
 const visible=records.filter(record=>{
  if(!settings.showFixed&&record.defect.state==="completed")return false;
  if(filter==="open"&&!(record.defect.state==="open"||record.defect.state==="deferred"))return false;
  if(filter==="in-progress"&&record.defect.state!=="in-progress")return false;
  if(filter==="fixed"&&!(record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)))return false;
  if(filter==="downsheet"&&!record.onDownSheet)return false;
  const query=search.trim().toLowerCase();if(!query)return true;
  return [record.bus.n,record.defect.category,record.defect.issue,record.defect.details,record.defect.diagnosticNote,record.defect.actionTaken].some(value=>String(value||"").toLowerCase().includes(query));
 });
 const quickFilterCounts=Object.fromEntries(QUICK_FILTERS.map(item=>[item.key,quickFilterBusIds(fleet,item.key).length])) as Record<QuickFilterKey,number>,quickFilterIds=quickFilter?new Set(quickFilterBusIds(fleet,quickFilter)):new Set<string>(),quickFilterBuses=quickFilter?fleet.filter(bus=>quickFilterIds.has(bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})):[],quickFilterLabel=QUICK_FILTERS.find(item=>item.key===quickFilter)?.label||"Quick Filter";
 const stats={active:active.length,progress:active.filter(record=>record.defect.state==="in-progress").length,downing:active.filter(record=>record.defect.operability==="down").length,fixedToday:records.filter(record=>record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)).length,buses:new Set(active.map(record=>record.bus.id)).size};

 const persist=(nextFleet:DefectLogFleetBus[],nextDown:DefectLogDownEntry[])=>{setFleet(nextFleet);setDownEntries(nextDown);localStorage.setItem(FLEET_KEY,JSON.stringify({version:4,buses:nextFleet}));localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries:nextDown}))};
 const saveDraft=(draft:LogDraft)=>{const result=saveDefectLogRecord(fleet,downEntries,draft.busId,draft.defect,draft.onDownSheet);if(result.error){alert("That bus is no longer available. Refresh and try again.");return}persist(result.fleet,result.downEntries);setEditing(null)};
 const markFixed=(record:DefectLogRecord)=>{if(!settings.defaultInitials){setEditing(recordDraft(record));alert("Enter your initials before marking this repair fixed.");return}saveDraft({...recordDraft(record),onDownSheet:false,defect:{...record.defect,state:"completed",reportedBy:settings.defaultInitials,actionTaken:record.defect.actionTaken||"Repair completed"}})};
 const openMysteryBus=(bus:DefectLogFleetBus)=>{const record=records.find(item=>item.bus.id===bus.id&&isUnresolved(item.defect));setEditing(record?recordDraft(record):{...newDraft(),busId:bus.id})};
 const removeFromLog=(record:DefectLogRecord)=>{if(!confirm("Remove this repair from the Defect Log only? Bus status, location, defects, and Down Sheet records will stay unchanged."))return;persist(hideDefectLogRecords(fleet,[record.defect.id]),downEntries)};
 const cleanUpLog=()=>{const cleanable=records.filter(record=>isDefectLogCleanupCandidate(record,activeDownBusIdSet));if(!cleanable.length){alert("Nothing is ready for cleanup. Active repairs that started in this log stay until that repair is fixed.");return}if(!confirm("Clean up "+cleanable.length+" fixed, out-of-service, or Down Sheet record"+(cleanable.length===1?"":"s")+"? Repair data and every bus status will stay unchanged."))return;persist(hideDefectLogRecords(fleet,cleanable.map(record=>record.defect.id)),downEntries)};
 const exportLog=()=>{const payload={kind:"fleet-real-time-defect-log",version:1,exportedAt:new Date().toISOString(),records:allRecords.map(record=>({busNumber:record.bus.n,busStatus:record.bus.s,location:locationLabel(record.bus.l),...record.defect,onDownSheet:record.onDownSheet}))},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="fleet-defect-log-"+new Date().toISOString().slice(0,10)+".json";link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const appStyle={"--log-page":settings.appearance.page,"--log-surface":settings.appearance.surface,"--log-text":settings.appearance.text,"--log-muted":settings.appearance.muted,"--log-header":settings.appearance.header,"--log-header-text":settings.appearance.headerText,"--log-accent":settings.appearance.accent,"--mystery-slot":mysterySlot,"--log-font":FONT_STACKS[settings.fontFamily]} as React.CSSProperties;

 return <main className="defect-log-app" style={appStyle} data-font-size={settings.fontSize}>
  <header className="log-header">
   <div><span>FLEET MAINTENANCE</span><h1>Real-Time Defect Log</h1><p>Repairs, findings, and follow-up as they happen</p></div>
   <nav aria-label="Tracker pages"><a href="/">FACILITY MAP</a><a href="/down-sheet">DOWN SHEET</a><a className="active" href="/defect-log" aria-current="page">DEFECT LOG</a></nav>
  </header>
  <section className="log-summary" aria-label="Defect log summary">
   <div className="primary"><strong>{stats.active}</strong><span>ACTIVE DEFECTS</span></div><div><strong>{stats.buses}</strong><span>BUSES AFFECTED</span></div><div><strong>{stats.progress}</strong><span>IN PROGRESS</span></div><div className="downing"><strong>{stats.downing}</strong><span>DOWNING</span></div><div className="fixed"><strong>{stats.fixedToday}</strong><span>FIXED TODAY</span></div>
  </section>
  <section className="log-controls">
   <div className="log-filters">{([["all","ALL"],["open","OPEN"],["in-progress","IN PROGRESS"],["fixed","FIXED TODAY"],["downsheet","DOWN SHEET"]] as [Filter,string][]).map(([value,label])=><button className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(value)} key={value}>{label}</button>)}</div>
   <QuickFilterMenu active={quickFilter} counts={quickFilterCounts} onSelect={setQuickFilter}/><label className="log-search"><span>FIND</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus, repair, code, or note"/></label>
   <button className="log-settings-button" onClick={()=>setSettingsOpen(true)} aria-label="Open defect log settings">&#9881;</button>
  </section>
  {quickFilter&&<aside className="quick-filter-drawer" aria-label={quickFilterLabel+" buses"}><header><span><small>QUICK FILTER</small><b>{quickFilterLabel}</b></span><strong>{quickFilterBuses.length}</strong><button onClick={()=>setQuickFilter(null)} aria-label="Close quick filter">×</button></header><div>{quickFilterBuses.length?quickFilterBuses.map(bus=>{const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isUnresolved),preview=defects.length?defects.slice(0,2).map(defectLabel).join("; "):"Tracker warning flag";return <button className="quick-filter-bus" onClick={()=>openMysteryBus(bus)} key={bus.id}><span><small>BUS</small><b>{bus.n}</b></span><span><strong>{locationLabel(bus.l)}</strong><small>{preview}</small></span><i>{STATUS_LABELS[bus.s]||bus.s}</i></button>}):<p>No buses currently match this filter.</p>}</div></aside>}
  <section className="mystery-board" aria-label="Mystery buses">
   <header><span><b>MYSTERY BUSES</b><small>SHOP, CNG &amp; BAYS 11–12 NOT ON DOWN SHEET</small></span><strong>{mysteryBuses.length}</strong></header>
   {mysteryBuses.length?<div className="mystery-list">{mysteryBuses.map(bus=>{const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isUnresolved),inLog=defects.some(defect=>defect.source==="defect-log"),onDownSheet=activeDownBusIds.includes(bus.id),preview=defects.length?defects.slice(0,2).map(defectLabel).join("; ")+(defects.length>2?" +"+(defects.length-2)+" more":""):"No known defects logged";return <button className={"mystery-card"+(awarenessIdSet.has(bus.id)?" bay12-awareness":"")} onClick={()=>openMysteryBus(bus)} key={bus.id}>
    <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span>
    <span className="mystery-detail"><b>{locationLabel(bus.l)}</b><small>{preview}</small></span>
    <span className="mystery-badges">{bus.s==="unknown"&&<i>UNKNOWN</i>}{awarenessIdSet.has(bus.id)&&<i>BAY 12</i>}{!onDownSheet&&<i>NOT ON DOWN SHEET</i>}{inLog&&<i>DEFECT LOG</i>}<small>{STATUS_LABELS[bus.s]||bus.s}</small></span>
   </button>})}</div>:<div className="mystery-empty"><b>Nothing unaccounted for.</b><span>Eligible shop, CNG, and Bays 11–12 match the active Down Sheet.</span></div>}
  </section>
  <section className="log-feed">
   <div className="feed-title"><div className="feed-actions"><button onClick={()=>setEditing(newDraft())}>+ LOG DEFECT</button><button className="cleanup-log" onClick={cleanUpLog}>CLEAN UP</button></div><span><b>LIVE REPAIR FEED</b><small>{visible.length} RECORD{visible.length===1?"":"S"} IN VIEW</small></span></div>
   {visible.length?<div className="log-list">{visible.map(record=>{const pendingDownSheet=isPendingDownSheetRecord(record,activeDownBusIdSet),busOnDownSheet=activeDownBusIdSet.has(record.bus.id);return <article className={"log-card "+record.defect.state+(record.defect.operability==="down"?" downing":"")+(pendingDownSheet?" pending-down-sheet":"")} key={record.bus.id+"-"+record.defect.id}>
    <button className="log-card-main" onClick={()=>setEditing(recordDraft(record))}>
     <span className="log-icon" aria-hidden="true">{CATEGORY_ICONS[record.defect.category]||CATEGORY_ICONS.Miscellaneous}</span>
     <span className="log-bus"><small>BUS</small><strong>{record.bus.n}</strong><em>{locationLabel(record.bus.l)}</em></span>
     <span className="log-repair"><b>{record.defect.category}</b><strong>{defectLabel(record.defect)}</strong>{record.defect.diagnosticNote&&<small><b>DIAG:</b> {record.defect.diagnosticNote}</small>}{record.defect.actionTaken&&<small><b>ACTION:</b> {record.defect.actionTaken}</small>}{record.defect.partNumber&&<small><b>PART:</b> {record.defect.partNumber}</small>}</span>
     <span className="log-meta"><b className={"state "+record.defect.state}>{STATE_LABELS[record.defect.state]}</b>{record.defect.state==="completed"&&record.defect.reportedBy&&<em className="fixed-by">{record.defect.reportedBy}</em>}{(record.onDownSheet||busOnDownSheet)&&<b className="downsheet-badge">DOWN SHEET</b>}{pendingDownSheet&&<b className="pending-downsheet-badge">PENDING DOWN SHEET</b>}<small>{STATUS_LABELS[record.bus.s]||record.bus.s}</small><time>{timeLabel(record.updatedAt)}</time>{record.defect.state!=="completed"&&record.defect.reportedBy&&<em>{record.defect.reportedBy}</em>}</span>
    </button>
    <div className="log-actions">{record.defect.state!=="completed"&&<button className="quick-fix" onClick={()=>markFixed(record)} aria-label={"Mark bus "+record.bus.n+" repair fixed"}><span aria-hidden="true">&#10003;</span><b>MARK FIXED</b></button>}<button className="remove-log" onClick={()=>removeFromLog(record)} aria-label={"Remove bus "+record.bus.n+" repair from Defect Log only"}><span aria-hidden="true">×</span><b>REMOVE</b></button></div>
   </article>})}</div>:<div className="empty-log"><b>No repairs match this view.</b><span>Use Log Defect to record the next bus finding.</span></div>}
  </section>
  <footer className="mobile-log-bar"><a className="operator-link" href="/?operator=1"><span>&#10022;</span> AI OPERATOR</a></footer>
  {editing&&<DefectEditor draft={editing} fleet={fleet} defaultInitials={settings.defaultInitials} save={saveDraft} close={()=>setEditing(null)}/>}
  {settingsOpen&&<LogSettingsModal settings={settings} setSettings={setSettings} close={()=>setSettingsOpen(false)} exportLog={exportLog}/>}
 </main>;
}
