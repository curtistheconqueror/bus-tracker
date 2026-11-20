// Manual browser regression fixture. Uses the production inline script with
// synthetic storage on an isolated loopback origin; no fleet data or services.
//
//   node tests/fixtures/resume-navigation-server.mjs
//
// Open /setup?delay=700 then GO. HEAD succeeds but destination GET never does.
// After fallback, CLICK MAP must work. Repeat with delay=4000: map must load
// without ever starting destination GET. Server logs show readiness/GET order.
//
// THE MAP'S SCRIPT RUNS THE APP'S OWN `watchPage`, not a copy of what it does.
// It set the ready flag by hand at first, the moment the script arrived, while
// the app sent it from a two-second timer - so "a 700 ms script resumes" was
// true here and false in the app, where it never resumed. The page's code is
// now written out from the module's own functions, and tests/settings.test.mjs
// runs what is written out. The list of functions below is by hand: one added
// to the module and used by these would have to be added here too, and the
// page would stop with a ReferenceError in the console until it was.
//
// Two delays, because they are two different slow things:
//   delay    how long the map's script takes to ARRIVE     (slow wifi; the
//            first launch after a release, before the worker holds the files)
//   hydrate  how long after arriving it takes to DRAW      (a slow phone)
// e.g. /setup?delay=550&hydrate=1500 . Past 2500 ms in total the map is shown
// and kept, with the page still remembered.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import * as lastPage from '../../src/lib/settings/last-page.ts';
const {resumeScriptText,RESUME_CONFIG,LAST_PAGE_KEY,PAGE_SETTLE_MS}=lastPage;

/* The app's remembering half as a browser can run it: the module's constants,
   then its functions as written. Node has already taken the types out. */
export function watchPageSource(){
 const names=['pagePath','rememberPage','pageMemory','signalPageReady','clearPageReady','watchPage'];
 return 'var RESUME_CONFIG='+JSON.stringify(RESUME_CONFIG)+',LAST_PAGE_KEY='+JSON.stringify(LAST_PAGE_KEY)+',PAGE_SETTLE_MS='+PAGE_SETTLE_MS+';\n'
  +names.map(name=>lastPage[name].toString()).join('\n');
}
/* What /map.js sends: the map says it is there, then is "drawn" after
   `hydrate` ms, which is when the app's own code would run watchPage. */
export function mapScript(hydrate){
 return watchPageSource()+`
document.getElementById('map').textContent='MAP ARRIVED';
setTimeout(function(){
 document.getElementById('map').textContent='MAP READY';
 document.getElementById('click').onclick=function(){this.textContent='MAP WORKS'};
 watchPage(window);
},${hydrate});`;
}
const clamp=value=>Math.min(10000,Math.max(0,Number(value)||0));

export function createServer(){
 return http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/defect-log'){
   console.log(req.method+' destination');
   if(req.method==='HEAD'){res.writeHead(200);res.end()}
   return;
  }
  if(url.pathname==='/setup'){
   const delay=url.searchParams.has('delay')?clamp(url.searchParams.get('delay')):700;
   const hydrate=clamp(url.searchParams.get('hydrate'));
   res.setHeader('Content-Type','text/html');
   res.end(`<h1>Resume regression setup</h1><p>Script arrives after ${delay}ms and draws ${hydrate}ms later; destination stalls.</p><script>sessionStorage.clear();localStorage.clear();localStorage.setItem('delay','${delay}');localStorage.setItem('hydrate','${hydrate}');localStorage.setItem('${RESUME_CONFIG.key}',JSON.stringify({path:'/defect-log',at:new Date().toISOString(),version:1}));</script><a href='/' rel='noreferrer'>GO</a>`);return;
  }
  if(url.pathname==='/map.js'){
   const delay=clamp(url.searchParams.get('delay'));
   const hydrate=clamp(url.searchParams.get('hydrate'));
   setTimeout(()=>{res.setHeader('Content-Type','application/javascript');res.end(mapScript(hydrate));console.log('map script delivered')},delay);return;
  }
  res.setHeader('Content-Type','text/html');
  res.end(`<!doctype html><html><body><script>Object.defineProperty(navigator,'standalone',{value:true});</script><script>${resumeScriptText()}</script><h1 id='map'>MAP LOADING</h1><button id='click'>CLICK MAP</button><script>var s=document.createElement('script');s.src='/map.js?delay='+localStorage.getItem('delay')+'&hydrate='+localStorage.getItem('hydrate');document.body.appendChild(s);</script></body></html>`);
 });
}
/* Only when run, not when a test imports it. */
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
 createServer().listen(5198,'127.0.0.1',()=>console.log('http://127.0.0.1:5198/setup?delay=700'));
