import type {FeedWindowKey} from "./feed-window.ts";
import type {TimeWindowKey} from "../shared/time-window.ts";

/* THE DEFECT LOG'S TOOLS, ONCE ADVANCED ACTIONS WAS ONLY ABOUT SCANNING.

   Release 210. Curtis, on the panel that held eight controls: *"just make this
   whole section about scanning ... take out AI operator and cleanup ... just
   make this section just 3 drop-down options."* The three sheets come from
   `src/lib/scan/paper-kinds.ts`, so nothing here names one. What used to share
   the panel went to three places, and the rules for two of them live here
   rather than in the page, where neither a test nor the MCP route could reach
   them. */

/* THE SHARE ICON OVER THE FEED opens the DEFECTS LOGGED share that already
   existed, behind QUICK FILTERS. Curtis: *"the share functionality that we have
   already, it's a bit hard to find ... I want it relocated so I can see it
   easier."* It opens on the window ALL ▾ is showing, so the list he is looking
   at and the list he sends start from the same stretch of time.

   THE TWO LISTS ARE NOT THE SAME LIST and this does not pretend they are. The
   feed's windows (`feed-window.ts`) and the share's chips (`time-window.ts`)
   were built for different questions; four of the feed's eight have a chip of
   the same span and open on it. The rest return null, which means "the
   drawer's own default", and that default is a rule older than this file:
   DEFECTS LOGGED opens on THIS SHIFT, because on ALL it is every bus in the
   fleet carrying an open defect - the opposite of the handover list it exists
   to be. So ALL over the feed does NOT open the share on ALL; the ALL chip is
   one tap away in the drawer. PREVIOUS SHIFT, TODAY and 30 DAYS have no chip
   of their own and also take the default, rather than a chip that would send
   a different stretch of time under a heading that names it. THIS SHIFT maps
   to SHIFT only where the screen can draw a SHIFT chip; the caller says. */
const SAME_SPAN:Partial<Record<FeedWindowKey,TimeWindowKey>>={shift:"shift","24h":"24h","3d":"3d","7d":"7d"};
export function shareWindowForFeed(feed:FeedWindowKey,shiftOffered:boolean):TimeWindowKey|null{
 const match=SAME_SPAN[feed];
 if(!match||(match==="shift"&&!shiftOffered))return null;
 return match;
}

/* SCAN BATCHES AND CLEAN UP MOVED TO SETTINGS, and they still run on the
   Defect Log, because both act on what that page holds in memory: the board it
   saves and its undo. Settings links here with `?tool=`, the page does the one
   thing asked, and takes the parameter off the address so a reload does not do
   it twice - the way `?scan=` and the quick-filter parameter already behave. */
export const LOG_TOOL_PARAM="tool";
export const LOG_TOOLS=["scan-batches","clean-up"] as const;
export type LogTool=typeof LOG_TOOLS[number];
export function logToolHref(tool:LogTool):string{return "/defect-log?"+LOG_TOOL_PARAM+"="+tool}
export function logToolFromSearch(search:string):LogTool|null{
 let value:string|null;
 try{value=new URLSearchParams(search).get(LOG_TOOL_PARAM)}catch{return null}
 return (LOG_TOOLS as readonly string[]).includes(value||"")?value as LogTool:null;
}
