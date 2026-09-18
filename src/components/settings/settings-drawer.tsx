"use client";

/* THE SECOND LEVEL OF THE SETTINGS PAGE.

   The five sections (MASTER, FACILITY MAP, DOWN SHEET, DEFECT LOG, FIXED
   REPAIRS) were already collapsible. The problem was what happened after you
   opened one: thirty groups across the five panels, every one of them drawn
   wide open and flat. Curtis: "Its a lot and i do mean a LOT!! ... The goal
   here is to make the settings section very digestible and easy to navigate."

   So every group is a drawer now, and drawers start closed. WORDING in
   particular — a grid of free-text boxes for renaming titles — was sitting
   open on both the Down Sheet and the Defect Log; he called that one out by
   name.

   WHY THE ACCORDION IS WIDTH-AWARE. Curtis: "Accordion, but keep in mind the
   design for the bigger screen and the PC." One-at-a-time is right on a phone,
   where a second open drawer means scrolling past it to reach anything else.
   It is a straitjacket on a shop computer, where there is room for two and
   comparing COLORS against TEXT STYLE is a real thing to want. So the rule
   follows the screen: strict accordion under 620px, free above it, where the
   drawers also lay out two-up (see .settings-drawers in settings.css).

   The default is the PHONE rule, deliberately. Server-rendered HTML has no
   width to read, and matchMedia cannot run until the browser does. Defaulting
   to the strict rule means the first paint is correct on the device where
   being wrong actually costs something; the desktop relaxes a tick later, and
   because every drawer starts closed there is nothing on screen to flicker. */

import {createContext,useCallback,useContext,useEffect,useId,useMemo,useState,type ReactNode} from "react";

/* The phone breakpoint, matching @media(max-width:620px) in the stylesheets.
   Written once here so the JS rule and the CSS rule cannot drift apart. */
export const PHONE_QUERY="(max-width:620px)";

export function useIsPhone(){
 const [phone,setPhone]=useState(true);
 useEffect(()=>{
  if(typeof window.matchMedia!=="function")return;
  const query=window.matchMedia(PHONE_QUERY);
  const apply=()=>setPhone(query.matches);
  apply();
  /* addEventListener on MediaQueryList is the modern spelling; Safari below
     14 only has addListener. The app runs on shop iPads that are not always
     current, so both are wired rather than assuming. */
  if(typeof query.addEventListener==="function"){
   query.addEventListener("change",apply);
   return ()=>query.removeEventListener("change",apply);
  }
  query.addListener(apply);
  return ()=>query.removeListener(apply);
 },[]);
 return phone;
}

type DrawerContext={open:(id:string)=>boolean;toggle:(id:string)=>void};
const Drawers=createContext<DrawerContext|null>(null);

/* One accordion group. Every SettingsDrawer inside it shares this state, so
   opening one on a phone closes its siblings and nothing else on the page. */
export function SettingsDrawers({children,className}:{children:ReactNode;className?:string}){
 const phone=useIsPhone();
 const [openIds,setOpenIds]=useState<readonly string[]>([]);
 const toggle=useCallback((id:string)=>{
  setOpenIds(current=>{
   const isOpen=current.includes(id);
   if(isOpen)return current.filter(value=>value!==id);
   /* The width rule, and the only place it is applied. On a phone the new
      drawer REPLACES whatever was open; on a wide screen it joins it. */
   return phone?[id]:[...current,id];
  });
 },[phone]);
 /* Narrowing the screen while two drawers are open would otherwise leave a
    phone showing a state it can no longer reach. Keep the first and drop the
    rest, rather than closing everything and losing the person's place. */
 useEffect(()=>{
  if(phone)setOpenIds(current=>current.length>1?current.slice(0,1):current);
 },[phone]);
 const value=useMemo<DrawerContext>(()=>({open:id=>openIds.includes(id),toggle}),[openIds,toggle]);
 return <Drawers.Provider value={value}>
  <div className={"settings-drawers"+(className?" "+className:"")}>{children}</div>
 </Drawers.Provider>;
}

/* One drawer. `note` is the one-line "what is in here" that lets somebody skip
   a drawer without opening it — the whole point of closing them by default is
   lost if you have to open all five to find the one you wanted. */
export function SettingsDrawer({title,note,children}:{title:string;note?:string;children:ReactNode}){
 const context=useContext(Drawers);
 const id=useId();
 if(!context)throw new Error("SettingsDrawer must be inside SettingsDrawers");
 const open=context.open(id);
 return <section className={"settings-drawer"+(open?" open":" closed")}>
  {/* The heading WRAPS the button rather than sitting inside it: a <button>
      may only contain phrasing content, so an <h3> in there is invalid and
      screen readers stop reporting it as a heading. Same shape as
      .settings-section-head one level up. */}
  <h3 className="settings-drawer-head">
   <button type="button" className="settings-drawer-toggle" aria-expanded={open} aria-controls={id+"-body"} onClick={()=>context.toggle(id)}>
    <span className="settings-drawer-title">{title}</span>
    {note&&<span className="settings-drawer-note">{note}</span>}
    <span className="settings-drawer-chevron" aria-hidden="true">&#9662;</span>
   </button>
  </h3>
  <div id={id+"-body"} className="settings-drawer-body" hidden={!open}>{children}</div>
 </section>;
}
