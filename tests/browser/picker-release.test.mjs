/* Explicit production-loopback gate; run separately from the Node unit suite.
   Uses an existing Playwright install through PLAYWRIGHT_MODULE. Synthetic
   records only. This is not a physical iPhone keyboard test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PICKER_BASE_URL||'http://127.0.0.1:5197';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Loopback only');
let browser;
test.before(async()=>{browser=await pw[process.env.PICKER_ENGINE||'chromium'].launch({headless:true,executablePath:process.env.PICKER_BROWSER_EXECUTABLE||undefined});});
test.after(async()=>{await browser?.close();});
const stamp=new Date().toISOString();
const buses=['17507','18505','175070','20500'].map((n,i)=>({id:'fixture-'+n,n,l:'garage-'+(i+1),s:'service',defects:[],parkedAt:stamp,lastLocationChangeAt:stamp,lastStatusChangeAt:stamp}));
const entry={id:'existing-fixture',busId:buses[0].id,busNumber:'17507',category:'Brakes',repair:'Brake chamber leak',customReason:'Original repair',assignmentType:'Mechanic',assignedTo:'',section:'Pending',shift:'1st',workflow:'Scheduled',operationalStatus:'out',priority:'Routine',createdAt:stamp,updatedAt:stamp,updatedBy:'CT',completedAt:'',history:[{at:stamp,initials:'CT',action:'created'}]};
async function open(route,{touch=false,existing=false,originalEntry=entry,boardSearch=''}={}){
 const context=await browser.newContext({viewport:{width:touch?390:1180,height:1000},hasTouch:touch,serviceWorkers:'block'});
 context.setDefaultTimeout(7000);
 await context.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(!['127.0.0.1','localhost'].includes(u.hostname)||r.request().method()!=='GET')return r.abort();
  /* Vinext's Windows preview returns 404 for emitted assets. Sites serves
     these exact files through its ASSETS binding; reproduce that contract
     without changing the build or the SSR response under test. */
  if(u.pathname.startsWith('/assets/')){
   const body=await readFile(new URL('../../dist/client'+u.pathname,import.meta.url));
   return r.fulfill({status:200,contentType:u.pathname.endsWith('.css')?'text/css':'application/javascript',body});
  }
  return r.continue();
 });
 await context.addInitScript(({buses,entry,existing})=>{
  localStorage.setItem('pace-board-v1',JSON.stringify({kind:'buses',version:4,buses}));
  localStorage.setItem('pace-down-sheet-v1',JSON.stringify({kind:'entries',version:1,entries:existing?[entry]:[]}));
  localStorage.setItem('pace-defect-log-settings-v1',JSON.stringify({requireInitials:false,defaultInitials:'ZZ'}));
  localStorage.setItem('pace-down-sheet-settings-v1',JSON.stringify({defaultInitials:'',defaultShift:'1st'}));
 },{buses,entry:originalEntry,existing});
 const page=await context.newPage();
 await page.goto(base+route);
 if(boardSearch){
  /* An observed client state transition, rather than SSR controls existing,
     proves hydration is complete before typing into the background filter. */
  await page.getByRole('button',{name:/LOG DEFECT/}).click();
  await page.locator('.log-form').waitFor();
  await page.locator('.log-form').getByRole('button',{name:'CLOSE',exact:true}).click();
  await page.locator('.log-form').waitFor({state:'hidden'});
  await page.getByRole('textbox',{name:'SEARCH',exact:true}).fill(boardSearch);
 }
  await page.getByRole('button',{name:route==='/down-sheet'?/ADD DOWN BUS/:/LOG DEFECT/}).click();
 const form=page.locator(route==='/down-sheet'?'.repair-editor':'.log-form');
 await form.waitFor();
 return {page,context,form};
}
const field=(form,name)=>form.getByRole('combobox',{name:new RegExp(name)}).and(form.locator('input.combo-input'));
async function bus(form,n){const b=field(form,'BUS');await b.click();await b.fill(n);if(!(await b.inputValue()).startsWith('Bus ')){await b.press('ArrowDown');await b.press('Enter');}return b;}

