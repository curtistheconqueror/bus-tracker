import assert from "node:assert/strict";
import {spawn,spawnSync} from "node:child_process";
import {createServer} from "node:http";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {once} from "node:events";
import {test} from "node:test";
import postcss from "postcss";
import {TRACKER_PAGES} from "../src/lib/settings/tracker-pages.ts";
import {render} from "./helpers/setup.mjs";

const read=name=>readFile(new URL("../app/down-sheet/"+name,import.meta.url),"utf8");

test("the tablet override is bounded and the Down Sheet ships a closed disclosure after the existing actions",async()=>{
 const [source,component,response]=await Promise.all([
  read("down-sheet-tablet.css"),read("_components/tablet-pages.tsx"),render("/down-sheet"),
 ]);
 assert.equal(response.status,200);
 const html=await response.text(),header=html.match(/<header class="down-header">.*?<\/header>/s)?.[0];
 assert.ok(header);
 const refresh=header.indexOf("Refresh and check for app updates");
 const scan=header.indexOf("Scan: SCAN SHEET");
 const share=header.indexOf(">SHARE<");
 const pages=header.indexOf(">PAGES<");
 assert.ok(refresh>=0&&refresh<scan&&scan<share&&share<pages);
 assert.match(header,/down-tablet-pages-toggle"[^>]+aria-expanded="false"/);
 assert.doesNotMatch(header,/down-tablet-pages-panel/);
 const nodes=postcss.parse(source).nodes.filter(node=>node.type!=="comment");
 assert.equal(nodes.length,2);
 assert.equal(nodes[0].selector,".down-tablet-pages");
 assert.deepEqual(nodes[0].nodes.map(({prop,value})=>[prop,value]),[["display","none"]]);
 const media=nodes[1];
 assert.equal(media.name,"media");
 assert.equal(media.params,"(min-width:761px) and (max-width:1400px) and (min-height:600px) and (any-pointer:coarse)");
 assert.ok(component.includes(JSON.stringify(media.params)),"resize dismissal uses the same tablet query");
 const frame=media.nodes.find(node=>node.selector===".down-app > .sheet-wrap");
 assert.deepEqual(frame?.nodes.map(({prop,value})=>[prop,value]),[
  ["margin-block-start","18px"],["border","2px solid #000"],
 ]);
});

test("Chromium: the real Down Sheet replaces navigation only on tablets, without changing Scan or Share",{timeout:50000},async t=>{
 const candidates=process.env.CHROME_BIN?[process.env.CHROME_BIN]:["google-chrome","chromium","chromium-browser"];
 const chrome=candidates.find(bin=>spawnSync(bin,["--version"],{timeout:4000}).status===0);
 if(!chrome){
  assert.notEqual(process.env.GITHUB_ACTIONS,"true","CI requires Chrome for the Down Sheet tablet regression");
  t.skip("Chrome unavailable; set CHROME_BIN to run the tablet check");
  return;
 }
 const profile=await mkdtemp(join(tmpdir(),"fleet-tablet-browser-"));
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,"http://localhost").pathname;
   if(path.startsWith("/assets/")){
    const asset=await readFile(new URL("../dist/client"+path,import.meta.url));
    res.setHeader("Content-Type",path.endsWith(".css")?"text/css":"text/javascript");
    res.end(asset);
   }else if(path==="/down-sheet"||path==="/defect-log"){
    const response=await render(path);
    res.writeHead(response.status,{
     "Content-Type":"text/html",
     "Content-Security-Policy":"connect-src 'self'; worker-src 'none'; form-action 'none'",
    });
    res.end(await response.text());
   }else{res.writeHead(404);res.end()}
  }catch{res.writeHead(500);res.end()}
 });
 const browser=spawn(chrome,["--headless","--disable-gpu","--disable-dev-shm-usage","--disable-background-networking",
  "--no-first-run","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],
  {stdio:["ignore","ignore","pipe"]});
 let errors="",socket;
 browser.stderr.on("data",chunk=>{errors=(errors+chunk).slice(-1600)});
 const stopped=new Promise(resolve=>{browser.once("exit",resolve);browser.once("error",error=>{errors+=error.message;resolve()})});
 let seq=0;
 const requests=new Map();
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
  const id=++seq;
  const timer=setTimeout(()=>{
   requests.delete(id);
   reject(Error(method+" timed out: "+errors));
  },7000);
  requests.set(id,message=>{
   requests.delete(id);clearTimeout(timer);
   if(message.error)reject(Error(method+": "+message.error.message));
   else resolve(message.result);
  });
  socket.send(JSON.stringify({id,method,params,sessionId}));
 });
 try{
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const origin="http://127.0.0.1:"+server.address().port;
  const portFile=join(profile,"DevToolsActivePort");
  let endpoint;
  for(let i=0;i<120;i++){
   let data="";
   try{data=await readFile(portFile,"utf8")}catch(error){if(error.code!=="ENOENT")throw error}
   const [port,path]=data.trim().split("\n");
   if(/^\d+$/.test(port)&&path?.startsWith("/devtools/browser/")){
    endpoint="ws://127.0.0.1:"+port+path;
    break;
   }
   await new Promise(resolve=>setTimeout(resolve,75));
  }
  assert.ok(endpoint,"Chrome did not expose its loopback testing endpoint: "+errors);
  socket=new WebSocket(endpoint);
  await once(socket,"open",{signal:AbortSignal.timeout(7000)});
  socket.addEventListener("message",event=>{
   const message=JSON.parse(event.data);
   requests.get(message.id)?.(message);
  });
  const {targetId}=await send("Target.createTarget",{url:"about:blank"});
  const {sessionId}=await send("Target.attachToTarget",{targetId,flatten:true});
  const call=(method,params)=>send(method,params,sessionId);
  const evalPage=async expression=>{
   const outcome=await call("Runtime.evaluate",{expression,returnByValue:true});
   assert.ok(!outcome.exceptionDetails,outcome.exceptionDetails?.exception?.description);
   return outcome.result.value;
  };
  const wait=async expression=>{
   for(let i=0;i<60;i++){
    try{if(await evalPage(expression))return}
    catch(error){if(!/Cannot find context|Execution context was destroyed|Inspected target navigated/.test(error.message))throw error}
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   assert.fail("Timed out waiting for "+expression);
  };
  const viewport=async(width,height,touch)=>{
   await call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:touch});
   await call("Emulation.setTouchEmulationEnabled",{enabled:touch});
  };
  const openPage=async(path="/down-sheet")=>{
   await call("Page.navigate",{url:origin+path});
   await wait(`location.pathname===${JSON.stringify(path)} && !!document.querySelector(".tracker-mobile-shell")`);
  };
 const visible=selector=>`!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`;
  const pages=".down-tablet-pages-toggle",panel=".down-tablet-pages-panel",legacy=".down-header > nav[data-tracker-nav]",dock=".tracker-bottom-nav";
  const click=async selector=>{
   await evalPage(`{const button=document.querySelector(${JSON.stringify(selector)});button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));button.click()}`);
  };
  const chooseWelcomeMode=async mode=>{
   await wait(visible(".welcome-gate .welcome-"+mode));
   await click(".welcome-gate .welcome-"+mode);
   await wait(visible(".welcome-step-skip"));
   await click(".welcome-step-skip");
   await wait("!document.querySelector('.welcome-gate')");
  };
  await viewport(1024,768,true);
  await openPage();
  await chooseWelcomeMode("full");
  // CSS visibility reflects both the route scope and the interaction media query.
  assert.equal(await evalPage(visible(pages)),true);
  assert.equal(await evalPage(visible(legacy)),false);
  assert.equal(await evalPage(visible(dock)),false);
  assert.equal(await evalPage(visible(panel)),false);
  const verifyRows=async()=>{
   const [refresh,scan,share,pageButton]=await evalPage(`[...document.querySelectorAll(".down-header-actions > .app-refresh,.down-header-pair > button,.down-tablet-pages-toggle")].map(el=>{const {left,right,top,bottom}=el.getBoundingClientRect();return {left,right,top,bottom}})`);
   assert.ok(refresh.bottom<scan.top&&scan.top===share.top&&scan.right<share.left&&scan.bottom<pageButton.top);
   assert.deepEqual([refresh.left,refresh.right],[pageButton.left,pageButton.right]);
  };
  await verifyRows();
  const sheetY=await evalPage('document.querySelector(".sheet-wrap").getBoundingClientRect().top');
  await click(pages);
  assert.equal(await evalPage(visible(panel)),true);
  assert.equal(await evalPage('document.querySelector(".sheet-wrap").getBoundingClientRect().top'),sheetY,"Pages must not push the sheet down");
  assert.deepEqual(await evalPage(`[...document.querySelectorAll("${panel} a")].map(a=>a.getAttribute("href"))`),TRACKER_PAGES.map(page=>page.href));
  assert.equal(await evalPage(`document.querySelector('${panel} [aria-current=page]').getAttribute("href")`),"/down-sheet");
  const hit=await evalPage(`{
   const a=document.querySelector("${panel} a"),r=a.getBoundingClientRect();
   const x=r.left+r.width/2,y=r.top+r.height/2,stack=document.elementsFromPoint(x,y);
   ({ok:a.contains(stack[0]),rect:r.toJSON(),hit:stack.slice(0,5).map(e=>[e.tagName,e.className]),
     viewport:[innerWidth,innerHeight,visualViewport.width,visualViewport.height]})
  }`);
  assert.ok(hit.ok,"Pages must be tappable above the sheet controls: "+JSON.stringify(hit));
  await evalPage(`document.querySelector("${panel} a").focus()`);
  await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
  await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
  assert.equal(await evalPage(visible(panel)),false);
  assert.equal(await evalPage(`document.activeElement.matches("${pages}")`),true);
  await click(pages);
  await click(pages);
  assert.equal(await evalPage(visible(panel)),false,"a second tap closes Pages");
  await click(pages);
  await click(".down-header-pair button[aria-label]");
  assert.equal(await evalPage(visible(panel)),false);
  assert.equal(await evalPage(visible(".paper-modal")),true);
  assert.equal(await evalPage('document.querySelector(".paper-read").disabled'),true);
  assert.match(await evalPage('document.querySelector(".paper-pickers").textContent'),/TAKE PHOTO.*UPLOAD FILE/s);
  await click(".paper-actions button");
  await click(pages);
  await click(".down-header-pair button[aria-expanded]");
  assert.equal(await evalPage(visible(panel)),false);
  assert.equal(await evalPage(visible(".down-share-drawer")),true);
  await click(".down-header-pair button[aria-expanded]");
  // The oldest tablet width overlaps the shared mobile dock breakpoint.
  await viewport(768,1024,true);
  await verifyRows();
  assert.equal(await evalPage(visible(pages)),true);
  assert.equal(await evalPage(visible(dock)),false);
  await click(pages);
  for(const [width,height,touch] of [[390,844,true],[844,390,true],[1280,800,false],[700,1024,true],[1440,900,true]]){
   await viewport(width,height,touch);
   assert.equal(await evalPage(visible(pages)),false,`unexpected tablet UI at ${width}x${height}, touch=${touch}`);
   assert.equal(await evalPage(visible(legacy)),true);
   assert.equal(await evalPage(visible(dock)),width<=800);
  }
  await viewport(1024,768,true);
  assert.equal(await evalPage(visible(panel)),false,"an open menu cannot survive leaving the tablet layout");
  await openPage("/defect-log");
  assert.equal(await evalPage(visible(pages)),false);
  assert.equal(await evalPage(visible(".defect-log-app nav[data-tracker-nav]")),true);
  await openPage();
  await evalPage('window.dispatchEvent(new CustomEvent("pace-show-welcome"))');
  await chooseWelcomeMode("lite");
  await click(pages);
  assert.equal(await evalPage(visible(panel)),true);
  assert.deepEqual(await evalPage(`[...document.querySelectorAll("${panel} a")].map(a=>a.getAttribute("href"))`),TRACKER_PAGES.filter(page=>page.href!=="/lists").map(page=>page.href));
  assert.equal(await evalPage(visible(".down-header-pair button[aria-label]")),false);
 }finally{
  socket?.close();
  browser.kill();
  await stopped;
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  await rm(profile,{force:true,recursive:true,maxRetries:3});
 }
});
