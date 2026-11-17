/* The script that reopens the app where it was left. The rule, and the script
   itself, are in src/lib/settings/last-page.ts; this only puts it on the page.

   NOT A CLIENT COMPONENT, and it must not become one. It is drawn on the
   server as a plain <script>, so it runs while the page is still being read -
   before the map is drawn and before any of the app's own code has loaded. An
   effect would run after both: the map would be on screen, and usable, for as
   long as its code took to start, and then be taken away.

   The first thing <body> actually holds: HeaderThemeLive, ahead of it in the
   layout, draws nothing. */

import {resumeScriptText} from "@/src/lib/settings/last-page";

export default function ResumeLastPage(){
 return <script dangerouslySetInnerHTML={{__html:resumeScriptText()}}/>;
}
