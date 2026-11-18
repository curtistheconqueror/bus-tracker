// Manual browser regression fixture. Uses the production inline script with
// synthetic storage on an isolated loopback origin; no fleet data or services.
// Open /setup?delay=700 then GO. HEAD succeeds but destination GET never does.
// After fallback, CLICK MAP must work. Repeat with delay=4000: map must load
// without ever starting destination GET. Server logs show readiness/GET order.
import http from 'node:http';
import {resumeScriptText,RESUME_CONFIG} from '../../src/lib/settings/last-page.ts';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/defect-log'){
  console.log(req.method+' destination');
  if(req.method==='HEAD'){res.writeHead(200);res.end()}
  return;
 }
 if(url.pathname==='/setup'){
  const delay=Math.min(10000,Math.max(0,Number(url.searchParams.get('delay'))||700));
  res.setHeader('Content-Type','text/html');
  res.end(`<h1>Resume regression setup</h1><p>Script delay ${delay}ms; destination stalls.</p><script>sessionStorage.clear();localStorage.clear();localStorage.setItem('delay','${delay}');localStorage.setItem('${RESUME_CONFIG.key}',JSON.stringify({path:'/defect-log',at:new Date().toISOString(),version:1}));</script><a href='/' rel='noreferrer'>GO</a>`);return;
 }
 if(url.pathname==='/map.js'){
  const delay=Math.min(10000,Math.max(0,Number(url.searchParams.get('delay'))||700));
  setTimeout(()=>{res.setHeader('Content-Type','application/javascript');res.end(`document.getElementById('map').textContent='MAP READY';document.getElementById('click').onclick=function(){this.textContent='MAP WORKS'};window['${RESUME_CONFIG.ready}']=true;window.dispatchEvent(new Event('${RESUME_CONFIG.ready}'));`);console.log('map script delivered')},delay);return;
 }
 res.setHeader('Content-Type','text/html');
 res.end(`<!doctype html><html><body><script>Object.defineProperty(navigator,'standalone',{value:true});</script><script>${resumeScriptText()}</script><h1 id='map'>MAP LOADING</h1><button id='click'>CLICK MAP</button><script>var s=document.createElement('script');s.src='/map.js?delay='+localStorage.getItem('delay');document.body.appendChild(s);</script></body></html>`);
});
server.listen(5198,'127.0.0.1',()=>console.log('http://127.0.0.1:5198/setup?delay=700'));