for(const route of ['/defect-log','/down-sheet'])test(route+': category hands hardware typing to symptom; explicit keyboard clear works',async()=>{
 const {page,context,form}=await open(route);
 try{
  const selectedBus=await bus(form,'18505');
  assert.equal(await selectedBus.evaluate(el=>el===document.activeElement),true);
  await selectedBus.press('Tab');
  assert.match(await selectedBus.inputValue(),/18505/);
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('combo-clear')),false);
  const c=field(form,route==='/defect-log'?'DEFECT CATEGORY':'CATEGORY');
  await c.click();await c.fill('engine');
  await form.locator('.combo-list .combo-option').first().click();
  const symptom=field(form,route==='/defect-log'?'SPECIFIC DEFECT':'SPECIFIC REPAIR');
  await page.waitForFunction(()=>document.activeElement?.closest('label')?.textContent?.includes('SPECIFIC'));
  assert.equal(await form.locator('.combo-group').count(),0,'Engine opens directly into its repairs');
  await page.waitForFunction(()=>document.querySelectorAll('.combo-option').length>10);
  assert.equal(await form.locator('datalist').count(),0);
  assert.equal(await form.locator('.bus-combo .combo-input').count(),1);
  assert.equal(await symptom.getAttribute('readonly'),'');
  assert.match(await c.inputValue(),/Engine/);
  await page.keyboard.type('tr');
  assert.equal(await symptom.inputValue(),'tr');
  assert.match(await c.inputValue(),/Engine/);
  await symptom.fill('misfire');await symptom.press('Enter');
  assert.match(await symptom.inputValue(),/misfire/i);
  await symptom.focus();await symptom.press('Control+Backspace');
  assert.equal(await symptom.inputValue(),'');
  assert.match(await c.inputValue(),/Engine/);
 }finally{await context.close();}
});

test('bus cancellation restores a valid choice; unresolved input cannot persist on the Down Sheet',async()=>{
 const {page,context,form}=await open('/down-sheet');
 try{
  const b=await bus(form,'18505');
  await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  const before=await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1'));
  await b.click();await b.fill('1');await b.press('Backspace');await b.press('Escape');
  assert.match(await b.inputValue(),/18505/);
  for(const raw of ['abc','x18505','185','17507','999']){
   await b.click();await b.fill(raw);await b.press('Enter');
   let dialog='';page.once('dialog',async d=>{dialog=d.message();await d.dismiss();});
   await form.getByRole('button',{name:/SAVE/}).last().click();
   assert.match(dialog,/Select a bus number/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1')),before);
  }
 }finally{await context.close();}
});

test('touch browse first, second tap types numeric; LIST and choice release focus',async()=>{
 const {page,context,form}=await open('/defect-log',{touch:true});
 try{
  const b=field(form,'BUS');await b.tap();
  assert.equal(await b.getAttribute('readonly'),'');
  assert.equal(await b.evaluate(el=>el===document.activeElement),false);
  await b.tap();
  assert.equal(await b.getAttribute('inputmode'),'numeric');
  assert.equal(await b.evaluate(el=>el===document.activeElement),true);
  await form.getByRole('button',{name:'LIST BUS choices'}).tap();
  assert.equal(await b.evaluate(el=>el===document.activeElement),false);
  await form.getByRole('button',{name:'TYPE BUS',exact:true}).tap();
  await page.waitForTimeout(1100);await b.fill('18505');
  assert.match(await b.inputValue(),/18505/);
  assert.equal(await b.evaluate(el=>el===document.activeElement),false);
 }finally{await context.close();}
});

test('ADD TO THAT ENTRY preserves drafted cards, initials, original repair and one persisted entry',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true});
 try{
  await bus(form,'17507');
  const c=field(form,'CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
  const symptom=field(form,'SPECIFIC REPAIR');await page.keyboard.type('misfire');await symptom.press('Enter');
  await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  await page.waitForFunction(()=>document.activeElement?.matches('.repair-item-fields input.combo-input'));
  assert.equal(await form.locator('.repair-item-card').count(),3);
  const choices=await form.locator('input.combo-input').evaluateAll(xs=>xs.map(x=>x.value));
  assert.ok(choices.some(value=>/Brake chamber leak/.test(value)));
  assert.ok(choices.some(value=>/misfire/i.test(value)));
  assert.equal(await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).inputValue(),'ZZ');
  await form.getByRole('button',{name:'SAVE UPDATE',exact:true}).click();
  await form.waitFor({state:'hidden'});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries[0]?.updatedBy==='ZZ');
  const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries);
  assert.equal(entries.length,1);assert.equal(entries[0].id,entry.id);assert.equal(entries[0].updatedBy,'ZZ');
  assert.equal(entries[0].repairItems.length,2);
  assert.ok(entries[0].repairItems.some(r=>r.repair==='Brake chamber leak'));
  assert.ok(entries[0].repairItems.some(r=>/misfire/i.test(r.repair)));
 }finally{await context.close();}
});

