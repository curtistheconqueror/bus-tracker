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

export const APP_NAME="FLEETSTEP";

export default function AppName({className}:{className?:string}){
 return <b className={className?"app-name "+className:"app-name"}>{APP_NAME}</b>;
}
