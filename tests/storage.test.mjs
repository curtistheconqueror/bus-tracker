/* LocalStorage envelopes, backups and section transfers. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { DOWN_SHEET_STORAGE_KEY, DOWN_SHEET_STORAGE_VERSION, FLEET_BACKUP_INTERVAL, FLEET_BACKUP_INTERVAL_CHOICES, FLEET_BACKUP_REMINDER_STORAGE_KEY, FLEET_RECOVERY_STORAGE_KEY, FLEET_STORAGE_KEY, FLEET_STORAGE_VERSION, TRANSFER_KINDS, exportDefectLogPayload, exportDownSheetPayload, exportFleetMapPayload, fleetBackupDue, fleetDefectCount, fleetDefectLogCount, markFleetBackupExported, mergeDefectLog, mergeDownSheet, mergeFleetMap, normalizeFleetBackupInterval, readDownSheetPayload, readFleetPayload, readFleetRecoverySnapshot, readTransferPayload, reconcileDS, serializeDownSheetPayload, serializeFleetPayload, transferFilename, writeDownSheetStorage, writeFleetStorage } from "./helpers/modules.mjs";
import { memoryStorage, render } from "./helpers/setup.mjs";

test("shared storage reads legacy payloads and preserves future metadata",()=>{
 const legacy=readFleetPayload(JSON.stringify([{id:"bus-1",n:"1",futureBusField:{source:"inspection"}}]));
 assert.equal(legacy.valid,true);
 assert.equal(legacy.legacy,true);
 assert.equal(legacy.version,0);
 assert.deepEqual(legacy.buses[0].futureBusField,{source:"inspection"});

 const serialized=serializeFleetPayload(legacy.buses,{syncRevision:7,deviceClock:"phone",version:2,buses:[]});
 const current=readFleetPayload(serialized);
 assert.equal(current.version,FLEET_STORAGE_VERSION);
 assert.equal(current.envelope.syncRevision,7);
 assert.equal(current.envelope.deviceClock,"phone");
 assert.deepEqual(current.buses[0].futureBusField,{source:"inspection"});

 const down=readDownSheetPayload(JSON.stringify([{id:"entry-1",futurePartField:{partNumber:"HORN-1"}}]));
 assert.equal(down.legacy,true);
 const downCurrent=readDownSheetPayload(serializeDownSheetPayload(down.entries,{syncRevision:9}));
 assert.equal(downCurrent.version,DOWN_SHEET_STORAGE_VERSION);
 assert.equal(downCurrent.envelope.syncRevision,9);
 assert.deepEqual(downCurrent.entries[0].futurePartField,{partNumber:"HORN-1"});
});

test("shared storage refuses malformed or newer payloads without overwriting them",()=>{
 const malformed=memoryStorage({[FLEET_STORAGE_KEY]:"{broken"});
 assert.equal(writeFleetStorage(malformed,[{id:"bus-1"}]),false);
 assert.equal(malformed.value(FLEET_STORAGE_KEY),"{broken");

 const newerRaw=JSON.stringify({version:FLEET_STORAGE_VERSION+1,buses:[{id:"future"}],syncRevision:11});
 const newer=memoryStorage({[FLEET_STORAGE_KEY]:newerRaw});
 assert.equal(readFleetPayload(newerRaw).supported,false);
 assert.equal(writeFleetStorage(newer,[{id:"older-app"}]),false);
 assert.equal(newer.value(FLEET_STORAGE_KEY),newerRaw);

 const legacy=memoryStorage({[FLEET_STORAGE_KEY]:JSON.stringify([{id:"legacy"}])});
 assert.equal(writeFleetStorage(legacy,[{id:"legacy",kept:true}]),true);
 assert.deepEqual(readFleetPayload(legacy.value(FLEET_STORAGE_KEY)).buses,[{id:"legacy",kept:true}]);

 const downMalformed=memoryStorage({[DOWN_SHEET_STORAGE_KEY]:"not-json"});
 assert.equal(writeDownSheetStorage(downMalformed,[{id:"entry"}]),false);
 assert.equal(downMalformed.value(DOWN_SHEET_STORAGE_KEY),"not-json");
});

test("fleet writes keep a last-known-good copy and block accidental bulk defect loss",()=>{
 const defects=Array.from({length:6},(_,index)=>({id:"defect-"+index,source:"defect-log",state:"open"}));
 const original=[{id:"bus-1",n:"17501",defects}];
 const raw=serializeFleetPayload(original,{syncRevision:14});
 const storage=memoryStorage({[FLEET_STORAGE_KEY]:raw});

 assert.equal(fleetDefectCount(original),6);
 assert.equal(fleetDefectLogCount(original),6);
 assert.equal(writeFleetStorage(storage,[{...original[0],defects:[]}]),false);
 assert.equal(writeFleetStorage(storage,[]),false);
 assert.equal(storage.value(FLEET_STORAGE_KEY),raw);

 const recovery=readFleetRecoverySnapshot(storage.value(FLEET_RECOVERY_STORAGE_KEY));
 assert.equal(recovery?.defectCount,6);
 assert.equal(recovery?.busCount,1);
 assert.equal(readFleetPayload(recovery?.raw||null).envelope.syncRevision,14);

 assert.equal(writeFleetStorage(storage,[{...original[0],defects:[]}],{allowBulkDefectLoss:true}),true);
 assert.equal(readFleetPayload(storage.value(FLEET_STORAGE_KEY)).buses[0].defects.length,0);
 assert.equal(writeFleetStorage(storage,original,{allowBulkDefectLoss:true,skipRecoverySnapshot:true}),true);
 assert.equal(readFleetPayload(storage.value(FLEET_STORAGE_KEY)).buses[0].defects.length,6);
});

test("successful ordinary writes snapshot the previous board and backup reminders recur every 20 new logs",()=>{
 const original=[{id:"bus-1",n:"17501",l:"road-1",defects:[{id:"a",source:"defect-log"},{id:"b",source:"tracker"}]}];
 const storage=memoryStorage({[FLEET_STORAGE_KEY]:serializeFleetPayload(original)});
 assert.equal(writeFleetStorage(storage,[{...original[0],l:"garage-1"}]),true);
 const recovery=readFleetRecoverySnapshot(storage.value(FLEET_RECOVERY_STORAGE_KEY));
 assert.equal(readFleetPayload(recovery?.raw||null).buses[0].l,"road-1");

 const logs=count=>[{id:"bus-1",defects:Array.from({length:count},(_,index)=>({id:"log-"+index,source:"defect-log"}))}];
 assert.equal(fleetBackupDue(storage,logs(19)).due,false);
 assert.equal(fleetBackupDue(storage,logs(20)).due,true);
 assert.equal(markFleetBackupExported(storage,logs(20),"2026-08-26T12:00:00.000Z"),true);
 assert.equal(JSON.parse(storage.value(FLEET_BACKUP_REMINDER_STORAGE_KEY)).lastExportedDefectLogCount,20);
 assert.equal(fleetBackupDue(storage,logs(39)).due,false);
 assert.equal(fleetBackupDue(storage,logs(40)).due,true);
});

test("phone safety controls expose full-board export reminders and recovery",async()=>{
 const [tracker,recovery,defect,reminder,backup,settings,alert,storage]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/fleet-recovery-control.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/offline-backup-reminder.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/shared/save-alert.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/storage/storage.ts",import.meta.url),"utf8"),
 ]);
 /* RESTORE LAST GOOD COPY moved off the map to sit beside MASTER IMPORT: both
    answer "this device is wrong, put it right", and splitting them left the
    save-failure notice pointing at a Settings page that did not have it. */
 assert.match(settings,/<FleetRecoveryControl\/>/,"recovery lives with the other whole-device work");
 assert.equal(/FleetRecoveryControl/.test(tracker),false,"and no longer on the map");
 assert.match(recovery,/RESTORE LAST GOOD COPY/);
 /* Every notice that sends somebody to recover must name where it actually is. */
 assert.match(alert,/restore the last-known-good copy from Settings/);
 assert.match(storage,/use MASTER EXPORT or RESTORE LAST GOOD COPY in Settings/);
 assert.match(settings,/RESTORE LAST GOOD COPY<\/h3>/,"and Settings really carries that heading");
 assert.match(defect,/OfflineBackupReminder buses=\{fleet\}/);
 assert.match(reminder,/OFFLINE BACKUP DUE/);
 /* One action, one name: the reminder writes the same file MASTER EXPORT does. */
 assert.match(reminder,/>MASTER EXPORT</);
 assert.equal(/EXPORT FULL BACKUP/.test(reminder),false,"two labels for one action is how you end up with two backups and no idea which restores");
 assert.match(backup,/pace-south-fleet-board-backup/);
 assert.match(backup,/DOWN_SHEET_STORAGE_KEY/);
 assert.match(backup,/DEFECT_LOG_SETTINGS_STORAGE_KEY/);
 assert.doesNotMatch(tracker,/setItem\("pace-board-v1"/);
});