test('cleared initials remain empty and changed tracker status requires explicit discard confirmation',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true});
 try{
  await bus(form,'17507');
  const initials=form.getByLabel('UPDATED BY - INITIALS',{exact:false});
  await initials.fill('ZZ');await initials.fill('');
  await form.getByLabel('BUS STATUS ON TRACKER',{exact:false}).selectOption('unknown');
  let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss();});
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  assert.match(message,/bus status/);
  assert.equal(await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).count(),1,'cancel keeps the new draft');
  assert.equal(await form.getByLabel('BUS STATUS ON TRACKER',{exact:false}).inputValue(),'unknown');
  page.once('dialog',d=>d.accept());
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  await page.waitForFunction(()=>document.activeElement?.matches('.repair-item-fields input.combo-input'));
  assert.equal(await initials.inputValue(),'','never substitute the previous author');
  assert.equal(await form.getByLabel('BUS STATUS ON TRACKER',{exact:false}).inputValue(),'out');
 }finally{await context.close();}
});

test('duplicate repair confirmation can cancel without losing the draft',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true,originalEntry:{...entry,category:'Engine',repair:'Misfire'}});
 try{
  await bus(form,'17507');
  const c=field(form,'CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
  const symptom=field(form,'SPECIFIC REPAIR');await page.keyboard.type('misfire');await symptom.press('Enter');
  let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss();});
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  assert.match(message,/Keep both copies/);
  assert.match(await symptom.inputValue(),/Misfire/);
  assert.equal(await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).count(),1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries);
  assert.equal(saved.length,1);assert.equal(saved[0].updatedBy,'CT');
 }finally{await context.close();}
});

test('ArrowUp starts at the last match and transient bus edits preserve the board filter',async()=>{
 const {page,context,form}=await open('/defect-log',{boardSearch:'18505'});
 try{
  const b=await bus(form,'18505');await b.click();await b.fill('1');
  assert.equal(await page.locator('.log-search-wrap input').inputValue(),'18505');
  await b.press('ArrowUp');
  const last=form.locator('.bus-combo .combo-row').last();
  assert.equal(await b.getAttribute('aria-activedescendant'),await last.getAttribute('id'));
  await b.press('Enter');
  assert.match(await b.inputValue(),/18505/);
 }finally{await context.close();}
});

test('finished draft sign-off cannot disappear without an explicit keep-existing confirmation',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true});
 try{
  await bus(form,'17507');
  const c=field(form,'CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
  const symptom=field(form,'SPECIFIC REPAIR');await page.keyboard.type('misfire');await symptom.press('Enter');
  await form.getByLabel('MARK THIS REPAIR FINISHED',{exact:false}).check();
  await form.getByLabel('FIXED BY',{exact:false}).fill('ZZ');
  let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss();});
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  assert.match(message,/FIXED BY completion sign-off/);
  assert.equal(await form.getByLabel('FIXED BY',{exact:false}).inputValue(),'ZZ');
  assert.match(await symptom.inputValue(),/Misfire/);
  assert.equal(await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).count(),1);
 }finally{await context.close();}
});

test('a refused sheet write keeps the transferred repair draft and initials open',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true});
 try{
  await bus(form,'17507');
  const c=field(form,'CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
  const symptom=field(form,'SPECIFIC REPAIR');await page.keyboard.type('misfire');await symptom.press('Enter');
  await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  await form.getByRole('button',{name:'ADD TO THAT ENTRY'}).click();
  await page.waitForFunction(()=>document.activeElement?.matches('.repair-item-fields input.combo-input'));
  const before=await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1'));
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='pace-down-sheet-v1')throw new DOMException('Fixture quota refusal','QuotaExceededError');return original.call(this,key,value);};
  });
  let message='';page.once('dialog',async d=>{message=d.message();await d.dismiss();});
  await form.getByRole('button',{name:'SAVE UPDATE',exact:true}).click();
  assert.match(message,/Down Sheet was NOT SAVED/);
  assert.equal(await form.isVisible(),true);
  assert.equal(await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).inputValue(),'ZZ');
  assert.equal(await form.locator('.repair-item-card').count(),3);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1')),before);
 }finally{await context.close();}
});

