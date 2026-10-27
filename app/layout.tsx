import type { Metadata, Viewport } from "next";
import "./globals.css";
import CrashGuard from "./_components/crash-guard";
import HeaderThemeLive from "@/src/components/shared/header-theme-live";
export const metadata: Metadata = {
 title:"FLEETSTEP — Fleet Maintenance",
 description:"Interactive facility-wide fleet location and maintenance tracking board.",
 manifest:"/manifest.webmanifest",
 /* apple MUST be a PNG. iOS does not accept SVG for an apple-touch-icon, and
    when it cannot use the one it is given it falls back to a screenshot of the
    page — so this pointed at favicon.svg for as long as the app had a home
    screen, and the icon somebody saw was never the icon this repository held.
    tests/app-shell.test.mjs holds the extension. */
 icons:{icon:"/favicon.svg",apple:"/apple-touch-icon.png"},
 appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"FLEETSTEP"}
};
/* The app default, matching `DEFAULT_HEADER_COLOR`. It is only what the OS
   paints before any JavaScript runs — HeaderThemeLive rewrites the meta
   from the colour actually resolved for the page — but left on the old
   #06275c that first strip of status bar was a different navy from the
   header touching it. */
export const viewport: Viewport = {themeColor:"#041d47"};
/* Every page is inside the boundary, because every page can throw and none of
   them can be reloaded from a home screen without it. HeaderThemeLive is
   INSIDE it for the same reason and not beside it: it runs on every page, so
   a throw there is a white screen on all eight rather than on one, and it is
   the one component here with nothing of its own to lose by being caught. */
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CrashGuard><HeaderThemeLive/>{children}</CrashGuard></body></html>}
