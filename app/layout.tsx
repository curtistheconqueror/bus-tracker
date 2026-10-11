import type { Metadata, Viewport } from "next";
import "./globals.css";
import CrashGuard from "./_components/crash-guard";
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
export const viewport: Viewport = {themeColor:"#06275c"};
/* Every page is inside the boundary, because every page can throw and none of
   them can be reloaded from a home screen without it. */
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CrashGuard>{children}</CrashGuard></body></html>}