test('refused inline MARK FIXED never announces a successful save',async()=>{
 const {page,context,form}=await open('/down-sheet',{existing:true});
 try{
  await form.getByRole('button',{name:'CANCEL',exact:true}).click();
  const before=await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1'));
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='pace-down-sheet-v1')throw new DOMException('Fixture quota refusal','QuotaExceededError');return original.call(this,key,value);};
  });
  const messages=[];
  page.on('dialog',async d=>{messages.push(d.message());if(d.type()==='confirm')await d.accept();else await d.dismiss();});
  await page.getByRole('button',{name:'Mark fixed: bus 17507',exact:true}).click();
  assert.ok(messages.some(message=>/Down Sheet was NOT SAVED/.test(message)));
  assert.ok(messages.every(message=>!/draft remains open/.test(message)));
  assert.equal(await page.evaluate(()=>localStorage.getItem('pace-down-sheet-v1')),before);
  assert.equal(await page.getByRole('button',{name:'UNDO',exact:true}).count(),0);
  assert.equal(await page.getByText(/was marked fixed and closed out/).count(),0);
  const persisted=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  await context.addInitScript(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},persisted);
  await page.reload();
  await page.getByRole('button',{name:'RESTORE BEFORE ATTEMPT',exact:true}).waitFor();
  assert.equal(await page.getByText(/was marked fixed and closed out/).count(),0);
  const recoveryKey=await page.evaluate(()=>Object.keys(localStorage).find(key=>{try{const v=JSON.parse(localStorage.getItem(key));return v?.kind==='fixed'&&v?.pending===true}catch{return false}}));
  assert.ok(recoveryKey);
  const recovery=await page.evaluate(key=>localStorage.getItem(key),recoveryKey);
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   window.fixtureOriginalSet=original;
   Storage.prototype.setItem=function(key,value){if(key==='pace-board-v1')throw new DOMException('Fixture fleet refusal','QuotaExceededError');return original.call(this,key,value);};
  });
  await page.getByRole('button',{name:'RESTORE BEFORE ATTEMPT',exact:true}).click();
  assert.ok(messages.some(message=>/tracker was NOT RESTORED/.test(message)));
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),recovery);
  await page.evaluate(()=>{Storage.prototype.setItem=window.fixtureOriginalSet;});
  await page.getByRole('button',{name:'RESTORE BEFORE ATTEMPT',exact:true}).click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),null);

 }finally{await context.close();}
});

for(const route of ['/defect-log','/down-sheet'])test(route+': exact bus Enter confirms without saving; later Enter still works',async()=>{
 const {page,context,form}=await open(route);
 try{
  if(route==='/defect-log'){
   const c=field(form,'DEFECT CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
   const symptom=field(form,'SPECIFIC DEFECT');await page.keyboard.type('misfire');await symptom.press('Enter');
  }else await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  const before=await page.evaluate(()=>[localStorage.getItem('pace-board-v1'),localStorage.getItem('pace-down-sheet-v1')]);
  const b=await bus(form,'18505');await b.press('Enter');
  assert.equal(await form.isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('pace-board-v1'),localStorage.getItem('pace-down-sheet-v1')]),before);
  /* The guard does not disable the form's normal deliberate submission. */
  await page.waitForTimeout(2100);await b.press('Enter');
  await form.waitFor({state:'hidden'});
  const saved=await page.evaluate(()=>({buses:JSON.parse(localStorage.getItem('pace-board-v1')).buses,entries:JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries}));
  if(route==='/down-sheet')assert.equal(saved.entries.length,1);
  else assert.ok(saved.buses.find(bus=>bus.n==='18505').defects.some(d=>/misfire/i.test(d.issue)));
 }finally{await context.close()}
});
for(const route of ['/defect-log','/down-sheet'])test(route+': no-pointer coarse exact pick dismisses and mouse-to-touch row pick blurs',async()=>{
 const {page,context,form}=await open(route,{touch:true});
 try{
  assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);
  const b=field(form,'BUS');await b.focus();await b.fill('18505');
  assert.match(await b.inputValue(),/18505/);
  assert.equal(await b.evaluate(el=>el===document.activeElement),false);
  await b.click();await b.fill('185');
  assert.equal(await b.evaluate(el=>el===document.activeElement),true);
  await form.locator('.bus-combo .combo-option').filter({hasText:'18505'}).tap();
  assert.equal(await b.evaluate(el=>el===document.activeElement),false);
 }finally{await context.close()}
});


for(const route of ['/defect-log','/down-sheet'])test(route+': explicit Save remains available immediately after an exact bus pick',async()=>{
 const {page,context,form}=await open(route);
 try{
  if(route==='/defect-log'){
   const c=field(form,'DEFECT CATEGORY');await c.click();await c.fill('engine');await c.press('Enter');
   const symptom=field(form,'SPECIFIC DEFECT');await page.keyboard.type('misfire');await symptom.press('Enter');
  }else await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  await bus(form,'18505');
  await (route==='/defect-log'?page.locator('.save-log'):form.getByRole('button',{name:'SAVE UPDATE',exact:true})).click();
  await form.waitFor({state:'hidden'});
  const saved=await page.evaluate(()=>({buses:JSON.parse(localStorage.getItem('pace-board-v1')).buses,entries:JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries}));
  if(route==='/down-sheet')assert.equal(saved.entries.length,1);
  else assert.ok(saved.buses.find(bus=>bus.n==='18505').defects.some(d=>/misfire/i.test(d.issue)));
 }finally{await context.close()}
});