test("every setting in the app lives on one page, behind the gear in the nav",async()=>{
 const read=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
 const [page,css,mapPage,logPage,logCss,downPage,fixedPage,layout]=await Promise.all([
  read("app/settings/page.tsx"),read("app/settings/settings.css"),read("app/page.tsx"),
  read("app/defect-log/page.tsx"),read("app/defect-log/defect-log.css"),read("app/down-sheet/page.tsx"),
  read("app/fixed-repairs/page.tsx"),read("app/layout.tsx"),
 ]);

 /* The shell. Every page's stylesheet loads, and this page's loads last, so
    the last word on html, body, header and nav is this page's. */
 assert.match(page,/<TrackerNav active="\/settings"\/>/);
 const stylesheets=['"../defect-log/defect-log.css"','"../down-sheet/down-sheet.css"','"../fixed-repairs/fixed-repairs.css"','"./settings.css"'];
 const positions=stylesheets.map(file=>page.indexOf("import "+file));
 assert.ok(positions.every(index=>index>=0),"every page stylesheet is imported");
 assert.deepEqual([...positions].sort((left,right)=>left-right),positions,"settings.css is imported last");
 assert.match(layout,/import "\.\/globals\.css"/,"globals.css still comes first, from the layout");
 assert.match(css,/^html,body\{/m,"the page shell is restated after three stylesheets that each set it");
 assert.match(css,/\.settings-header nav\{[^}]*grid-template-columns:repeat\(6/,"six links, one row on a desktop");
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.settings-header nav\{[^}]*grid-template-columns:repeat\(3/,"six links, two full rows on a phone");

 /* One section per page, each rendering that page's OWN panel inline - the
    component the gear used to open, not a copy of it. */
 assert.match(page,/<MapSettingsPanel buses=\{fleet\} board=\{board\} update=\{updateBoard\}\/>/);
 assert.match(page,/<DownSheetSettings inline /);
 assert.match(page,/<LogSettingsModal inline /);
 assert.match(page,/<FixedAppearanceModal inline /);
 for(const id of ["facility-map","down-sheet","defect-log","fixed-repairs"])assert.match(page,new RegExp('<section id="'+id+'"'),id+" is a section");

 /* Collapsible. Open, the four sections ran to fourteen phone screens. FACILITY
    MAP starts open and the other three closed; the bold title row is the
    control; a closed body is hidden rather than unmounted, so its panel's
    storage listeners keep running and its state is where it was left. */
 assert.match(page,/const DEFAULT_OPEN:Record<SectionKey,boolean>=\{master:true,map:false,down:false,log:false,fixed:false\}/,
  "MASTER is the section that opens; the four page sections stay closed");
 assert.match(page,/<button type="button" className="settings-section-toggle" aria-expanded=\{open\} aria-controls=\{id\+"-body"\} onClick=\{onToggle\}>/);
 assert.match(page,/<div id=\{id\+"-body"\} className="settings-section-body" hidden=\{!open\}>/);
 for(const [id,key] of [["facility-map","map"],["down-sheet","down"],["defect-log","log"],["fixed-repairs","fixed"]]){
  assert.match(page,new RegExp('<SectionHead id="'+id+'" kicker="[A-Z ]+" title="[^"]+" open=\\{open\\.'+key+'\\} onToggle=\\{\\(\\)=>toggle\\("'+key+'"\\)\\}\\/>'),id+" title row toggles it");
  assert.match(page,new RegExp('<SectionBody id="'+id+'" open=\\{open\\.'+key+'\\}>'),id+" body follows the same flag");
 }

 /* THE SECOND NAV IS GONE, and must stay gone.

    A row of jump links — MASTER, FACILITY MAP, DOWN SHEET, DEFECT LOG, FIXED
    REPAIRS — used to sit directly under the page nav, which carries four of
    those same five labels in the same pill shape. One switched PAGE, the other
    scrolled to a SECTION, and nothing about either said which. Curtis: "the
    same layout is right above to actually switch to that page. IT confused me
    a few times." Asserting on the CSS too, because a rule left behind is how
    the markup comes back. */
 assert.equal(/settings-jump/.test(page),false,"the duplicate section nav must not return");
 assert.equal(/settings-jump/.test(css),false,"and neither may its styling, which is how it would come back");
 assert.equal(/const reveal=/.test(page),false,"the helper that only the jump links used is gone with them");
 assert.match(css,/\.settings-section-body\[hidden\]\{display:none\}/,"the body's grid display must not defeat the hidden attribute");
 assert.match(css,/\.settings-section-title\{[^}]*font-size:26px;font-weight:900/,"the title is the line people read to find a setting");
 assert.match(css,/\.settings-section-toggle\{width:100%;min-height:58px/,"the whole row is the target, not a chevron");

 /* Fixed Repairs reads the Defect Log's key. One state drives both panels, so
    neither can write a stale copy of the other's change back. */
 assert.match(page,/setSettings=\{next=>updateLog\(\{theme:next\.theme,fontSize:next\.fontSize,fontFamily:next\.fontFamily,appearance:next\.appearance\}\)\}/);
 assert.equal(/useFixedAppearance/.test(page),false,"a second reader of the same key would race the first");

 /* Two calls to update in one tick build on each other, not on the render
    both came from - the map's colour fields set the theme to custom and then
    the colour. */
 assert.match(page,/const next=\{\.\.\.\(latest\.current\?\?value\),\.\.\.patch\};latest\.current=next;setValue\(next\);report\(write\(localStorage,next\)\)/);

 /* Writes merge over what each key already holds. Checked on the data
    modules, which are what the page calls. */
 const {BOARD_SETTINGS_KEY,readBoardSettings,writeBoardSettings}=await import("../src/lib/settings/map-settings.ts");
 const {DOWN_SHEET_SETTINGS_KEY,readDownSheetSettings,writeDownSheetSettings}=await import("../src/lib/down-sheet/down-sheet-settings-store.ts");
 const store=new Map();
 const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>{store.set(key,String(value))}};
 storage.setItem(BOARD_SETTINGS_KEY,JSON.stringify({theme:"midnight",downSheetBadgeView:"off-road",futureField:"keep"}));
 const board=readBoardSettings(storage.getItem(BOARD_SETTINGS_KEY));
 assert.equal(board.theme,"midnight");
 assert.equal(board.downSheetBadgeView,"off-road");
 assert.ok(writeBoardSettings(storage,{...board,busDisplay:"number"}).ok);
 const storedBoard=JSON.parse(storage.getItem(BOARD_SETTINGS_KEY));
 assert.equal(storedBoard.busDisplay,"number");
 assert.equal(storedBoard.downSheetBadgeView,"off-road","the DS badge menu's field survives a Settings-page write");
 assert.equal(storedBoard.futureField,"keep","a field this release has not heard of survives too");
 assert.equal(storedBoard.statusVersion,3,"colours are stamped the way the map reads them back");
 assert.deepEqual(readBoardSettings(storage.getItem(BOARD_SETTINGS_KEY)).colors,board.colors,"the midnight colours read back as written");
 storage.setItem(DOWN_SHEET_SETTINGS_KEY,JSON.stringify({showCompleted:true,defaultShift:"3rd",quickNotes:"3 road calls today",order:"category"}));
 const down=readDownSheetSettings(storage.getItem(DOWN_SHEET_SETTINGS_KEY));
 assert.equal(down.showCompleted,true);
 assert.equal(down.defaultShift,"3rd");
 assert.equal(down.defaultInitials,"");
 assert.ok(writeDownSheetSettings(storage,{...down,defaultInitials:"JD"}).ok);
 const storedDown=JSON.parse(storage.getItem(DOWN_SHEET_SETTINGS_KEY));
 assert.equal(storedDown.defaultInitials,"JD");
 assert.equal(storedDown.quickNotes,"3 road calls today","the sheet's note is not blanked by a default changed elsewhere");
 assert.equal(storedDown.order,"category","nor its sort order");
 assert.equal(readDownSheetSettings("not json").defaultShift,"1st","a damaged key reads as the defaults");
 assert.equal(readDownSheetSettings(JSON.stringify({defaultShift:"4th"})).defaultShift,"1st","a shift the sheet does not have is not kept");

 /* Every gear is gone from the pages. The map's button opens actions only. */
 assert.equal(/log-settings-button/.test(logPage),false,"the Defect Log's gear is gone");
 assert.equal(/<LogSettingsModal/.test(logPage),false);
 assert.equal(/className="down-settings"/.test(downPage),false,"the Down Sheet's gear is gone");
 assert.equal(/<DownSheetSettings/.test(downPage),false);
 assert.equal(/<FixedAppearanceModal/.test(fixedPage),false);
 /* With a glyph, like the gear it replaces: the phone command bar shows only
    the glyph (font-size:0 on the text), so a button without one is invisible
    there - measured, not guessed, in a 390px Chromium. */
 assert.match(mapPage,/aria-label="Open board actions"><span aria-hidden="true">&#9776;<\/span> ACTIONS<\/button>/);
 /* The command bar is display:none on phones; there the same panel opens from
    the phone command menu, and that button says the same thing. */
 assert.match(mapPage,/setPhoneCommandPanel\(null\);setSettingsOpen\(true\)\}\}>ACTIONS<\/button>/);
 assert.equal(/>SETTINGS<\/button>/.test(mapPage),false,"nothing on the map calls the actions panel settings any more");
 assert.equal(/<MapSettingsPanel/.test(mapPage),false,"the map does not draw its settings twice");
 /* And every page still takes a change made here into its own state, or its
    next write would put its stale copy over the new value. */
 assert.match(logPage,/if\(event\.key===SETTINGS_KEY\)setSettings\(readSettings\(event\.newValue\)\)/);
 assert.match(downPage,/if\(event\.key===SETTINGS_KEY\)\{try\{const saved=JSON\.parse\(event\.newValue\|\|"\{\}"\);setShowCompleted/);
 assert.match(mapPage,/if\(event\.key===BOARD_SETTINGS_KEY&&event\.newValue\)\{const ui=readBoardSettings\(event\.newValue\);setColors\(ui\.colors\)/);

 /* MERGE DUPES moved here with its count on the button, and left the log. */
 assert.match(page,/MERGE DUPES\{duplicateCount\?" \("\+duplicateCount\+"\)":""\}/);
 assert.match(page,/const duplicateCount=useMemo\(\(\)=>mergeDuplicateDefects\(fleet,downEntries\)\.removed/);
 /* The cloud ledger came back to the log later for a different job — taking a
    scan sweep out — so it is the merge itself that must stay gone. */
 assert.equal(/merge-duplicates|mergeDuplicateDefects/.test(logPage),false,"the button and the merge left the Defect Log");
 assert.equal(/merge-duplicates/.test(logCss),false,"and its styling with it");
 assert.match(logPage,/<button className="cleanup-log"[^>]*>CLEAN UP<\/button><button className="sweep-scan-button"/,"CLEAN UP and SCAN SWEEP are now neighbours");

 /* The section transfers came with their panels. An import that the device
    refuses says so instead of claiming a merge. */
 assert.match(page,/<SectionTransferControls kind="defect-log"/);
 assert.match(page,/<SectionTransferControls kind="down-sheet"/);
 assert.equal(/SectionTransferControls/.test(logPage),false);
 assert.equal(/SectionTransferControls/.test(downPage),false);
 assert.match(page,/if\(!persist\(after\.buses as SettingsBus\[\],downEntries,\{[^}]*\}\)\.ok\)return refused;/,"a refused Defect Log import says so instead of claiming a merge");
 assert.match(page,/if\(!persist\(reconcileDownSheetMembership\(fleet,active\),entries\)\.ok\)return refused;/,"an imported sheet marks its buses down on the map at once, and a refused write says so");

 /* THE TOMBSTONE LEDGERS TRAVEL ON A TRANSFER FILE.

    Without them an import could only ever ADD, so a sheet cleared on the phone
    could never be cleared on the iPad by file — the receiver keeps whatever only
    it has, by design, and "missing" never meant "deleted". */
 assert.match(page,/exportDefectLogPayload\(fleet,undefined,readMergedAway\(localStorage\)\)/,"the Defect Log export carries what this device folded away");
 /* And the swap ledger with it. Curtis: "I will be scanning from multiple
    devices, period" — a ledger that stayed device-local would leave each phone
    holding half the shop's tempo while a forecast read it as all of it. */
 assert.match(page,/exportDownSheetPayload\(downEntries,undefined,readRemovedEntries\(localStorage\),readSheetLedger\(localStorage\)\)/,
  "the Down Sheet export carries what this device took off, and the swaps it recorded");
 /* MERGED on arrival, never replaced. A swap is an event that happened once on
    one device — two devices never perform the same one — so there is nothing to
    reconcile and the union is the history, deduped by swap id. */
 assert.match(page,/writeSheetLedger\(localStorage,mergeSheetLedgers\(readSheetLedger\(localStorage\),payload\.ledger\)\)/,
  "an incoming ledger is merged into this device's own, not written over it");

 /* Dropped AFTER the merge, never before: the records that have to go are the
    ones the merge has just put back, and the receiver's own stale copy is the
    half that filtering the incoming payload alone would miss. */
 assert.match(page,/mergeDefectLog\(fleet,payload\);[\s\S]{0,900}?dropTombstonedDefects\(buses,payload\.deleted\)/,"defect tombstones are applied after the merge");
 assert.match(page,/mergeDownSheet\(downEntries,payload,fleet\);[\s\S]{0,600}?dropTombstonedEntries\(/,"entry tombstones are applied after the merge");

 /* Membership is reconciled from what SURVIVED the drop. From the merged list
    instead, a removed entry leaves its bus flagged down — and the Down Sheet
    mints a brand new entry for a bus marked down with nothing behind it, under
    an id nothing has tombstoned, so the removal returns under another name. */
 assert.match(page,/const entries=after\.entries as typeof mergedEntries;/,"the surviving entries are what the rest of the handler uses");

 /* THE GUARD HAS TO BE LIFTED FOR A TOMBSTONED IMPORT, and only there.

    writeFleetStorage refuses any write that drops five or more defects. That is
    right everywhere else and exactly wrong here: a merge cannot lose a record,
    so the only subtraction is the tombstones, and those are a confirmed removal
    from another device. Left armed, the import this feature exists for would be
    refused outright — the phone in the shop carries 49 defect tombstones. */
 assert.match(page,/persist\(after\.buses as SettingsBus\[\],downEntries,\{allowBulkDefectLoss:after\.dropped\.length>0\}\)/,"a tombstoned Defect Log import is allowed past the bulk-loss guard");
 assert.equal(/reconcileDownSheetMembership\(fleet,active\),entries,\{allowBulkDefectLoss/.test(page),false,"the sheet import drops entries, not defects, so its guard stays armed");

 /* And the flag is load-bearing rather than decorative: the same write is
    refused without it and accepted with it. */
 {
  const {writeFleetStorageResult,FLEET_STORAGE_KEY}=await import("../src/lib/storage/storage.ts");
  const withDefects=count=>[{id:"b1",n:"17549",defects:Array.from({length:count},(unused,index)=>({id:"d"+index}))}];
  const store=new Map();
  const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>{store.set(key,String(value))}};
  assert.ok(writeFleetStorageResult(storage,withDefects(9)).ok,"the first write lands");
  const warn=console.warn;console.warn=()=>{};
  try{
   assert.equal(writeFleetStorageResult(storage,withDefects(3)).reason,"bulk-loss","six defects gone is refused by default");
   assert.ok(writeFleetStorageResult(storage,withDefects(3),{allowBulkDefectLoss:true}).ok,"and allowed when the caller says the loss is a confirmed removal");
  }finally{console.warn=warn}
  assert.ok(String(storage.getItem(FLEET_STORAGE_KEY)).includes("17549"));
 }

 /* Adopted only once the board is actually saved. A ledger written before a
    refused write would leave this device refusing records it never removed. */
 for(const [ledger,reader,writer] of [["defect","readMergedAway","writeMergedAway"],["entry","readRemovedEntries","writeRemovedEntries"]]){
  const at=page.indexOf(writer+"(localStorage,adoptTombstones(");
  assert.ok(at>0,"the "+ledger+" ledger adopts the tombstones that arrived");
  assert.ok(page.lastIndexOf("return refused;",at)>0,"the "+ledger+" ledger is written only after the save is checked");
  assert.ok(page.includes(writer+"(localStorage,adoptTombstones("+reader+"(localStorage),payload."),"the "+ledger+" ledger merges rather than replaces");
 }

 const response=await render("/settings");
 assert.equal(response.status,200);
 const html=await response.text();
 for(const label of ["FACILITY MAP","DOWN SHEET","DEFECT LOG","FIXED REPAIRS","MERGE DUPES","DUPLICATE RECORDS","MAINTENANCE INTERVALS","SHOW COMPLETED","REQUIRE INITIALS ON RECORDED WORK"])
  assert.ok(html.includes(label),"the page renders "+label);
 assert.match(html,/aria-current="page"[^>]*href="\/settings"|href="\/settings"[^>]*aria-current="page"/,"the nav marks Settings as the current page");
 assert.match(html,/<div id="master-body" class="settings-section-body">/,"MASTER renders open");
 for(const id of ["facility-map","down-sheet","defect-log","fixed-repairs"])assert.match(html,new RegExp('<div id="'+id+'-body" class="settings-section-body" hidden=""'),id+" renders closed");
});

test("MASTER EXPORT and MASTER IMPORT move the whole app, and MASTER sets one look",async()=>{
 const {readFleetBackup,restoreFleetBackup,FLEET_BACKUP_ERRORS}=await import("../src/lib/storage/fleet-restore.ts");
 const {FLEET_STORAGE_KEY,BOARD_SETTINGS_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY,DOWN_SHEET_SETTINGS_STORAGE_KEY,DEFECT_LOG_SETTINGS_STORAGE_KEY,readFleetPayload}=await import("../src/lib/storage/storage.ts");
 const {BUS_LISTS_STORAGE_KEY}=await import("../src/lib/fleet/bus-lists.ts");

 /* Every refusal the Facility Map used to make, kept, because this replaces a
    whole device and a bad file must change nothing at all. */
 assert.equal(readFleetBackup("not json").ok,false);
 assert.equal(readFleetBackup("not json").error,"unreadable");
 assert.equal(readFleetBackup(JSON.stringify({kind:"x"})).error,"missing-buses");
 assert.equal(readFleetBackup(JSON.stringify({buses:[{id:"a",n:"1"}]})).error,"invalid-bus","a bus with no location is not a bus");
 assert.equal(readFleetBackup(JSON.stringify({buses:["nope"]})).error,"invalid-bus");
 assert.equal(readFleetBackup(JSON.stringify({buses:[{id:"a",n:"1",l:"bay-1"},{id:"a",n:"2",l:"bay-2"}]})).error,"duplicate-id",
  "two buses under one id would silently merge two real buses");
 for(const error of Object.keys(FLEET_BACKUP_ERRORS))assert.match(FLEET_BACKUP_ERRORS[error],/No changes were made\.$/,error+" must say nothing changed");

 /* The oldest backups were a bare array with no envelope. They still read. */
 const legacy=readFleetBackup(JSON.stringify([{id:"a",n:"17505",l:"bay-1"}]));
 assert.equal(legacy.ok,true);
 assert.equal(legacy.backup.legacy,true);
 assert.equal(legacy.backup.buses.length,1);

 /* A full file restores every key it carries. */
 const store=new Map([["pace-bus-lists-v1",JSON.stringify({keep:"me"})]]);
 const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>{store.set(key,String(value))},removeItem:key=>{store.delete(key)}};
 const full=readFleetBackup(JSON.stringify({kind:"pace-south-fleet-board-backup",version:5,
  buses:[{id:"a",n:"17505",l:"bay-1",defects:[]},{id:"b",n:"17506",l:"road-2",defects:[]}],
  settings:{theme:"midnight",statusVersion:3},downSheet:{version:1,entries:[{id:"e1"}]},
  downSheetSettings:{defaultShift:"3rd"},defectLogSettings:{theme:"dark"}}));
 assert.equal(full.ok,true);
 const result=restoreFleetBackup(storage,full.backup);
 assert.equal(result.ok,true);
 assert.equal(readFleetPayload(storage.getItem(FLEET_STORAGE_KEY)).buses.length,2,"the board is written through the guarded writer");
 assert.equal(JSON.parse(storage.getItem(BOARD_SETTINGS_STORAGE_KEY)).theme,"midnight");
 assert.deepEqual(JSON.parse(storage.getItem(DOWN_SHEET_STORAGE_KEY)).entries,[{id:"e1"}]);
 assert.equal(JSON.parse(storage.getItem(DOWN_SHEET_SETTINGS_STORAGE_KEY)).defaultShift,"3rd");
 assert.equal(JSON.parse(storage.getItem(DEFECT_LOG_SETTINGS_STORAGE_KEY)).theme,"dark");
 assert.ok(result.restored.includes("board")&&result.restored.includes("down sheet"));
 /* A KEY THE FILE DOES NOT CARRY IS LEFT ALONE. Campaigns were missing from
    the backup until version 4, so restoring an older file must not wipe the
    campaigns this device already holds. */
 assert.deepEqual(JSON.parse(storage.getItem(BUS_LISTS_STORAGE_KEY)),{keep:"me"},"a key the file omits is not cleared");
 assert.equal(result.restored.includes("campaigns"),false);

 /* The page: MASTER first, open, holding the transfer and the one-look theme. */
 const [page,css,map,backup]=await Promise.all([
  readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/settings.css",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8"),
 ]);
 assert.ok(page.indexOf('<section id="master"')<page.indexOf('<section id="facility-map"'),"MASTER is the first section");
 assert.match(page,/>MASTER EXPORT</);
 assert.match(page,/MASTER IMPORT<input type="file" accept="\.json,application\/json" onChange=\{masterImport\}\/>/);
 assert.match(page,/const read=readFleetBackup\(await file\.text\(\)\)/);
 assert.match(page,/if\(!read\.ok\)\{alert\(FLEET_BACKUP_ERRORS\[read\.error\]\);return\}/,"a bad file is refused before anything is written");
 const importBody=page.slice(page.indexOf("const masterImport="),page.indexOf("const applyMasterTheme="));
 assert.ok(importBody.indexOf("if(!read.ok)")<importBody.indexOf("if(!confirm("),"and refused before the confirm, so a bad file never even asks");
 assert.match(page,/const result=restoreFleetBackup\(localStorage,read\.backup\)/);
 /* Written in this tab, so no storage event fires: the panels have to be told. */
 assert.match(page,/reloadBoard\(\);reloadDown\(\);reloadLog\(\)/,"the sections below refresh from what the file wrote");
 assert.match(page,/const reload=\(\)=>load\(localStorage\.getItem\(key\)\)/);

 /* MASTER is a writer, not a layer: one press writes both pages' own settings,
    so there is never a second value to decide between. */
 assert.match(page,/const applyMasterTheme=\(theme:typeof MASTER_THEMES\[number\]\)=>\{/);
 assert.match(page,/updateBoard\(\{theme:theme\.map,visuals:/);
 assert.match(page,/updateLog\(\{theme:theme\.log,appearance:/);
 assert.match(page,/const masterTheme=MASTER_THEMES\.find\(theme=>theme\.map===board\.theme&&theme\.log===log\.theme\)/,
  "and it reads back as active only when every page actually agrees");
 assert.match(css,/\.settings-section-master\{/);
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.master-transfer-row\{grid-template-columns:1fr\}/,
  "on a phone the replace-everything button never sits half a thumb from export");

 /* And they are gone from the map, which keeps only the Fleet Map transfer. */
 assert.equal(/>EXPORT ALL DATA</.test(map),false,"the whole-app export left the map");
 assert.equal(/IMPORT ALL DATA<input/.test(map),false);
 assert.equal(/const importBoard=/.test(map),false,"and the map no longer carries its own restore");
 assert.match(map,/MASTER EXPORT, MASTER IMPORT and RESTORE LAST GOOD COPY/,"the map points at where they went");
 assert.equal(/BOARD BACKUP &amp; TRANSFER/.test(map),false,"the section is the Fleet Map transfer alone now");
 assert.match(map,/FLEET MAP TRANSFER<\/h3>/,"and is named for what it actually moves");
 assert.match(backup,/MASTER EXPORT in Settings/,"and so does the report hint");

 const response=await render("/settings");
 assert.equal(response.status,200);
 const html=await response.text();
 for(const label of ["Master settings","MASTER EXPORT","MASTER IMPORT","ONE LOOK FOR EVERY PAGE"])
  assert.ok(html.includes(label),"the page renders "+label);
 assert.match(html,/<div id="master-body" class="settings-section-body">/,"MASTER renders open");
 assert.match(html,/<div id="facility-map-body" class="settings-section-body" hidden=""/,"and FACILITY MAP now renders closed");
});

test("every storage function a page calls is one it imports, so IMPORT ALL DATA can run at all",async()=>{
 /* Found by the type checker, confirmed in the source, not inferred: the commit
    of 2026-08-31 that added the save-failure banner swapped the map's import
    to writeFleetStorageResult and left three bare writeFleetStorage(...) calls
    behind - the map's IMPORT ALL DATA among them. A bundler does not check free
    identifiers, so the build passed and the button threw a ReferenceError the
    moment somebody tried to restore a phone from a backup. Nothing in the gate
    asked the type checker. This asks the one question that matters: does every
    file that calls a storage function import it. */
 const storage=await readFile(new URL("../src/lib/storage/storage.ts",import.meta.url),"utf8");
 const exported=[...storage.matchAll(/^export (?:async )?function ([A-Za-z]+)/gm)].map(match=>match[1]);
 assert.ok(exported.includes("writeFleetStorage")&&exported.length>10,"the storage module's functions are read off its source, not listed here");
 const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>
  entry.isDirectory()?walk(new URL(entry.name+"/",dir)):/\.(ts|tsx)$/.test(entry.name)?[new URL(entry.name,dir)]:[]))).flat();
 const files=(await Promise.all(["../app/","../src/"].map(root=>walk(new URL(root,import.meta.url))))).flat();
 let checked=0;
 for(const file of files){
  const source=await readFile(file,"utf8");
  const imports=[...source.matchAll(/import \{([^}]*)\} from "(?:(?:\.\.\/|\.\/)+|@\/src\/lib\/storage\/)storage(?:\.ts)?"/g)];
  if(!imports.length)continue;
  const locals=new Set(imports.flatMap(match=>match[1].split(",").map(item=>item.trim().replace(/^type /,"")).filter(Boolean).map(item=>item.split(/\s+as\s+/).pop())));
  for(const name of exported){
   if(!new RegExp("(^|[^.\\w])"+name+"\\(").test(source))continue;
   checked++;
   assert.ok(locals.has(name),file.pathname.split(/\/(?:app|src)\//)[1]+" calls "+name+"() without importing it - a ReferenceError waiting for the first press");
  }
 }
 assert.ok(checked>=20,"expected to check many call sites, checked "+checked);
 /* And the one that was broken, by name: the map imports the guarded writer
    and IMPORT ALL DATA restores the board through it. */
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 /* The whole-app restore moved out of the map into fleet-restore.ts, so this
    now checks it where it lives - still guarded, still lifting the bulk-loss
    stop that a deliberate whole-device replace has to lift. */
 const restore=await readFile(new URL("../src/lib/storage/fleet-restore.ts",import.meta.url),"utf8");
 assert.match(restore,/import \{[^}]*\bwriteFleetStorageResult\b[^}]*\} from "(?:[^"]*\/)?storage\.ts"/);
 assert.match(restore,/const written=writeFleetStorageResult\(storage,backup\.buses,\{allowBulkDefectLoss:true\}\);/);
 assert.match(restore,/if\(!written\.ok\)return \{ok:false,restored:\[\],reason:written\.reason\}/,
  "a refused board write leaves nothing half-restored");
 assert.equal(/writeFleetStorage\(localStorage,imported/.test(map),false,"and the map no longer carries its own copy");
});

test("the backup reminder is one card the shop sets the cadence of",async()=>{
 const buses=count=>Array.from({length:count},(_,index)=>({id:"b"+index,defects:[
  {id:"d"+index,category:"Miscellaneous",issue:"Driver-reported defect",details:"",operability:"service",state:"open",source:"defect-log"}]}));
 const empty={getItem:()=>null};

 // Twenty was fixed, and twenty is either a nag or a stranger depending on how
 // busy the shop is. It is the default now rather than the rule.
 assert.equal(FLEET_BACKUP_INTERVAL,20);
 assert.equal(fleetBackupDue(empty,buses(19)).due,false);
 assert.equal(fleetBackupDue(empty,buses(20)).due,true);
 assert.equal(fleetBackupDue(empty,buses(6),5).due,true);
 assert.equal(fleetBackupDue(empty,buses(6),50).due,false);
 assert.equal(fleetBackupDue(empty,buses(60),50).due,true);

 // Anything not offered falls back rather than being honoured. A zero or a
 // negative would make the banner permanent; a huge one would silence it.
 for(const choice of FLEET_BACKUP_INTERVAL_CHOICES)assert.equal(normalizeFleetBackupInterval(choice),choice);
 for(const junk of [0,-7,"",null,undefined,"abc",7,99999,1.5])assert.equal(normalizeFleetBackupInterval(junk),FLEET_BACKUP_INTERVAL,String(junk)+" should fall back");
 assert.ok(!FLEET_BACKUP_INTERVAL_CHOICES.includes(0),"there is no never - the loosest setting still asks");

 /* globals.css styles a bare `aside` as a fixed 255px panel pinned top right,
    and absolutely positions any button directly inside one into its corner.
    That is written for the map's floating panel, and this banner inherited it
    purely by being an <aside> - which is what threw EXPORT FULL BACKUP on top
    of the sentence it belongs under. The reset is load-bearing, not tidiness. */
 const [css,tsx]=await Promise.all([
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/offline-backup-reminder.tsx",import.meta.url),"utf8"),
 ]);
 const card=css.match(/\.offline-backup-reminder\{[^}]*\}/)[0];
 for(const reset of ["position:static","width:auto","top:auto","right:auto"])assert.ok(card.includes(reset),"the card must undo the global aside rule: "+reset);
 assert.match(css,/\.offline-backup-reminder>button\{position:static;[^}]*width:100%/);
 // one card, read top to bottom, not a heading and a button side by side
 assert.match(card,/display:grid/);
 assert.ok(!/flex-direction|align-items:center/.test(card),"the card must not lay out in a row again");
 assert.match(tsx,/<b>OFFLINE BACKUP DUE<\/b>[\s\S]*<small>[\s\S]*<button/,"heading, then text, then the button");
 // and the interval reaches it, so changing the setting re-asks straight away
 assert.match(tsx,/fleetBackupDue\(localStorage,buses,interval\)/);
 assert.match(tsx,/\},\[buses,interval\]\)/);
});

test("it does not matter which section is moved first",()=>{
 /* Curtis asked whether moving the map before the Down Sheet still lands right,
    or whether the order is only a recommendation. It should not matter, and it
    did — because of identity, in two ways that both dropped a badge. */
 const isActive=e=>e.workflow!=="Completed";
 const applySheet=(buses,entries,file)=>{const m=mergeDownSheet(entries,file,buses);
  return {buses:reconcileDS(buses,m.entries.filter(isActive).map(e=>e.busId)),entries:m.entries}};
 const applyMap=(buses,entries,file)=>({buses:mergeFleetMap(buses,file).buses,entries});
 const bus=(id,n,l,down)=>({id,n,l,s:down?"out":"service",down,onDownSheet:down,defects:[],pendingRepair:""});

 for(const [label,sender,receiver] of [["same ids",["a","b"],["a","b"]],["different ids",["p1","p2"],["i1","i2"]]]){
  const from=[bus(sender[0],"17549","west-4",true),bus(sender[1],"18122","garage-2",false)];
  const mapFile=exportFleetMapPayload(from);
  const sheetFile=exportDownSheetPayload([{id:"e1",busId:sender[0],busNumber:"17549",workflow:"Scheduled"}]);
  const start=()=>[bus(receiver[0],"17549","bay-3",false),bus(receiver[1],"18122","bay-4",false)];
  let a={buses:start(),entries:[]}; a=applySheet(a.buses,a.entries,sheetFile); a=applyMap(a.buses,a.entries,mapFile);
  let c={buses:start(),entries:[]}; c=applyMap(c.buses,c.entries,mapFile); c=applySheet(c.buses,c.entries,sheetFile);
  const show=x=>x.buses.map(z=>z.n+"@"+z.l+(z.down?" DOWN":"")).join(" ");
  assert.equal(show(a),show(c),label+": the order of the two transfers changed the result");
  assert.match(show(a),/17549@west-4 DOWN/,label+": the bus should have moved and kept its badge");
 }

 /* And a transfer never re-keys the receiving device's own records. The map
    payload carries the sending device's id, and letting it through orphaned
    the receiver's OWN Down Sheet entries — they point at the id it had before
    the import — so its buses silently lost their badges. */
 const localBuses=[bus("i1","17549","bay-3",true)];
 const localEntries=[{id:"e-local",busId:"i1",busNumber:"17549",workflow:"Scheduled"}];
 const after=mergeFleetMap(localBuses,exportFleetMapPayload([bus("p1","17549","west-4",false)])).buses;
 assert.equal(after[0].id,"i1","a transfer must not re-key a bus the receiving device already had");
 assert.equal(after[0].l,"west-4","it still takes the incoming position");
 assert.equal(reconcileDS(after,localEntries.map(e=>e.busId))[0].down,true,"the device's own Down Sheet must still find its bus");

 // an entry arriving with a foreign id is re-pointed by fleet number
 const repointed=mergeDownSheet([],exportDownSheetPayload([{id:"e9",busId:"p1",busNumber:"17549",workflow:"Scheduled"}]),[bus("i1","17549","bay-3",false)]);
 assert.equal(repointed.entries[0].busId,"i1");
 // and one for a bus this device does not have is left exactly as it came
 const untouched=mergeDownSheet([],exportDownSheetPayload([{id:"e8",busId:"p9",busNumber:"99999",workflow:"Scheduled"}]),[bus("i1","17549","bay-3",false)]);
 assert.equal(untouched.entries[0].busId,"p9");
});

test("a section moves between devices without dragging the rest of the app with it",()=>{
 /* The situation this exists for: the phone has today's Defect Log and last
    week's map, the iPad has today's map and last week's log. Importing either
    whole backup throws away the half the other device did better. */
 const defect=(id,issue)=>({id,category:"Engine",issue,details:"",operability:"service",state:"open",source:"defect-log"});
 const phone=[
  {id:"p1",n:"17549",l:"bay-3",s:"defect",mechanic:"CJ",defects:[defect("d1","Overheating"),defect("d2","Misfire")]},
  {id:"p2",n:"18122",l:"road-1",s:"service",mechanic:"",defects:[defect("d3","Oil leak")]}];
 const ipad=[
  {id:"i1",n:"17549",l:"west-4",s:"service",mechanic:"RM",defects:[defect("d9","Coolant leak")]},
  {id:"i2",n:"18122",l:"garage-2",s:"shop",mechanic:"",defects:[]},
  {id:"i3",n:"20077",l:"east-1",s:"service",mechanic:"",defects:[]}];

 // The phone sends its Defect Log. The iPad's map must not move an inch.
 const log=exportDefectLogPayload(phone);
 assert.equal(log.kind,TRANSFER_KINDS["defect-log"].payloadKind);
 assert.ok(log.buses.every(bus=>!("l" in bus)&&!("s" in bus)),"a Defect Log transfer must not carry map fields");
 const afterLog=mergeDefectLog(ipad,log);
 assert.deepEqual(afterLog.buses.map(bus=>bus.l),["west-4","garage-2","east-1"],"the map stayed put");
 assert.deepEqual(afterLog.buses.map(bus=>bus.mechanic),["RM","",""],"map fields stayed put");
 // the phone's defects arrived and the iPad's own were kept, not replaced
 assert.deepEqual(afterLog.buses[0].defects.map(d=>d.id).sort(),["d1","d2","d9"]);
 assert.deepEqual(afterLog.buses[1].defects.map(d=>d.id),["d3"]);
 assert.equal(afterLog.report.updated,2);

 // The iPad sends its map back. The phone's Defect Log must survive whole.
 const map=exportFleetMapPayload(ipad);
 assert.ok(map.buses.every(bus=>!("defects" in bus)),"a Fleet Map transfer must not carry defects");
 const afterMap=mergeFleetMap(phone,map);
 assert.deepEqual(afterMap.buses.slice(0,2).map(bus=>bus.l),["west-4","garage-2"],"the phone took the iPad's positions");
 assert.deepEqual(afterMap.buses[0].defects.map(d=>d.id),["d1","d2"],"sending a map must never clear a Defect Log");
 // a bus the phone has never seen arrives with the map, because the map is
 // where a bus lives, and it arrives with no defects of its own
 assert.equal(afterMap.report.added,1);
 assert.equal(afterMap.buses[2].n,"20077");
 assert.deepEqual(afterMap.buses[2].defects,[]);

 // A defect for a bus the receiving device does not have is reported, never
 // invented: giving it a place on the map is the map transfer's job.
 const stranger=mergeDefectLog([ipad[0]],exportDefectLogPayload([{id:"x",n:"99999",defects:[defect("d5","Misfire")]}]));
 assert.deepEqual(stranger.report.unmatched,["99999"]);
 assert.equal(stranger.buses.length,1);

 // Matching is by fleet number, because two devices seeded separately give the
 // same bus different ids and 17549 is what a person means.
 const renumbered=mergeDefectLog([{id:"totally-different",n:"17549",l:"pit-1",defects:[]}],log);
 assert.equal(renumbered.report.updated,1);
 assert.equal(renumbered.buses[0].l,"pit-1");

 // The Down Sheet is its own store, so it merges by entry and keeps local ones.
 const sheet=mergeDownSheet([{id:"e1",busNumber:"17549",workflow:"Scheduled"},{id:"e2",busNumber:"18122",workflow:"Scheduled"}],
  exportDownSheetPayload([{id:"e1",busNumber:"17549",workflow:"Completed"},{id:"e3",busNumber:"20077",workflow:"Scheduled"}]));
 assert.equal(sheet.entries.find(e=>e.id==="e1").workflow,"Completed","incoming wins where both have it");
 assert.ok(sheet.entries.find(e=>e.id==="e2"),"an entry only this device has stays on the sheet");
 assert.equal(sheet.report.added,1);

 /* Wrong file on the wrong page names the right page, rather than the flat
    "not valid" that a whole-backup import gave every one of these. */
 const wrong=readTransferPayload(JSON.stringify(exportFleetMapPayload(ipad)),"defect-log");
 assert.equal(wrong.ok,false);
 assert.match(wrong.error,/Fleet Map file\. Import it on the Fleet Map page/);
 const report=readTransferPayload(JSON.stringify({kind:"fleet-real-time-defect-log",records:[]}),"defect-log");
 assert.match(report.error,/report, not a transfer/);
 const full=readTransferPayload(JSON.stringify({kind:"pace-south-fleet-board-backup"}),"down-sheet");
 assert.match(full.error,/MASTER IMPORT in Settings/,
  "a message that sends somebody to a button must name one that exists");
 assert.equal(readTransferPayload("not json at all","defect-log").ok,false);
 assert.equal(readTransferPayload(JSON.stringify(log),"defect-log").ok,true);
 assert.match(transferFilename("fleet-map",new Date("2026-08-30T00:00:00Z")),/^pace-fleet-map-2026-08-30\.json$/);

 /* A merge must not invent keys. Writing the local defect fields back
    unconditionally set pendingRepair to undefined on a bus that had never had
    one, and the Facility Map calls .trim() on it while filtering — so importing
    a map crashed the page instead of moving a bus. The fixtures above all
    happened to carry the field, which is exactly why only a real browser found
    it; these are deliberately sparse. */
 const sparse=[{id:"s1",n:"17549",l:"bay-3",s:"defect"}];
 const merged=mergeFleetMap(sparse,exportFleetMapPayload([{id:"o1",n:"17549",l:"west-4",s:"service"}]));
 assert.equal(merged.buses[0].l,"west-4");
 assert.ok(!("pendingRepair" in merged.buses[0]),"a key the bus never had must not be created as undefined");
 assert.ok(!("defects" in merged.buses[0]),"the same for defects");
 // and a bus arriving on the map with no defect fields at all gets usable ones
 const fresh=mergeFleetMap([],exportFleetMapPayload([{id:"o2",n:"20077",l:"east-1",s:"service"}]));
 assert.deepEqual(fresh.buses[0].defects,[]);
 assert.equal(fresh.buses[0].pendingRepair,"");
 // the same shape through the Defect Log side
 const sparseLog=mergeDefectLog([{id:"s2",n:"18122",l:"bay-4"}],exportDefectLogPayload([{id:"o3",n:"18122",defects:[defect("d7","Misfire")]}]));
 assert.deepEqual(sparseLog.buses[0].defects.map(d=>d.id),["d7"]);
 assert.equal(sparseLog.buses[0].l,"bay-4");
});

test("only the button that writes a restorable file is called a backup",async()=>{
 /* Four buttons in this app write a file and only one of them can be read back
    in. They used to read as variations on the same idea — EXPORT LOG next to
    EXPORT / SHARE BACKUP — and the difference only surfaces on the day somebody
    tries to restore a phone from the wrong one. */
 /* The Defect Log's report button sits on its settings panel, which the shared
    Settings page renders now; the page itself no longer carries it. */
 const [logPage,log,fixed,lists,map,backup]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/lists/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8"),
 ]);

 // Each report says REPORT on its face, and none of them says BACKUP.
 assert.match(log,/onClick=\{exportLog\}[^>]*>EXPORT LOG REPORT</);
 assert.match(fixed,/onClick=\{exportHistory\}[^>]*>EXPORT HISTORY REPORT</);
 assert.match(lists,/onClick=\{downloadList\}[^>]*>DOWNLOAD REPORT \(\.TXT\)</);
 for(const [name,source,handler] of [["Defect Log",log,"exportLog"],["Fixed Repairs",fixed,"exportHistory"],["Fleet Campaigns",lists,"downloadList"]]){
  const label=source.match(new RegExp("onClick=\\{"+handler+"\\}[^>]*>([^<]+)<"))[1];
  assert.ok(/REPORT/.test(label),name+" export must say REPORT: "+label);
  assert.ok(!/BACKUP/i.test(label),name+" export must not say BACKUP: "+label);
  // and each carries the long version, from one shared string so the three
  // can never drift into describing the same limitation three different ways
  assert.match(source,new RegExp("onClick=\\{"+handler+"\\}[^>]*title=\\{REPORT_EXPORT_HINT\\}"),name+" is missing the shared hint");
 }
 /* The hint sends people somewhere, so it has to name a button that is really
    there. It pointed at EXPORT / SHARE BACKUP, which no longer exists. */
 const hint=backup.match(/REPORT_EXPORT_HINT="([^"]*)"/)[1];
 assert.match(hint,/Report only[\s\S]*cannot be imported back/);
 assert.match(hint,/MASTER EXPORT in Settings/);
 assert.ok(!/SHARE BACKUP/.test(hint),"the hint must not send anybody to a label that no longer exists");
 assert.ok(!/Facility Map settings/.test(hint),"nor to a settings modal the map no longer has");
 assert.ok(!/EXPORT ALL DATA/.test(hint),"nor to a button that has been renamed");

 // The real one keeps the word, and it is the only button that has it.
 // The whole-app pair says ALL DATA now, because it is no longer the only
 // thing that can be imported — it is the one that replaces everything.
 /* The whole-app pair is MASTER EXPORT / MASTER IMPORT in Settings now. It is
    still the only file that can be read back in, and still the only import
    that replaces rather than merges. */
 const settings=await readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8");
 assert.match(settings,/>MASTER EXPORT</);
 assert.match(settings,/MASTER IMPORT<input type="file"/);
 assert.match(settings,/MASTER IMPORT replaces everything on this device/);
 assert.equal(/>EXPORT ALL DATA<|IMPORT ALL DATA<input/.test(map),false,"and the map no longer offers them");
 assert.equal((logPage+log+fixed+lists).match(/>[^<]*BACKUP[^<]*<\/button>/gi),null);
});

