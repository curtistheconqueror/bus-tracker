"use client";

/* THE SCREEN THAT REPLACES A WHITE ONE.

   Curtis, from the floor: "if I touch a bus and hold it down without letting
   it go the entire screen goes white. On a browser, I'm able to still refresh
   by pulling the screen down. But when you bookmark it, there's no way to
   refresh, and it's just stuck."

   That second sentence is the whole reason this file exists. A render error in
   React unmounts the entire tree — the app does not misbehave, it VANISHES,
   and the body is left empty and white. In a browser tab that is recoverable:
   there is an address bar, a reload button, pull-to-refresh. Saved to a home
   screen in standalone mode there is NONE of that. No chrome, no gesture, no
   way back in. The app is bricked until iOS decides to kill the process, and
   a foreman standing at a bus has no idea why.

   So every render error now lands here instead: a plain screen that says what
   happened and carries the one control the standalone app cannot otherwise
   offer — a button that reloads it.

   THIS DOES NOT FIX ANY BUG. It is the floor under all of them. The specific
   crash Curtis hit was `bus.isHeld(bus)` — an imported helper called as a
   method on the bus record, so `undefined(bus)` threw the moment a quick view
   opened, on hover at a desk and on touch in the garage. That is fixed in the
   code. What this guarantees is that the NEXT one, which nobody has found yet,
   costs a tap rather than a shift.

   A class component, because componentDidCatch has no hook equivalent — this
   is the one place React still requires one. Deliberately imports nothing: a
   boundary that depends on the app's own modules can be taken down by the same
   bad module it was meant to catch. Its styles are inline for the same reason,
   since a stylesheet that failed to load is itself a way to arrive here. */

import {Component,type ErrorInfo,type ReactNode} from "react";

/* Kept alongside the board's own recovery keys rather than invented here, so
   the list in CLAUDE.md stays the one place every key is written down. */
export const CRASH_STORAGE_KEY="pace-crash-report-v1";

type CrashState={crashed:boolean;message:string};

const SHELL:React.CSSProperties={minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#06275c",color:"#fff",fontFamily:"Arial,Helvetica,sans-serif",textAlign:"center"};
const CARD:React.CSSProperties={maxWidth:"420px",display:"grid",gap:"14px"};
const TITLE:React.CSSProperties={margin:0,fontSize:"22px",fontWeight:900,letterSpacing:".02em"};
const BODY:React.CSSProperties={margin:0,fontSize:"15px",lineHeight:1.5,color:"#d6e2f7"};
const NOTE:React.CSSProperties={margin:0,fontSize:"12px",lineHeight:1.5,color:"#9db4da"};
const BUTTON:React.CSSProperties={minHeight:"52px",border:0,borderRadius:"8px",background:"#fff",color:"#06275c",fontSize:"16px",fontWeight:900,letterSpacing:".04em",cursor:"pointer",padding:"0 20px"};
const DETAIL:React.CSSProperties={margin:0,fontSize:"11px",fontFamily:"ui-monospace,Menlo,Consolas,monospace",color:"#7f9ac9",wordBreak:"break-word"};

export default class CrashGuard extends Component<{children:ReactNode},CrashState>{
 state:CrashState={crashed:false,message:""};

 static getDerivedStateFromError(error:unknown):CrashState{
  return {crashed:true,message:error instanceof Error?error.message:String(error??"")};
 }

 componentDidCatch(error:unknown,info:ErrorInfo){
  /* Written down because the person who hits this is in a garage and the
     person who can read it is not. There is no console to check on a phone in
     standalone mode, and no crash reporter in an offline-first app. One record,
     overwritten each time — it is a breadcrumb for the next session, not a log.

     Wrapped because a device with full storage throws on setItem, and throwing
     inside the handler that exists to survive a throw would be absurd. */
  try{
   localStorage.setItem(CRASH_STORAGE_KEY,JSON.stringify({
    at:new Date().toISOString(),
    message:error instanceof Error?error.message:String(error??""),
    stack:(error instanceof Error?error.stack:"")?.slice(0,2000)||"",
    component:info?.componentStack?.slice(0,2000)||"",
    url:typeof location==="undefined"?"":location.pathname,
   }));
  }catch{}
 }

 /* location.reload rather than the app's own REFRESH button, which asks the
    service worker for an update first. That path imports app code and awaits a
    network call; this one has to work when the app is the thing that is
    broken, so it does the least possible. */
 reload=()=>{try{location.reload()}catch{}};

 render(){
  if(!this.state.crashed)return this.props.children;
  return <div style={SHELL} role="alert">
   <div style={CARD}>
    <h1 style={TITLE}>FLEETSTEP STOPPED</h1>
    <p style={BODY}>Something on this screen failed and the app had to stop drawing it. <b>Nothing on this device was lost</b> — the board, the Down Sheet and the Defect Log are all still saved here.</p>
    <button type="button" style={BUTTON} onClick={this.reload}>RELOAD THE APP</button>
    <p style={NOTE}>If it stops again on the same screen, tell Curtis what you were doing right before it happened.</p>
    {this.state.message&&<p style={DETAIL}>{this.state.message}</p>}
   </div>
  </div>;
 }
}
