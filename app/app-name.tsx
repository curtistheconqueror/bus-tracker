"use client";

/* The app's name, in one place.

   It is drawn in the top-left of all six page headers, above the kicker each
   one already carries. One shared piece rather than six copies for the same
   reason `tracker-nav.tsx` is one shared piece: five copies of the nav drifted
   until the Facility Map called itself something the other pages did not, and
   a name is exactly the string that must never disagree with itself.

   The value is also what `public/manifest.webmanifest` puts under a phone's
   home-screen icon. Those two have to say the same thing or one app has two
   names on one device — so if this changes, change the manifest with it.

   FLEETSTEP is the third name this has had and is still provisional; Curtis is
   settling it later. Changing it is this one line, the manifest, and the two
   titles in layout.tsx — nothing else in the app spells it. */

import {useAppMode,WELCOME_REQUEST_EVENT} from "./welcome-gate";

export const APP_NAME="FLEETSTEP";


/* "Behind the name it will say LITE" — Curtis. It rides with the name rather
   than sitting somewhere else on the page, so a device in Lite says so on every
   screen without a banner of its own, and nobody wonders why a control they
   were shown yesterday is missing today. */

/* THE NAME OPENS THE HOME SCREEN, and the home screen is the welcome screen.

   This was wired to `/` first, and `/` is the Facility Map — so tapping the name
   took you to a page rather than to the screen Curtis meant. He said it twice
   and the second time said exactly which screen: "I like the design and how you
   have the name show up on the screen, but I still can't access it by touching
   the top. That's what I want... I need to be able to see it whenever I want to.
   And the proper design is by touching the title on each and every page takes
   you back to the home screen."

   That screen already exists — it is what a new device is greeted by — and
   every one of the six pages already renders it, so the name only has to ask
   for it. It asks with the same event Settings' SHOW IT uses, so there is one
   way to open that screen rather than two that can drift apart.

   IT IS A BUTTON, NOT A LINK, AND THAT IS THE CHANGE. It was an <a href> for
   good reasons — long-press, middle-click and screen readers all understand a
   link — but every one of those reasons is about NAVIGATION, and this no longer
   navigates: it opens a dialog over the page you are on. A link that goes
   nowhere is a worse lie than a button that looks like a masthead.

   When the home page is finished and has a URL of its own, this goes back to
   being an <a href> pointing at it, and the welcome screen goes back to being
   only a welcome. */

export default function AppName({className}:{className?:string}){
 const mode=useAppMode();
 return <button type="button" className={className?"app-name "+className:"app-name"}
  onClick={()=>window.dispatchEvent(new CustomEvent(WELCOME_REQUEST_EVENT))}>{APP_NAME}{mode==="lite"&&<i className="app-name-lite">LITE</i>}</button>;
}
