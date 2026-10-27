"use client";

/* Paints the app's header colour onto whichever surface is open.

   Mounted once in the root layout rather than eight times, because the point
   of the setting is that there is ONE place the colour comes from.

   EVERY HEADER RULE READS `--app-header-fill` WITH A FALLBACK, and on the
   five pages with no theme that fallback is the APP'S DEFAULT rather than
   that page's old colour. It was the old literal first, on the reasoning that
   a render before this effect should look like the app did — and measured,
   that is a FLASH: this runs in an effect, so the browser has already painted
   the server's HTML. On Incidents the header came up rust and turned navy
   37ms later on a warm desktop, and Shop Talk came up green. Both of those
   pages are MEANT to be navy now, so the honest fallback is the colour the
   page is going to settle on; measured again, 0ms.

   The Facility Map, the Defect Log and Fixed Repairs fall back to their own
   page variable instead, which React writes inline — so a themed device lands
   on its theme's colour rather than on navy. NOT "correct with no
   JavaScript": the server render cannot read LocalStorage, so that inline
   value is the DEFAULT theme's until the page hydrates. Those three therefore
   take one step like everybody else. They took TWO while they also set
   `--app-header-fill` inline — default, then this component's answer, then
   their own — with the middle one on screen for 370ms on the map. Two writers
   of one property is two paints; there is one writer now, and it is here.

   IT WRITES NO RECORD. It reads the setting and paints: three custom
   properties on <html> — `--app-header`, `--app-header-fill` and
   `--app-header-text` — and the `content` of <meta name="theme-color">, which
   is the phone's own status bar. Those are DOM writes and the distinction
   that matters is the other one: it never writes storage, so Settings stays
   the only writer of the key. (This paragraph said "writes nothing… two
   custom properties" while doing four things, which is the kind of comment
   that is worse than none.)

   It follows the route rather than taking a prop, because the alternative is
   threading the same value through eight pages that have nothing else in
   common — and a page that forgot to thread it would silently keep its old
   hard-coded colour, which is the bug this whole change exists to remove. */

import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {DEFAULT_HEADER_THEME,HEADER_THEME_KEY,type HeaderSurface,headerColorFor,headerGradient,headerTextFor,loadHeaderTheme,resolveHeaderColor} from "@/src/lib/settings/header-theme";
import {BOARD_SETTINGS_KEY,LOG_SETTINGS_KEY,loadPageHeaderThemes} from "@/src/lib/settings/page-header-themes";

/* The nav's own paths. `/` is last because every path starts with it. */
const ROUTES:[string,HeaderSurface][]=[
 ["/down-sheet","down"],["/defect-log","log"],["/fixed-repairs","fixed"],
 ["/lists","lists"],["/incidents","incidents"],["/shop-talk","talk"],["/settings","settings"],["/","map"],
];
export function surfaceForPath(path:string):HeaderSurface{
 return ROUTES.find(([prefix])=>path===prefix||path.startsWith(prefix+"/"))?.[1]||"map";
}

export default function HeaderThemeLive(){
 const path=usePathname()||"/";
 useEffect(()=>{
  const apply=()=>{
   const root=document.documentElement;
   let theme,pages;
   try{theme=loadHeaderTheme(localStorage);pages=loadPageHeaderThemes(localStorage)}catch{return}
   const surface=surfaceForPath(path);
   /* Through the same ladder the three themed pages resolve through, so this
      and the page agree. They would not otherwise: a device on Tactical draws
      an olive header from its own inline value while everything keyed off
      <html> — and the phone's status bar below — stayed navy. */
   const colour=resolveHeaderColor(theme,surface,pages[surface]);
   root.style.setProperty("--app-header",colour);
   root.style.setProperty("--app-header-fill",headerGradient(colour));
   /* Computed, never stored: a light colour chosen for flare would otherwise
      put white on white and take the page title with it. */
   root.style.setProperty("--app-header-text",headerTextFor(colour));
   /* AND THE PHONE'S OWN BAR ABOVE IT. Saved to a home screen, the strip of
      OS chrome above the header is painted from <meta name="theme-color">,
      which `app/layout.tsx` declares once at build time and cannot change.
      Left alone it stays the old #06275c on a header that is now #041d47 by
      default and anything at all after that — the status bar in one navy and
      the header in another, touching, which is the exact species of subtle
      mismatch this whole change is about. Set here because this is where the
      colour is known. */
   const tag=document.querySelector('meta[name="theme-color"]');
   if(tag)tag.setAttribute("content",colour);
  };
  apply();
  /* Settings is its own route, so a change made there has already repainted
     this by the time another surface is opened — but a second tab on the shop
     computer has not, and `storage` fires only in the OTHER tabs. The
     same-tab path is the CustomEvent, which Settings dispatches. */
  /* The two page-theme keys are listened for as well, because a theme picked
     on one tab changes what this resolves to just as surely as the header key
     does. Same-tab, a page's own appearance panel writes its key without an
     event: the page repaints its own header from its own state, so what lags
     until the next navigation is the status bar, not the header. */
  const WATCHED=[HEADER_THEME_KEY,BOARD_SETTINGS_KEY,LOG_SETTINGS_KEY];
  const fromAnotherTab=(event:StorageEvent)=>{if(event.key&&WATCHED.includes(event.key))apply()};
  window.addEventListener("storage",fromAnotherTab);
  window.addEventListener(HEADER_THEME_KEY,apply);
  return()=>{
   window.removeEventListener("storage",fromAnotherTab);
   window.removeEventListener(HEADER_THEME_KEY,apply);
  };
 },[path]);
 return null;
}

/* For the two surfaces whose header colour also drives other things.

   The Defect Log's `--log-header` paints its header bar AND its ADVANCED
   drawer, its focus panel and a dozen other pieces; Fixed Repairs' does the
   same. Pointing only their header BAR at `--app-header` would split them from
   everything keyed to follow them — undoing the release that made the drawer
   open in the colour of the button that opens it. So these two feed the shared
   colour into their OWN variable instead, and everything downstream follows
   without a single rule changing.

   `pageTheme` is the second rung of the ladder in header-theme.ts: a page
   passes its OWN theme's header colour when that theme is not the default,
   and gets it back unless an override has been typed for this surface. So a
   device on Tactical keeps a whole Tactical page, a device on the default
   theme — which is every device that has not opened these panels — matches
   the other five, and Settings can still force either. */
export function useHeaderColor(surface:HeaderSurface,pageTheme?:string){
 const [colour,setColour]=useState(()=>headerColorFor(DEFAULT_HEADER_THEME,surface));
 useEffect(()=>{
  const read=()=>{
   try{setColour(resolveHeaderColor(loadHeaderTheme(localStorage),surface,pageTheme))}catch{}
  };
  read();
  const fromAnotherTab=(event:StorageEvent)=>{if(event.key===HEADER_THEME_KEY)read()};
  window.addEventListener("storage",fromAnotherTab);
  window.addEventListener(HEADER_THEME_KEY,read);
  return()=>{
   window.removeEventListener("storage",fromAnotherTab);
   window.removeEventListener(HEADER_THEME_KEY,read);
  };
  /* pageTheme is in the deps on purpose: switching this page's theme has to
     repaint its header on the spot, and it changes without the header key
     being written at all, so neither listener above would ever fire. */
 },[surface,pageTheme]);
 return {color:colour,text:headerTextFor(colour),fill:headerGradient(colour)};
}