for(const count of [1,5])for(const mode of ['keyboard','mouse','touch','hybrid'])test(`${count} existing repairs / ${mode} handoff`,async()=>{
 const originals=Array.from({length:count},(_,i)=>({id:'old-'+i,category:'Brakes',repair:'Brake chamber leak',details:'Original '+i,estimateEnabled:false,timeEstimate:{},done:i%2===1}));
 const {page,context,form}=await open('/down-sheet',{touch:mode==='touch'||mode==='hybrid',existing:true,originalEntry:{...entry,completedBy:'CT',repairItems:originals}});
 try{
  await page.setViewportSize({width:mode==='touch'||mode==='hybrid'?390:1180,height:900});
  await bus(form,'17507');await form.getByLabel('UPDATED BY - INITIALS',{exact:false}).fill('ZZ');
  if(mode==='hybrid')await page.evaluate(()=>{
   const original=window.matchMedia.bind(window);
   window.matchMedia=query=>query==='(pointer: fine)'?{...original(query),matches:true}:original(query);
  });
  const button=form.getByRole('button',{name:'ADD TO THAT ENTRY'});
  if(mode==='keyboard'){await button.focus();await button.press('Enter')}
  else if(mode==='touch'||mode==='hybrid')await button.tap();else await button.click();
  await page.waitForFunction(()=>document.querySelectorAll('.repair-item-card').length>=2);
  const card=form.locator('.repair-item-card').last();
  const category=field(card,'CATEGORY');
  await page.waitForFunction(touch=>{
   const last=[...document.querySelectorAll('.repair-item-card')].at(-1);
   const input=last?.querySelector('.repair-item-fields input.combo-input');
   if(!input)return false;
   const r=input.getBoundingClientRect(),p=input.closest('.repair-form').getBoundingClientRect();
   return r.top>=p.top&&r.bottom<=p.bottom&&(touch?!last.contains(document.activeElement):document.activeElement===input);
  },mode==='touch');
  const measure=await category.evaluate(el=>{
   const active=document.activeElement,r=el.getBoundingClientRect(),p=el.closest('.repair-form').getBoundingClientRect();
   return {focusCategory:active===el,activeTag:active?.tagName,activeType:active?.getAttribute('type'),activeClass:active?.className,categoryTop:r.top,categoryBottom:r.bottom,portTop:p.top,portBottom:p.bottom,visible:r.top>=p.top&&r.bottom<=p.bottom,coarse:matchMedia('(pointer: coarse)').matches};
  });
  assert.equal(measure.visible,true);
  assert.equal(measure.focusCategory,mode!=='touch');
  if(mode==='touch')assert.notEqual(measure.activeTag,'INPUT');
  else{
   assert.equal(await category.getAttribute('readonly'),'','programmatic handoff cannot request a software keyboard');
   assert.equal(await category.getAttribute('inputmode'),'none');
  }
  await page.keyboard.press('Space');
  const afterSpace=await card.getByRole('checkbox',{name:/MARK THIS REPAIR FINISHED/}).isChecked();
  console.log(JSON.stringify({count,mode,...measure,newDoneAfterSpace:afterSpace}));
  assert.equal(afterSpace,false);
  await category.click();await category.fill('engine');await category.press('Enter');
  const symptom=field(card,'SPECIFIC REPAIR');await page.keyboard.type('misfire');await symptom.press('Enter');
  await form.getByRole('button',{name:'SAVE UPDATE',exact:true}).click();await form.waitFor({state:'hidden'});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pace-down-sheet-v1')).entries);
  assert.equal(saved.length,1);assert.equal(saved[0].updatedBy,'ZZ');assert.equal(saved[0].repairItems.length,count+1);
  for(const old of originals){const actual=saved[0].repairItems.find(r=>r.id===old.id);assert.ok(actual);assert.equal(actual.repair,old.repair);assert.equal(actual.details,old.details);assert.equal(Boolean(actual.done),old.done)}
  const added=saved[0].repairItems.find(r=>!r.id.startsWith('old-'));assert.match(added.repair,/misfire/i);assert.equal(Boolean(added.done),false);
 }finally{await context.close()}
});