test("the work time panel is written to be moved somewhere else later",async()=>{
 const [panel,logic,listsPage]=await Promise.all([
  readFile(new URL("../app/lists/_components/work-time-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/reports/work-time.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/lists/page.tsx",import.meta.url),"utf8"),
 ]);
 // Curtis expects this to move. It takes its records as a prop and holds only
 // which person is picked, so relocating it is an import and one line.
 assert.match(panel,/export default function WorkTimePanel\(\{lists=\[\],buses=\[\],defaultPerson=""\}/);
 assert.equal(/localStorage/.test(panel),false,"it must not reach for storage of its own");
 assert.equal(/BUS_LISTS_STORAGE_KEY|FLEET_STORAGE_KEY|useRouter|window\./.test(panel),false,"nor for the page around it");
 // the aggregation knows nothing about campaigns beyond where rows come from
 assert.equal(/localStorage|document\.|window\./.test(logic),false);
 // mounted outside the campaign layout, so it can be lifted out whole
 assert.match(listsPage,/<WorkTimePanel lists=\{lists\} buses=\{fleet\} defaultPerson=\{initials\.trim\(\)\.toUpperCase\(\)\}\/>/);
 assert.ok(listsPage.indexOf("<WorkTimePanel")<listsPage.indexOf('className="lists-layout"'),"near the top, not inside the list panels");
 assert.ok(listsPage.indexOf("lists-header")<listsPage.indexOf("<WorkTimePanel"),"but below the header, not at the very top");

 // Each job on a day is its own element. Joined into one string with a
 // separator character, the dot between two jobs looked identical to the dot
 // inside one and a busy day read as an unbroken run of numbers.
 assert.match(panel,/className="work-time-job"/);
 assert.equal(/\.join\(/.test(panel),false,"jobs are elements, not a joined string");
 const styles=await readFile(new URL("../app/lists/_components/work-time.css",import.meta.url),"utf8");
 assert.match(styles,/\.work-time-job\+\.work-time-job\{[^}]*border-left/,"with a rule between them");
 assert.match(styles,/\.work-time-detail\{[^}]*flex-wrap:wrap/,"wrapping rather than running off a phone");

 // Campaigns borrow the fleet to total repair time and must never write it
 // back. A bug here would put defect records at risk from a page that has no
 // business editing them.
 assert.match(listsPage,/readFleetPayload/,"it reads the fleet for the timesheet");
 assert.equal(/writeFleetStorage|setItem\(FLEET_STORAGE_KEY/.test(listsPage),false,"but never writes it");
});

test("the shop cloud never becomes a condition of using the board",async()=>{
 const [control,page,panel,css,settings]=await Promise.all([
  readFile(new URL("../app/settings/_components/cloud-sync-control.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/map-settings-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8"),
 ]);
 /* It is the FIRST group in MASTER, not inside the map's own section. It
    decides whether the map, the Defect Log and the Down Sheet reach the other
    devices at all, so it is a whole-app control — and somebody setting up a new
    iPad should not have to open a section called "Board settings" and scroll to
    find the one thing they came for. */
 /* No aria-labelledby any more, and that is the fix rather than a loss: the
    <h3 id="master-cloud-heading"> it pointed at became the drawer's title when
    the groups were put behind drawers, and a dangling IDREF makes the region
    announce UNNAMED — strictly worse than no attribute. The drawer's own <h3>
    heads it now. Measured: zero broken IDREFs on the page. */
 assert.match(settings,/<section className="settings-group cloud-sync-settings">/);
 assert.equal(/aria-labelledby="master-cloud-heading"/.test(settings),false,"the dangling reference must not come back");
 assert.match(settings,/<CloudSyncControl\/>/);
 assert.equal(/cloud-sync-settings/.test(panel),false,"no longer in the map's section");
 assert.equal(/CloudSyncControl/.test(panel),false,"the map panel must not import it either");
 assert.equal(/<CloudSyncControl/.test(page),false,"never in front of the map");
 // First inside MASTER — ahead of MASTER EXPORT, the recovery control and the theme picker.
 const master=settings.indexOf('id="master"');
 for(const after of ["master-transfer","master-recovery","master-theme"])
  assert.ok(settings.indexOf("cloud-sync-settings",master)<settings.indexOf(after,master),"SHOP CLOUD must come before "+after);
 assert.match(css,/\.cloud-status\{/);
 // Pushing reads what is ON DISK, not what the page is holding. writeFleetStorage
 // refuses writes it considers destructive and the board's save effect discards
 // that boolean, so pushing from React state would upload changes the device
 // itself declined to keep.
 assert.match(control,/readFleetStorage<.*>\(localStorage\)/);
 assert.doesNotMatch(control,/props\.buses|\{buses\}:/);
 /* A pull merges; it never replaces. The three merges moved into cloud-live.ts
    when live sync arrived, so the button and the background use one copy and
    cannot drift — the control delegates to it rather than keeping its own. */
 const liveMerge=await readFile(new URL("../src/lib/cloud/cloud-live.ts",import.meta.url),"utf8");
 assert.match(liveMerge,/mergeFleetMap\(/);
 assert.match(liveMerge,/mergeDefectLog\(/);
 assert.match(liveMerge,/mergeDownSheet\(/);
 assert.match(control,/applyCloudPull\(localStorage,/);
 assert.equal(/mergeFleetMap\(/.test(control),false,"the control must not keep a second merge");
 assert.doesNotMatch(control,/localStorage\.clear\(\)/);
});

test("a board that did not save says so instead of failing silently",async()=>{
 const {writeFleetStorageResult,writeDownSheetStorageResult,writeSetting,writeFleetStorage}=
  await import("../src/lib/storage/storage.ts");
 const [mapPage,downPage,logPage,alert]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/shared/save-alert.tsx",import.meta.url),"utf8"),
 ]);

 const store=(seed={})=>{const map=new Map(Object.entries(seed));
  return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)}};
 const board=JSON.stringify({version:3,buses:[{id:"a",n:"1",defects:[]}]});
 const quota=()=>{const error=new Error("full");error.name="QuotaExceededError";throw error};

 // A healthy write is unchanged.
 assert.deepEqual(writeFleetStorageResult(store(),[{id:"a",n:"1",defects:[]}]),{ok:true});

 // WHY it failed has to travel with the failure, because the answers differ:
 // a full device needs room, an unreadable board must not be overwritten.
 const full={getItem:()=>board,setItem:quota};
 assert.equal(writeFleetStorageResult(full,[{id:"a",n:"1",defects:[]}]).reason,"storage-full");
 // The recovery snapshot is the FIRST write to hit a full device, so without
 // propagating the real cause this reported "no recovery copy" and sent
 // somebody looking for a corrupt store when what they needed was space.
 assert.notEqual(writeFleetStorageResult(full,[{id:"a",n:"1",defects:[]}]).reason,"no-snapshot");
 const unreadable={getItem:()=>"not json at all",setItem:()=>{}};
 assert.equal(writeFleetStorageResult(unreadable,[{id:"a",n:"1",defects:[]}]).reason,"unreadable");
 // A snapshot refused for its own reasons still blocks the write and says so.
 const snapshotOnly={getItem:()=>board,setItem:k=>{if(String(k).includes("recovery"))throw new Error("no")}};
 assert.equal(writeFleetStorageResult(snapshotOnly,[{id:"a",n:"1",defects:[]}]).reason,"no-snapshot");

 // The boolean form every existing caller uses is untouched.
 assert.equal(writeFleetStorage(store(),[{id:"a",n:"1",defects:[]}]),true);
 assert.equal(writeFleetStorage(full,[{id:"a",n:"1",defects:[]}]),false);

 // NOTHING MAY THROW. The Down Sheet's setItem was not wrapped at all, so a
 // full device threw out of its save effect and took the render with it.
 // Its own empty store, because `full` holds a FLEET payload and handing that
 // to the sheet reader correctly reports "unreadable" rather than "full".
 const fullSheet={getItem:()=>null,setItem:quota};
 assert.doesNotThrow(()=>writeDownSheetStorageResult(fullSheet,[]));
 assert.equal(writeDownSheetStorageResult(fullSheet,[]).reason,"storage-full");
 // And a sheet written by a newer build is refused rather than overwritten.
 assert.equal(writeDownSheetStorageResult({getItem:()=>"not json",setItem:()=>{}},[]).reason,"unreadable");
 assert.doesNotThrow(()=>writeSetting(full,"anything","x"));
 assert.equal(writeSetting(full,"anything","x").reason,"storage-full");
 assert.deepEqual(writeSetting(store(),"k","v"),{ok:true});

 // No surface may call setItem straight any more, EXCEPT inside a try that
 // already reports the failure. A raw call is how the editor got stuck open.
 for(const [name,source] of [["map",mapPage],["down sheet",downPage],["defect log",logPage]])
  for(const line of source.split("\n"))
   if(line.includes("localStorage.setItem(")&&!line.includes("try{"))
    assert.fail(name+" still writes storage unguarded: "+line.trim().slice(0,80));

 // The Facility Map's save effect discarded the result entirely — the specific
 // bug that let a full device look exactly like a successful save.
 assert.match(mapPage,/setSaveProblem\(writeFleetStorageResult\(localStorage,buses\)\.reason\|\|""\)/);
 // All three boards show the banner.
 for(const [name,source] of [["map",mapPage],["down sheet",downPage],["defect log",logPage]])
  assert.ok(source.includes("<SaveAlert reason={saveProblem}"),name+" must render the banner");

 // It is a banner, not an alert: an alert is dismissed by somebody busy, who
 // then keeps working on a board that is not being saved.
 assert.equal(/window\.alert|[^.]\balert\(/.test(alert),false,"the save alert must not use alert()");
 // It names an answer rather than an error code, and offers the way out.
 assert.ok(alert.includes("EXPORT A BACKUP NOW"));
 assert.match(alert,/THIS DEVICE IS FULL/);
 // Absent when there is nothing wrong, so a healthy board shows no chrome.
 assert.match(alert,/if\(!reason\)return null/);
});

test("LITE changes what is drawn and can never reach a record", async () => {
 const { hiddenInLite, shownIn, LITE_HIDDEN } = await import("../src/lib/settings/lite-mode.ts");

 // Full hides nothing, whatever is on the list.
 for (const feature of LITE_HIDDEN) {
  assert.equal(hiddenInLite("full", feature), false, feature + " must be visible in full");
  assert.equal(hiddenInLite("lite", feature), true, feature + " must stand down in lite");
  assert.equal(shownIn("lite", feature), false);
 }

 /* THE CONSTRAINT THE WHOLE FEATURE RESTS ON. Lite changes what is DRAWN, never
    what is STORED, SYNCED or READ BACK — a Lite phone and a full phone sit side
    by side on the same Shop Cloud writing the same rows to the same keys, and
    neither can tell what the other is running.

    So no module that decides a record consults the mode. Asserted against the
    files rather than trusted to a comment: the day somebody reaches for
    hiddenInLite inside a save path to "keep Lite simple", this fails. */
 const dataModules = [
  "../src/lib/storage/storage.ts", "../src/lib/cloud/cloud-sync.ts", "../src/lib/cloud/cloud-live.ts", "../src/lib/cloud/cloud-client.ts",
  "../src/lib/defects/repair-catalog.ts", "../src/lib/storage/section-transfer.ts", "../src/lib/defects/defect-log-sync.ts",
  "../src/lib/down-sheet/down-sheet-sync.ts", "../src/lib/defects/deferred-actions.ts", "../src/lib/storage/fleet-backup.ts",
  "../src/lib/storage/fleet-restore.ts", "../src/lib/down-sheet/down-sheet-clear.ts",
 ];
 for (const file of dataModules) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  assert.doesNotMatch(source, /hiddenInLite|shownIn|app-mode|useAppMode|APP_MODE_STORAGE_KEY/,
   file + " decides records, so it must never consult the app mode");
 }

 // And lite-mode.ts itself imports only a type — it cannot read or write storage.
 const rules = await readFile(new URL("../src/lib/settings/lite-mode.ts", import.meta.url), "utf8");
 assert.doesNotMatch(rules, /localStorage|setItem|getItem/, "the rules never touch storage");
 assert.match(rules, /^import type \{AppMode\} from "(?:[^"]*\/)?app-mode\.ts";$/m, "a type, not the store");
});

test("a transfer file carries removals, so an import can make the other device MATCH rather than only grow",async()=>{
 const {exportDownSheetPayload,exportDefectLogPayload,mergeDownSheet,mergeDefectLog,mergeSummary,TRANSFER_KINDS}=await import("../src/lib/storage/section-transfer.ts");
 const {dropTombstonedEntries,dropTombstonedDefects}=await import("../src/lib/cloud/cloud-live.ts");
 const {adoptTombstones,trimTombstoneLedger,REMOVED_ENTRY_LEDGER_LIMIT}=await import("../src/lib/cloud/cloud-sync.ts");

 /* THE CASE FROM THE FLOOR. The phone's sheet has 2 entries; the iPad's has
    those 2 plus a third the phone took off this morning. Curtis expected the
    import to leave the iPad matching the phone, and before the ledger travelled
    it could not: every merge in this app keeps whatever only the receiver has. */
 const sender=[{id:"e1",busId:"b1",workflow:"Open",updatedAt:"2026-09-13T10:00:00.000Z"},
               {id:"e2",busId:"b2",workflow:"Open",updatedAt:"2026-09-13T10:00:00.000Z"}];
 const receiver=[...sender.map(entry=>({...entry})),
                 {id:"e3",busId:"b3",workflow:"Open",updatedAt:"2026-09-13T09:00:00.000Z"}];
 const removedOnSender={e3:"2026-09-13T09:30:00.000Z"};

 const payload=exportDownSheetPayload(sender,"2026-09-13T11:00:00.000Z",removedOnSender);
 assert.deepEqual(payload.removedEntries,removedOnSender,"the export carries the ledger");

 const {entries:merged,report}=mergeDownSheet(receiver,payload,[]);
 assert.equal(merged.length,3,"the merge alone still keeps the receiver's extra entry");
 const after=dropTombstonedEntries(merged,payload.removedEntries);
 assert.equal(after.entries.length,2,"and the tombstone is what takes it off");
 assert.deepEqual(after.dropped,["e3"]);
 assert.match(mergeSummary("down-sheet",report,after.dropped.length),/1 removed/,"the summary says a record LEFT");

 /* Work done on this device AFTER the other one removed the entry is real work,
    and it wins. Losing it silently is the one outcome worse than a stale row. */
 const editedLater=[{id:"e3",busId:"b3",workflow:"Open",updatedAt:"2026-09-13T10:45:00.000Z"}];
 assert.equal(dropTombstonedEntries(editedLater,removedOnSender).entries.length,1,
  "an entry edited after the removal survives it");

 /* An OLD file, written before ledgers travelled, must still import. */
 const legacy=exportDownSheetPayload(sender,"2026-09-13T11:00:00.000Z");
 assert.equal("removedEntries" in legacy,false,"no removals means no key, so the file looks exactly as it always did");
 assert.equal(dropTombstonedEntries(merged,legacy.removedEntries).entries.length,3,"and it takes nothing away");

 /* The Defect Log half, same rules. */
 const buses=[{id:"b1",n:"17549",defects:[{id:"d1",updatedAt:"2026-09-13T08:00:00.000Z"},{id:"d2",updatedAt:"2026-09-13T08:00:00.000Z"}],pendingRepair:""}];
 const logPayload=exportDefectLogPayload(buses,"2026-09-13T11:00:00.000Z",{d2:"2026-09-13T09:00:00.000Z"});
 assert.deepEqual(logPayload.deleted,{d2:"2026-09-13T09:00:00.000Z"});
 const {buses:logMerged}=mergeDefectLog(buses.map(bus=>({...bus,defects:bus.defects.map(d=>({...d}))})),logPayload);
 const logAfter=dropTombstonedDefects(logMerged,logPayload.deleted);
 assert.equal(logAfter.buses[0].defects.length,1,"a defect the other device folded away is taken off here too");

 /* The FLEET MAP carries none, and must not start: a bus is moved, never
    removed, so a map import genuinely cannot take anything away. */
 assert.equal(TRANSFER_KINDS["fleet-map"].carriesRemovals,false);
 assert.equal(TRANSFER_KINDS["down-sheet"].carriesRemovals,true);
 assert.equal(TRANSFER_KINDS["defect-log"].carriesRemovals,true);

 /* ADOPTING what arrived. Without this the import undoes itself: the receiver
    drops the record, then its next cloud pull hands it straight back. */
 assert.deepEqual(adoptTombstones({a:"2026-09-13T10:00:00.000Z"},{b:"2026-09-13T11:00:00.000Z"}),
  {a:"2026-09-13T10:00:00.000Z",b:"2026-09-13T11:00:00.000Z"},"incoming tombstones join the ones already held");
 assert.deepEqual(adoptTombstones({a:"2026-09-13T10:00:00.000Z"},undefined),{a:"2026-09-13T10:00:00.000Z"},"a file with no ledger changes nothing");

 /* Each id keeps its OWN time rather than being stamped now, and where both
    sides name one, the EARLIER wins — the more conservative of the two, because
    a local record edited after that moment still out-dates it and survives. */
 assert.deepEqual(adoptTombstones({a:"2026-09-13T12:00:00.000Z"},{a:"2026-09-13T10:00:00.000Z"}),
  {a:"2026-09-13T10:00:00.000Z"},"the earlier removal time wins");
 assert.deepEqual(adoptTombstones({a:"2026-09-13T10:00:00.000Z"},{a:"2026-09-13T12:00:00.000Z"}),
  {a:"2026-09-13T10:00:00.000Z"},"and is kept when it is the one already held");
 assert.deepEqual(adoptTombstones({},{bad:"not a date"}),{},"an unreadable stamp is refused rather than stored");

 /* Bounded, for the same reason the ledger has always been: this app's storage
    is shared with a four-hundred-bus board that must never be what fails to save. */
 const oversized={};
 for(let index=0;index<REMOVED_ENTRY_LEDGER_LIMIT+50;index++)
  oversized["e"+index]=new Date(Date.UTC(2026,0,1)+index*1000).toISOString();
 const trimmed=trimTombstoneLedger(oversized);
 assert.equal(Object.keys(trimmed).length,REMOVED_ENTRY_LEDGER_LIMIT,"the ledger is held to its limit");
 assert.equal("e0" in trimmed,false,"oldest dropped first — an un-pushed tombstone is one of the newest");
 assert.ok("e"+(REMOVED_ENTRY_LEDGER_LIMIT+49) in trimmed,"and the newest is kept");
});

test("a deferred bus can be released from the drawer that lists it, and the badge moves without a reload", async () => {
  const storage = await readFile(new URL("../src/lib/storage/storage.ts", import.meta.url), "utf8");
  /* THE `storage` EVENT DOES NOT FIRE IN THE TAB THAT WROTE. That is the whole
     bug: defer a bus or end a deferral and the DEFERRED badge sat stale until
     its own sixty-second tick or a reload. Measured on the old code - the
     record read "open" while the badge still read 2 DEFERRED. */
  assert.match(storage,/export const RECORDS_WRITTEN_EVENT="pace-records-written"/);
  /* Announced from the two record writers, not from each caller: every writer
     in the app already goes through them, and a caller that forgot is exactly
     how this goes stale again. */
  assert.match(storage,/storage\.setItem\(FLEET_STORAGE_KEY,serializeFleetPayload\(buses,current\.envelope\)\);announceWrite\(FLEET_STORAGE_KEY\);return OK/);
  assert.match(storage,/storage\.setItem\(DOWN_SHEET_STORAGE_KEY,serializeDownSheetPayload\(entries,current\.envelope\)\);announceWrite\(DOWN_SHEET_STORAGE_KEY\);return OK/);
  /* Only after a write that SUCCEEDED - a refused write changed nothing and
     must not make a listener re-read as though it had. Both announcements sit
     inside the try, ahead of the return, never in the catch. */
  assert.doesNotMatch(storage,/catch\(error\)\{[^}]*announceWrite/);
  /* And it must not throw on a server render, where there is no window. */
  assert.match(storage,/function announceWrite\(key:string\)\{\n if\(typeof window==="undefined"/);

  const watch = await readFile(new URL("../src/components/shared/deferred-watch.tsx", import.meta.url), "utf8");
  assert.match(watch,/window\.addEventListener\(RECORDS_WRITTEN_EVENT,recompute\)/,"the badge listens for it");
  assert.match(watch,/window\.removeEventListener\(RECORDS_WRITTEN_EVENT,recompute\)/,"and stops listening when it unmounts");

  const page = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
  /* The drawer listed held buses and offered no way out of the state: the only
     END DEFERRAL was inside an expanded feed card, which means finding the bus
     again in the feed you had just filtered away from. */
  assert.match(page,/className="end-deferral" onClick=\{\(\)=>endDeferralForBus\(bus,defects\)\}/);
  assert.match(page,/const endDeferralForBus=\(bus:DefectLogFleetBus,deferred:StructuredDefect\[\]\)=>\{/);
  /* IT RELEASES EVERY DEFERRED REPAIR ON THE BUS. The drawer is one card per
     BUS and a deferral is per DEFECT, so a bus held on two repairs would come
     straight back to the drawer and look like the button had not worked. */
  assert.match(page,/for\(const defect of deferred\)\{/);
  assert.match(page,/nextFleet=result\.fleet;nextDown=result\.downEntries;/,"each save threads into the next");
  /* ONE snapshot, taken before anything moves. Calling the single-record
     handler in a loop would snapshot the already-changed board on the second
     pass, and UNDO would then only reach the last repair. */
  /* Sliced to this handler's OWN closing brace rather than to whatever happens
     to be declared after it. The end anchor used to be the next handler along,
     which meant a new one landing in between silently widened the region and
     failed this on its snapshot rather than on anything wrong here. */
  const start=page.indexOf("const endDeferralForBus=");
  const body=page.slice(start,page.indexOf("\n };",start));
  assert.equal((body.match(/setUndoSnapshot/g)||[]).length,1,"exactly one undo snapshot for the whole release");
  assert.equal((body.match(/persist\(/g)||[]).length,1,"and one write at the end");
  assert.ok(body.indexOf("setUndoSnapshot")>body.indexOf("for(const defect of deferred)"),"snapshot is of the fleet as it was, taken from the closure not the fold");
  assert.match(body,/if\(result\.error\)\{alert\([^)]*\);return\}/,"a refused save stops the release rather than writing a half-done board");

  const css = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
  /* Three slots, so the two buttons stay the same size as each other whatever
     the timer reads - and on a phone the timer takes its own line, because
     three things across 360px put END DEFERRAL under 90px. */
  assert.match(css,/\.quick-filter-deferred-row\{display:grid;grid-template-columns:auto minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/\.quick-filter-deferred-row>small\{grid-column:1\/-1\}/);
  assert.match(css,/\.quick-filter-deferred-row \.end-deferral,\.quick-filter-deferred-row \.mystery-move\{min-height:44px/);
});

test("the location under a bus number is the control that moves it on the map", async () => {
  const page = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");

  /* THE BUS COLUMN HAD TO COME OUT OF THE CARD'S EXPAND BUTTON. An interactive
     control nested in a button is invalid markup, and every tap on it would
     have been eaten by the card's own expand handler. */
  assert.match(page,/<div className="log-bus-column">/);
  const header=page.slice(page.indexOf('<button className="log-card-main log-group-header"'),page.indexOf('</button>',page.indexOf("log-meta")));
  assert.ok(!header.includes("log-location"),"the control must not sit inside the expand button");
  assert.ok(!header.includes('className="log-bus"'),"and neither must the column it lives in");
  assert.match(css,/\.log-card-group\{display:grid;grid-template-columns:82px minmax\(0,1fr\)/,"the card is the grid the header used to be");
  assert.match(css,/\.log-card-group>\.grouped-defect-list,\.log-card-group>\.log-focus-row\{grid-column:1\/-1\}/);

  /* IT IS NOT A SELECT, and that was measured rather than preferred. A native
     select cannot wrap and this column is 72px on a phone: bound to the
     location, 13 of the labels locationLabel() could then produce were cut off at
     390 - Main Garage needed 49px against 38px of room, Foreman Office 59px.
     The label keeps its own type and its freedom to wrap; the whole of it is
     the target, and the editor it opens has the room the column does not. */
  assert.doesNotMatch(page,/<select[^>]*moveBusLocation/,"a select here truncates the fact the line exists to carry");
  assert.match(page,/<button className="log-location" type="button" onClick=\{\(\)=>setMovingMysteryBusId\(group\.bus\.id\)\}/);
  assert.match(page,/<em>\{locationLabel\(group\.bus\.l\)\}<\/em><i aria-hidden="true">▾<\/i>/);
  assert.match(page,/aria-label=\{"Facility location for bus "\+group\.bus\.n\+": "\+locationLabel\(group\.bus\.l\)\+"\. Move this bus\."\}/,"a screen reader gets the location and what pressing does");
  assert.match(css,/\.log-location>em\{[^}]*overflow-wrap:anywhere\}/,"the label may still wrap, which is why it is not truncated");

  /* Touch targets to this project's own standard: 44-ish on phones, 26 above.
     Measured 40px at 360/390/430 and 26px at 820, 1180 and 1280. */
  assert.match(css,/\.log-location\{[^}]*min-height:26px/);
  assert.match(css,/\.log-location\{min-height:40px;padding:4px 2px\}/);

  /* It opens the editor this page ALREADY opens from the deferred drawer, so
     there is one move form on this page rather than two that drift - and that
     one writes through moveMysteryBus, which leaves the modal open on a
     refused write instead of reporting a move that did not happen. Driven:
     road-1 to body-0 with the bus keeping its defect, its down flag and its
     Down Sheet membership; then a refused write left the board byte-identical
     with the modal still open. */
  assert.match(page,/\{movingMysteryBus&&<MysteryMoveModal bus=\{movingMysteryBus\} fleet=\{fleet\} move=\{moveMysteryBus\}/);
  assert.equal((page.match(/<MysteryMoveModal /g)||[]).length,1,"one move form on this page, not two");
  assert.match(page,/if\(!writeFleetStorage\(localStorage,result\.fleet\)\)return false/,"a refused write reports false and the modal stays open");
});

test("a device transfer does not carry one person's holds onto everybody's board",async()=>{
 /* The cloud is not the only way a record travels. Transfers are how one
    device SEEDS another in this shop, so a hold riding an export would put bay
    12's instructions on every board by the back door — the same outcome the
    cloud change was made to prevent. The receiver's OWN hold has to survive the
    import too: being told to hold a bus is not undone by somebody sending you
    their board. */
 const {exportFleetMapPayload,mergeFleetMap}=await import("../src/lib/storage/section-transfer.ts");
 const now="2026-09-11T12:00:00.000Z";
 const senderHold={at:"2026-09-11T09:00:00.000Z",by:"RM"};
 const theirs=[{id:"a1",n:"18505",l:"garage-3",s:"service",defects:[],pendingRepair:"",hold:senderHold}];
 const payload=exportFleetMapPayload(theirs,now);
 assert.equal("hold" in payload.buses[0],false,"the export strips it");

 /* Receiver holds a DIFFERENT bus, and has none on the bus being sent. */
 const mineHold={at:"2026-09-11T11:00:00.000Z",by:"CT"};
 const mine=[{id:"b1",n:"18505",l:"road-1",s:"service",defects:[],pendingRepair:"",hold:mineHold}];
 const {buses}=mergeFleetMap(mine,payload);
 assert.deepEqual(buses[0].hold,mineHold,"the receiver's own hold survives the import untouched");
 assert.equal(buses[0].l,"garage-3","while the location it WAS sent still arrives");
});

test("a hold rides MASTER EXPORT but never a share",async()=>{
 /* Raised in review as a hole: the hold is stripped from the cloud and from a
    section transfer, but MASTER EXPORT carries it. That is the intended
    behaviour and the distinction is the point, so it is pinned here rather
    than left to the next reader's judgement.

    SHARING one person's instruction with everybody is what Curtis ruled out:
    "If someone is asked to hold a bus (like bay 12 guy) then they should know.
    It doesn't need to show up on everybody's screen." The Shop Cloud and a
    section transfer both do that, so both are gated.

    MASTER EXPORT is a device CLONE, not a share. It already carries the board,
    Down Sheet and Defect Log settings, parts memory and findings memory —
    every one per-device and never synced — and MASTER IMPORT is the one import
    that REPLACES rather than merges. A foreman on a new phone should arrive
    with the holds he was told about. */
 const now="2026-09-11T12:00:00.000Z";
 const hold={at:"2026-09-11T09:00:00.000Z",by:"CT"};
 const bus={id:"b1",n:"18505",l:"garage-3",s:"service",defects:[],pendingRepair:"",hold};

 /* The two shares drop it. */
 const {exportFleetMapPayload}=await import("../src/lib/storage/section-transfer.ts");
 assert.equal("hold" in exportFleetMapPayload([bus],now).buses[0],false,"a section transfer is a share");
 const {busRow}=await import("../src/lib/cloud/cloud-sync.ts");
 assert.equal("hold" in busRow(bus,{initials:"CT",deviceLabel:"shop"},now).map_fields,false,"the Shop Cloud is a share");

 /* The clone keeps it — asserted on the payload builder, which passes `buses`
    through verbatim, and on the absence of any filter being added later. */
 const source=await readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8");
 assert.match(source,/payload=\{kind:"pace-south-fleet-board-backup",version:5,exportedAt:exportedAt\.toISOString\(\),buses,/,
  "MASTER EXPORT passes the buses through unfiltered, holds included");
 /* Checked against the CODE, not the comments: the comment below deliberately
    names MAP_EXCLUDED to explain why it is not used here, and the first cut of
    this assertion matched its own explanation. */
 const code=source.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.equal(/MAP_EXCLUDED|MAP_HELD_BACK|omit\(/.test(code),false,
  "no filter has been added here — if one is, this distinction was broken by accident");
 assert.match(source,/THIS FILE CARRIES A BUS'S `hold` AND THAT IS DELIBERATE/,
  "and the reason is written where somebody would come to change it");
});

test("the sheet ledger keeps the tempo the app used to throw away",async()=>{
 const {SHEET_LEDGER_KEY,SHEET_LEDGER_LIMIT,appendSnapshot,ledgerTempo,normalizeSheetLedger,
  recordSheetSwap,snapshotFromEntries}=await import("../src/lib/down-sheet/sheet-ledger.ts");

 /* THE PROBLEM THIS EXISTS FOR: a scanned sheet REPLACES the live one and
    nothing retained the sheet before that, so sheet-to-sheet tempo had never
    once been recorded — on a shop that swaps eight or more sheets a fortnight.
    Curtis: "When downsheets are swapped out, there is a tempo to what gets
    repaired." */
 assert.equal(SHEET_LEDGER_KEY,"pace-sheet-ledger-v1");
 assert.equal(SHEET_LEDGER_LIMIT,40);

 const entry=(busId,category,over={})=>({id:"e"+busId,busId,category,workflow:"Scheduled",...over});
 const day=(d,h=8)=>`2026-09-${String(d).padStart(2,"0")}T${String(h).padStart(2,"0")}:00:00.000Z`;

 /* Only bus and category are kept. The wording, the mechanic, the estimate and
    the history are on the live record and none of them is a tempo question. */
 const first=snapshotFromEntries([entry("b1","A/C and HVAC"),entry("b2","Brakes")],[],day(1));
 assert.deepEqual(first.rows,[{b:"b1",c:"A/C and HVAC"},{b:"b2",c:"Brakes"}]);

 /* A CLOSED ROW IS NOT ON THE SHEET. Counting one would report work as stuck
    that somebody had finished. */
 assert.deepEqual(snapshotFromEntries([entry("b1","Brakes"),entry("b9","Engine",{workflow:"Completed"})],[],day(1)).rows,
  [{b:"b1",c:"Brakes"}]);
 /* ONE ROW PER BUS. A merge or a half-finished edit can leave two entries on
    one bus, and counting it twice overstates every tempo number it appears in. */
 assert.deepEqual(snapshotFromEntries([entry("b1","Brakes"),entry("b1","Engine")],[],day(1)).rows,
  [{b:"b1",c:"Brakes"}]);

 /* The shift is resolved ONCE and stored rather than recomputed later from
    `at`: if somebody edits the shift hours in six weeks, the tempo of a swap
    that already happened must not move to a different crew. */
 assert.equal(snapshotFromEntries([],[],"2026-09-14T18:00:00").shift,"2nd");

 const ledger=[
  snapshotFromEntries([entry("b1","A/C and HVAC"),entry("b2","Brakes"),entry("b3","Engine")],[],day(1)),
  /* b2 cleared, b4 added, b1 and b3 stuck. */
  snapshotFromEntries([entry("b1","A/C and HVAC"),entry("b3","Engine"),entry("b4","Doors, Ramp and ADA")],["b2"],day(3)),
 ].reduce((acc,snapshot)=>appendSnapshot(acc,snapshot),[]);

 const tempo=ledgerTempo(ledger);
 /* N snapshots yield N-1 tempos. The first is a photograph of a sheet, not a
    measurement of a change — reporting it as "3 added" would put a spike at the
    start of every fresh ledger. */
 assert.equal(tempo.length,1);
 assert.equal(tempo[0].added,1);
 assert.equal(tempo[0].cleared,1);
 assert.equal(tempo[0].stuck,2);
 assert.equal(tempo[0].sinceHours,48);
 assert.deepEqual(tempo[0].addedBy,{"Doors, Ramp and ADA":1});
 assert.deepEqual(tempo[0].clearedBy,{Brakes:1});
 /* The divergence Curtis described — "AC repairs and Check engine lights tend
    to stay on the longest" — is a statement about these tallies, and cannot be
    checked without them. */
 assert.deepEqual(tempo[0].stuckBy,{"A/C and HVAC":1,Engine:1});

 /* `off` can name a bus the previous snapshot never held: a backfilled gap, or
    a row removed by hand between swaps. Counting it would credit the shift with
    clearing work it never had. */
 const phantom=appendSnapshot(ledger,snapshotFromEntries([entry("b1","A/C and HVAC")],["b3","b99"],day(5)));
 const after=ledgerTempo(phantom);
 assert.equal(after[1].cleared,1,"only the bus that was actually there counts as cleared");

 /* A rescan of the same photograph would otherwise land twice and report zero
    added and zero cleared — which reads as a quiet shift, not as a duplicate. */
 const twice=appendSnapshot(ledger,ledger[1]);
 assert.equal(twice.length,2,"the same swap does not land again");

 /* Sorted OLDEST FIRST so a backfilled swap from two weeks ago lands in its own
    place rather than at the end. Curtis has the photographs for eight sheets
    the app never kept. */
 const backfilled=appendSnapshot(ledger,snapshotFromEntries([entry("b7","Engine")],[],day(2,6)));
 assert.deepEqual(backfilled.map(s=>s.at.slice(0,10)),["2026-09-01","2026-09-02","2026-09-03"]);

 /* THE CAP DROPS THE OLDEST. Dropping the newest to make room gives a ledger
    that never learns anything after its fortieth swap — the failure a naive
    `if(length>=LIMIT)return` produces, and very hard to see from outside. */
 let big=[];
 for(let n=1;n<=45;n++)big=appendSnapshot(big,snapshotFromEntries([entry("b"+n,"Engine")],[],day(1,n%24)+"#"+n,undefined,"s"+n),5);
 assert.equal(big.length,5);
 assert.deepEqual(big.map(s=>s.id),["s41","s42","s43","s44","s45"],"the newest five survive");

 assert.deepEqual(normalizeSheetLedger(null),[]);
 assert.deepEqual(normalizeSheetLedger([{at:"nonsense",rows:[]},{rows:[]},{at:day(1)}]),[],
  "a snapshot with no usable time or no rows is not a snapshot");

 /* BEST EFFORT, and that is the whole contract: this runs from the middle of a
    sheet import, and failing the import because a history file could not be
    written would cost a foreman the sheet he just photographed. */
 const store=(()=>{let value=null;return {getItem:()=>value,setItem:(_k,v)=>{value=v}}})();
 const wrote=recordSheetSwap(store,[entry("b1","Brakes")],[],day(1));
 assert.equal(wrote.ok,true);
 assert.equal(JSON.parse(store.getItem()).length,1);
 const full={getItem:()=>"[]",setItem:()=>{throw new Error("QuotaExceeded")}};
 assert.equal(recordSheetSwap(full,[entry("b1","Brakes")],[],day(1)).ok,false,
  "a full device reports the failure rather than throwing into the import");

 /* TWO DEVICES, ONE HISTORY. Curtis: "I will be scanning from multiple devices,
    period." Device-local, each phone would hold only the swaps IT performed —
    two half-histories, and a forecast built on either would read half the
    shop's tempo as all of it.

    Merging is safe here in a way it is NOT for the fleet or the sheet: a swap
    is an EVENT that happened once, on one device. Two devices never perform the
    same swap — one scans the paper, the other receives the resulting sheet
    through the cloud and performs none. So there is nothing to reconcile and
    the union IS the history. Same shape as the road-call events. */
 const {mergeSheetLedgers}=await import("../src/lib/down-sheet/sheet-ledger.ts");
 const mine=[snapshotFromEntries([entry("b1","Brakes")],[],day(1),undefined,"a1"),
             snapshotFromEntries([entry("b2","Engine")],[],day(3),undefined,"a2")];
 const theirs=[snapshotFromEntries([entry("b3","A/C and HVAC")],[],day(2),undefined,"b1"),
               snapshotFromEntries([entry("b4","Doors, Ramp and ADA")],[],day(4),undefined,"b2")];
 const both=mergeSheetLedgers(mine,theirs);
 assert.deepEqual(both.map(s=>s.id),["a1","b1","a2","b2"],"interleaved by time, not appended");
 /* Importing the same file twice must not double-count. */
 assert.deepEqual(mergeSheetLedgers(both,theirs).map(s=>s.id),["a1","b1","a2","b2"]);
 assert.deepEqual(mergeSheetLedgers(mine,null).map(s=>s.id),["a1","a2"],"a device that has never scanned takes nothing away");
 /* A merged pair can exceed the cap, and the swaps worth keeping are recent. */
 assert.deepEqual(mergeSheetLedgers(mine,theirs,2).map(s=>s.id),["a2","b2"]);

 /* IDS ARE UNIQUE ACROSS DEVICES now that ledgers travel. Two phones scanning
    different sheets in the same millisecond with the same row count would
    otherwise mint the same id, and the merge would drop one as a duplicate. */
 const twin=()=>snapshotFromEntries([entry("b1","Brakes")],[],day(1)).id;
 assert.notEqual(twin(),twin(),"two swaps built from identical inputs still get different ids");

 /* MASTER IMPORT MERGES THIS ONE KEY. Everything else in a whole-app restore is
    STATE and is meant to be overwritten; the ledger is HISTORY, and restoring a
    phone onto the iPad must not throw away the swaps the iPad recorded itself. */
 const restore=await readFile(new URL("../src/lib/storage/fleet-restore.ts",import.meta.url),"utf8");
 const restoreCode=restore.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.match(restoreCode,/mergeSheetLedgers\(readSheetLedger\(storage\),backup\.sheetLedger\)/,
  "the swap history is merged into what this device already holds");
 assert.equal(/put\(SHEET_LEDGER_KEY/.test(restoreCode),false,
  "and never goes through the plain replace every other key uses");
 const backup=await readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8");
 assert.match(backup,/sheetLedger:readSavedValue\(storage,SHEET_LEDGER_KEY\)/,"and a master export carries it");

 /* THE FILE FORMAT ROUND-TRIP, which is the part that actually has to hold: a
    field that survives in memory and is dropped by the envelope or the reader
    would lose the history silently, on the one path built to move it between
    devices. Written, serialised, and read back through the app's own reader. */
 const {exportDownSheetPayload,readTransferPayload}=await import("../src/lib/storage/section-transfer.ts");
 const written=exportDownSheetPayload([{id:"e1",busId:"b1"}],day(5),{},mine);
 const reread=readTransferPayload(JSON.stringify(written),"down-sheet");
 assert.equal(reread.ok,true,"a Down Sheet transfer carrying a ledger still reads as one");
 assert.deepEqual((reread.payload.ledger||[]).map(row=>row.id),["a1","a2"],
  "and the swaps come back through the envelope intact");
 assert.deepEqual(mergeSheetLedgers(theirs,reread.payload.ledger).map(row=>row.id),
  ["a1","b1","a2","b2"],"so the receiving device ends with both halves of the history");
 /* Omitted rather than written as [] when there is nothing to say, so a file
    from a device that has never scanned does not assert an empty history. */
 assert.equal("ledger" in exportDownSheetPayload([],day(5),{},[]),false);
 assert.equal("ledger" in exportDownSheetPayload([],day(5),{}),false);

 /* WIRED AT THE CHOKEPOINT every sheet swap crosses, not on the scanner — a
    route that forgot to call it would silently stop recording and the ledger
    would look healthy while going stale. */
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 const pageCode=page.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 /* By fleet NUMBER, falling back to the id. A bus id is one device's own, so a
    swap that travelled shared no keys with the receiving device's swaps. */
 assert.match(pageCode,/recordSheetSwap\(localStorage,nextEntries,removed\.map\(entry=>entry\.busNumber\|\|entry\.busId\),now,readShiftSettings\(localStorage\)\)/,
  "the swap is recorded inside importScan, from the entries that won and the buses that came off");
 /* AFTER the undo copy and deliberately NOT guarded like it. The undo copy
    stops the import when it cannot be written, because replacing a sheet with
    no way back is a one-way door. The ledger is the opposite trade. */
 assert.ok(pageCode.indexOf("SCAN_UNDO_KEY")<pageCode.indexOf("recordSheetSwap("),
  "the undo copy is secured before the ledger is touched");
 assert.equal(/if\(!recordSheetSwap\(|recordSheetSwap\([^)]*\)\.ok\)\s*\{[^}]*return/.test(pageCode),false,
  "and a ledger failure never stops the import");
});
